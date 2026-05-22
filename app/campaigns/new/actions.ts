"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDataUrlToBlob } from "@/lib/blob";
import {
  CHANNEL_VALUES,
  CampaignInputSchema,
  STRATEGY_VALUES,
  createCampaign,
  extractYouTubeId,
  youtubeThumbnail,
  type CampaignInput,
} from "@/lib/campaigns";
import { resolveOgImageDetailed } from "@/lib/targets";

const CreativePayloadSchema = z.object({
  kind: z.enum(["image", "video", "youtube"]).default("image"),
  url: z.string().optional().default(""),
  upload_data: z.string().optional().default(""),
  youtube_id: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  label: z.string().optional().default(""),
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
  final_url: z.string().url(),
  landing_mode: z.enum(["og", "upload"]),
  landing_upload_data: z.string().optional().default(""),
  landing_resolved_url: z.string().optional().nullable(),
  queries: z.array(z.string()),
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  creatives: z.array(CreativePayloadSchema).optional().default([]),
});

export type CreateCampaignState = { ok: boolean; error?: string };

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
    return { ok: false, error: (err as Error).message };
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
    url: string;
    youtube_id?: string | null;
    thumbnail_url?: string | null;
    label?: string | null;
  }[] = [];
  for (let i = 0; i < payload.creatives.length; i += 1) {
    const c = payload.creatives[i];
    const label = c.label?.trim() || null;
    if (c.kind === "youtube") {
      const id = c.youtube_id || (c.url ? extractYouTubeId(c.url) : null);
      if (!c.url || !id) continue;
      creatives.push({
        kind: "youtube",
        url: c.url.trim(),
        youtube_id: id,
        thumbnail_url: c.thumbnail_url || youtubeThumbnail(id),
        label,
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
        url: finalUrl,
        thumbnail_url: c.thumbnail_url?.trim() || null,
        label,
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
      url: finalUrl,
      label,
    });
  }

  const input: CampaignInput = {
    name: payload.name.trim(),
    channels: payload.channels,
    strategy: payload.strategy,
    brief: payload.brief?.trim() || null,
    final_url: payload.final_url,
    landing_image_url: landingImageUrl,
    landing_source_url: landingSourceUrl ?? null,
    queries: payload.queries.map((q) => q.trim()).filter(Boolean),
    headlines: payload.headlines.map((h) => h.trim()).filter(Boolean),
    descriptions: payload.descriptions.map((d) => d.trim()).filter(Boolean),
    creatives,
  };

  let id: string;
  try {
    const parsed = CampaignInputSchema.parse(input);
    const created = await createCampaign(parsed);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/campaigns");
  redirect(`/campaigns/${id}`);
}
