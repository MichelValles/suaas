"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadDataUrlToBlob } from "@/lib/blob";
import {
  CampaignInputSchema,
  createCampaign,
  type CampaignInput,
} from "@/lib/campaigns";
import { resolveOgImageDetailed } from "@/lib/targets";

const PayloadSchema = z.object({
  name: z.string().min(1),
  brief: z.string().optional().nullable(),
  final_url: z.string().url(),
  landing_mode: z.enum(["og", "upload"]),
  landing_upload_data: z.string().optional().default(""),
  queries: z.array(z.string()),
  headlines: z.array(z.string()),
  descriptions: z.array(z.string()),
  creatives: z
    .array(
      z.object({
        mode: z.enum(["url", "upload"]),
        url: z.string().optional().default(""),
        upload_data: z.string().optional().default(""),
        label: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
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
  } else {
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
        error: `${intro}: ${og.detail} Usa el modo «Upload» para subir un screenshot.`,
      };
    }
    landingImageUrl = og.url;
    landingSourceUrl = payload.final_url;
  }

  // Subir creatividades.
  const creatives: { url: string; label?: string | null }[] = [];
  for (let i = 0; i < payload.creatives.length; i += 1) {
    const c = payload.creatives[i];
    if (c.mode === "upload") {
      if (!c.upload_data?.startsWith("data:")) continue;
      try {
        const url = await uploadDataUrlToBlob({
          dataUrl: c.upload_data,
          pathHint: `campaigns/${slugify(payload.name)}/creative-${i + 1}`,
        });
        creatives.push({ url, label: c.label?.trim() || null });
      } catch (err) {
        return {
          ok: false,
          error: `Error subiendo creatividad ${i + 1}: ${(err as Error).message}`,
        };
      }
    } else {
      if (!c.url?.trim()) continue;
      creatives.push({ url: c.url.trim(), label: c.label?.trim() || null });
    }
  }

  const input: CampaignInput = {
    name: payload.name.trim(),
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
