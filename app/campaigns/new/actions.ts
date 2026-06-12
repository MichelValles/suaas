"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDataUrlToBlob } from "@/lib/blob";
import {
  CHANNEL_VALUES,
  CREATIVE_ROLE_VALUES,
  CampaignInputSchema,
  MetaSpecSchema,
  STRATEGY_VALUES,
  TikTokSpecSchema,
  createCampaign,
  extractYouTubeId,
  isMetaStrategy,
  isTikTokSpec,
  isTikTokStrategy,
  youtubeThumbnail,
  type CampaignInput,
  type CreativeRole,
} from "@/lib/campaigns";
import { resolveOgImageDetailed } from "@/lib/targets";

const CreativePayloadSchema = z.object({
  kind: z.enum(["image", "video", "youtube"]).default("image"),
  role: z.enum(CREATIVE_ROLE_VALUES).default("generic"),
  url: z.string().optional().default(""),
  upload_data: z.string().optional().default(""),
  youtube_id: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  label: z.string().optional().default(""),
  // Tarjetas de Meta (role card): titular y descripción por tarjeta.
  card_headline: z.string().optional().nullable(),
  card_description: z.string().optional().nullable(),
});

const PayloadSchema = z.object({
  name: z.string().min(1),
  channels: z
    .array(z.enum(CHANNEL_VALUES))
    .min(1)
    .max(5)
    .default(["google"]),
  strategy: z.enum(STRATEGY_VALUES).default("search"),
  brief: z.string().optional().nullable(),
  intended_message: z.string().optional().nullable(),
  product: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      price: z.string(),
      availability: z.string(),
      brand: z.string().optional().nullable(),
      gtin: z.string().optional().nullable(),
      mpn: z.string().optional().nullable(),
      condition: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  company_name: z.string().optional().nullable(),
  long_headline: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  final_url: z.string().url(),
  landing_mode: z.enum(["og", "upload"]),
  landing_upload_data: z.string().optional().default(""),
  landing_resolved_url: z.string().optional().nullable(),
  queries: z.array(z.string()),
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  creatives: z.array(CreativePayloadSchema).optional().default([]),
  channel_spec: z
    .union([TikTokSpecSchema, MetaSpecSchema])
    .optional()
    .nullable(),
});

export type CreateCampaignState = { ok: boolean; error?: string };

/** Los mensajes de zod ya están redactados en castellano: se muestran tal cual. */
function readableError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join(" · ");
  }
  return (err as Error).message;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "untitled";
}

