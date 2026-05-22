import { z } from "zod";
import { getRunsStatsByEntity } from "@/lib/runs";
import { getServerClient, isMissingColumnError } from "@/lib/supabase";

// ============================================================
// Schemas con los caps RSA reales de Google Ads.
// ============================================================

export const CreativeSchema = z.object({
  url: z
    .string()
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
      "Debe ser una URL http(s) o un data:image URL.",
    ),
  label: z.string().optional().nullable(),
});
export type Creative = z.infer<typeof CreativeSchema>;

export const CampaignInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  brief: z.string().optional().nullable(),
  final_url: z.string().url("La URL final no es válida."),
  landing_image_url: z
    .string()
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
      "La imagen de landing debe ser URL http(s) o data:image.",
    ),
  landing_source_url: z.string().url().optional().nullable(),
  queries: z
    .array(z.string().min(2, "Cada query tiene mínimo 2 caracteres.").max(120))
    .min(1, "Define al menos 1 query.")
    .max(5, "Máximo 5 queries por campaign."),
  headlines: z
    .array(
      z
        .string()
        .min(1, "Titular vacío.")
        .max(30, "Cada titular admite máximo 30 caracteres (RSA)."),
    )
    .min(3, "Mínimo 3 titulares (RSA).")
    .max(15, "Máximo 15 titulares (RSA)."),
  descriptions: z
    .array(
      z
        .string()
        .min(1, "Descripción vacía.")
        .max(90, "Cada descripción admite máximo 90 caracteres (RSA)."),
    )
    .min(2, "Mínimo 2 descripciones (RSA).")
    .max(4, "Máximo 4 descripciones (RSA)."),
  creatives: z.array(CreativeSchema).max(6, "Máximo 6 creatividades.").optional().default([]),
});
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

export type Campaign = {
  id: string;
  created_at: string;
  name: string;
  brief: string | null;
  final_url: string;
  landing_image_url: string;
  landing_source_url: string | null;
  queries: string[];
  headlines: string[];
  descriptions: string[];
  creatives: Creative[];
};

// ============================================================
// CRUD
// ============================================================

export async function listCampaigns(): Promise<
  Array<Campaign & { run_count: number; user_count: number }>
> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("campaigns")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Campaign[];
  if (rows.length === 0) return [];
  const stats = await getRunsStatsByEntity(
    "campaign_id",
    rows.map((c) => c.id),
  );
  return rows.map((c) => ({
    ...c,
    run_count: stats.get(c.id)?.runs ?? 0,
    user_count: stats.get(c.id)?.users ?? 0,
  }));
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw new Error(error.message);
  return (data ?? null) as Campaign | null;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const parsed = CampaignInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("campaigns")
    .insert({
      name: parsed.name,
      brief: parsed.brief ?? null,
      final_url: parsed.final_url,
      landing_image_url: parsed.landing_image_url,
      landing_source_url: parsed.landing_source_url ?? null,
      queries: parsed.queries,
      headlines: parsed.headlines,
      descriptions: parsed.descriptions,
      creatives: parsed.creatives ?? [],
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function softDeleteCampaign(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("campaigns")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreCampaign(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("campaigns")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteCampaign(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