export async function createCampaignAction(
  _prev: CreateCampaignState,
  formData: FormData,
): Promise<CreateCampaignState> {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload_json") ?? ""));
  } catch {
    return { ok: false, error: "Estructura del formulario corrupta." };
  }

  let payload: z.infer<typeof PayloadSchema>;
  try {
    payload = PayloadSchema.parse(raw);
  } catch (err) {
    return { ok: false, error: readableError(err) };
  }

  // channel_spec normalizado según el canal: Meta limpia los textos
  // principales y TikTok las variantes de texto. Para Google viaja null.
  const channelSpec =
    isMetaStrategy(payload.strategy) &&
    payload.channel_spec &&
    !isTikTokSpec(payload.channel_spec)
      ? {
          ...payload.channel_spec,
          primary_texts: payload.channel_spec.primary_texts
            .map((t) => t.trim())
            .filter(Boolean),
          display_link: payload.channel_spec.display_link?.trim() || null,
        }
      : isTikTokStrategy(payload.strategy) &&
          payload.channel_spec &&
          isTikTokSpec(payload.channel_spec)
        ? {
            ...payload.channel_spec,
            ad_texts: payload.channel_spec.ad_texts
              .map((t) => t.trim())
              .filter(Boolean),
            identity_handle:
              payload.channel_spec.identity_handle?.trim().replace(/^@/, "") || null,
            music_name: payload.channel_spec.music_name?.trim() || null,
          }
        : null;

  // Pre-validación con URLs provisionales ANTES de subir nada a Blob: si los
  // requisitos de la estrategia no se cumplen (p.ej. creatividades de Display),
  // el error sale aquí y no quedan blobs huérfanos de un submit fallido.
  {
    const placeholder = "https://placeholder.invalid/pending-upload";
    type ProvisionalCreative = {
      kind: "image" | "video" | "youtube";
      role: CreativeRole;
      url: string;
      youtube_id?: string | null;
      thumbnail_url?: string | null;
      label?: string | null;
      card_headline?: string | null;
      card_description?: string | null;
    };
    const provisionalCreatives = payload.creatives.flatMap((c): ProvisionalCreative[] => {
      if (c.kind === "youtube") {
        const id = c.youtube_id || (c.url ? extractYouTubeId(c.url) : null);
        if (!c.url || !id) return [];
        return [
          {
            kind: "youtube" as const,
            role: c.role ?? ("video_youtube" as CreativeRole),
            url: c.url.trim(),
            youtube_id: id,
            thumbnail_url: c.thumbnail_url || youtubeThumbnail(id),
            label: c.label?.trim() || null,
            card_headline: c.card_headline?.trim() || null,
            card_description: c.card_description?.trim() || null,
          },
        ];
      }
      const willUpload = c.upload_data?.startsWith("data:");
      const finalUrl = willUpload ? placeholder : c.url?.trim() || "";
      if (!finalUrl) return [];
      return [
        {
          kind: c.kind,
          role: c.role ?? ("generic" as CreativeRole),
          url: finalUrl,
          thumbnail_url: c.kind === "video" ? c.thumbnail_url?.trim() || null : null,
          label: c.label?.trim() || null,
          card_headline: c.card_headline?.trim() || null,
          card_description: c.card_description?.trim() || null,
        },
      ];
    });
    const provisional = CampaignInputSchema.safeParse({
      name: payload.name.trim(),
      channels: payload.channels,
      strategy: payload.strategy,
      brief: payload.brief?.trim() || null,
      intended_message: payload.intended_message?.trim() || null,
      product: payload.product ?? null,
      final_url: payload.final_url,
      landing_image_url:
        payload.landing_mode === "upload"
          ? placeholder
          : payload.landing_resolved_url || placeholder,
      landing_source_url: null,
      queries: payload.queries.map((q) => q.trim()).filter(Boolean),
      headlines: payload.headlines.map((h) => h.trim()).filter(Boolean),
      descriptions: payload.descriptions.map((d) => d.trim()).filter(Boolean),
      creatives: provisionalCreatives,
      company_name: payload.company_name?.trim() || null,
      long_headline: payload.long_headline?.trim() || null,
      cta: payload.cta?.trim() || null,
      channel_spec: channelSpec,
    });
    if (!provisional.success) {
      return { ok: false, error: readableError(provisional.error) };
    }
  }

  // Resolver imagen de la landing.
  let landingImageUrl: string;
  let landingSourceUrl: string | undefined;
  if (payload.landing_mode === "upload") {
    if (!payload.landing_upload_data?.startsWith("data:")) {
      return { ok: false, error: "Sube una imagen de landing válida." };
    }
    try {
      landingImageUrl = await uploadDataUrlToBlob({
        dataUrl: payload.landing_upload_data,
        pathHint: `campaigns/${slugify(payload.name)}/landing`,
      });
    } catch (err) {
      return { ok: false, error: `Error subiendo landing: ${(err as Error).message}` };
    }
  } else if (payload.landing_resolved_url) {
    // El front ya resolvió la imagen (botón Resolver og:image). Reutilizamos.
    landingImageUrl = payload.landing_resolved_url;
    landingSourceUrl = payload.final_url;
  } else {
    // Fallback: resolver aquí. Cubre el caso de submit directo sin pulsar
    // el botón de resolver (devolverá error claro si la URL no expone og:image).
    const og = await resolveOgImageDetailed(payload.final_url);
    if (!og.ok) {
      const intro =
        og.reason === "fetch"
          ? "No pudimos descargar la URL final"
          : og.reason === "status"
            ? "La URL final respondió con error"
            : "La URL final no expone una imagen Open Graph";
      return {
        ok: false,
        error: `${intro}: ${og.detail} Usa «Resolver og:image» o «Subir screenshot».`,
      };
    }
    landingImageUrl = og.url;
    landingSourceUrl = payload.final_url;
  }

  // Procesar creatividades por kind.
  const creatives: {
    kind: "image" | "video" | "youtube";
    role: CreativeRole;
    url: string;
    youtube_id?: string | null;
    thumbnail_url?: string | null;
    label?: string | null;
    card_headline?: string | null;
    card_description?: string | null;
  }[] = [];
  for (let i = 0; i < payload.creatives.length; i += 1) {
    const c = payload.creatives[i];
    const label = c.label?.trim() || null;
    const cardHeadline = c.card_headline?.trim() || null;
    const cardDescription = c.card_description?.trim() || null;
    if (c.kind === "youtube") {
      const id = c.youtube_id || (c.url ? extractYouTubeId(c.url) : null);
      if (!c.url || !id) continue;
      creatives.push({
        kind: "youtube",
        role: c.role ?? "video_youtube",
        url: c.url.trim(),
        youtube_id: id,
        thumbnail_url: c.thumbnail_url || youtubeThumbnail(id),
        label,
        card_headline: cardHeadline,
        card_description: cardDescription,
      });
      continue;
    }
    if (c.kind === "video") {
      let finalUrl = c.url?.trim() || "";
      if (c.upload_data?.startsWith("data:")) {
        try {
          finalUrl = await uploadDataUrlToBlob({
            dataUrl: c.upload_data,
            pathHint: `campaigns/${slugify(payload.name)}/creative-${i + 1}`,
          });
        } catch (err) {
          return {
            ok: false,
            error: `Error subiendo vídeo ${i + 1}: ${(err as Error).message}`,
          };
        }
      }
      if (!finalUrl) continue;
      creatives.push({
        kind: "video",
        role: c.role ?? "generic",
        url: finalUrl,
        thumbnail_url: c.thumbnail_url?.trim() || null,
        label,
        card_headline: cardHeadline,
        card_description: cardDescription,
      });
      continue;
    }
    // image
    let finalUrl = c.url?.trim() || "";
    if (c.upload_data?.startsWith("data:")) {
      try {
        finalUrl = await uploadDataUrlToBlob({
          dataUrl: c.upload_data,
          pathHint: `campaigns/${slugify(payload.name)}/creative-${i + 1}`,
        });
      } catch (err) {
        return {
          ok: false,
          error: `Error subiendo creatividad ${i + 1}: ${(err as Error).message}`,
        };
      }
    }
    if (!finalUrl) continue;
    creatives.push({
      kind: "image",
      role: c.role ?? "generic",
      url: finalUrl,
      label,
      card_headline: cardHeadline,
      card_description: cardDescription,
    });
  }

  const input: CampaignInput = {
    name: payload.name.trim(),
    channels: payload.channels,
    strategy: payload.strategy,
    brief: payload.brief?.trim() || null,
    intended_message: payload.intended_message?.trim() || null,
    // El shape fino (availability enum, límites) lo valida CampaignInputSchema.
    product: (payload.product ?? null) as CampaignInput["product"],
    final_url: payload.final_url,
    landing_image_url: landingImageUrl,
    landing_source_url: landingSourceUrl ?? null,
    queries: payload.queries.map((q) => q.trim()).filter(Boolean),
    headlines: payload.headlines.map((h) => h.trim()).filter(Boolean),
    descriptions: payload.descriptions.map((d) => d.trim()).filter(Boolean),
    creatives,
    company_name: payload.company_name?.trim() || null,
    long_headline: payload.long_headline?.trim() || null,
    cta: payload.cta?.trim() || null,
    channel_spec: channelSpec,
  };

  let id: string;
  try {
    const parsed = CampaignInputSchema.parse(input);
    const created = await createCampaign(parsed);
    id = created.id;
  } catch (err) {
    return { ok: false, error: readableError(err) };
  }

  revalidatePath("/campaigns");
  redirect(`/campaigns/${id}`);
}
