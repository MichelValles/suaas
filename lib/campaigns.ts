import { z } from "zod";
import { getRunsStatsByEntity } from "@/lib/runs";
import { getServerClient, isMissingColumnError } from "@/lib/supabase";

// ============================================================
// Schemas con los caps RSA reales de Google Ads.
// ============================================================

export const CHANNEL_VALUES = ["google", "meta", "linkedin", "tiktok", "x"] as const;
export type Channel = (typeof CHANNEL_VALUES)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  google: "Google Ads",
  meta: "Meta (Facebook · Instagram)",
  linkedin: "LinkedIn Ads",
  tiktok: "TikTok Ads",
  x: "X (Twitter) Ads",
};

// ============================================================
// Estrategias dentro de un canal. Hoy sólo modelamos Google Ads.
// Search (RSA) está implementado. Las demás se exponen como "En
// construcción" hasta que tengan sus campos específicos (Display,
// PMax, Demand Gen, Video / YouTube, App Campaigns, Shopping).
// ============================================================

export const STRATEGY_VALUES = [
  "search",
  "display",
  "pmax",
  "demand_gen",
  "video",
  "app",
  "shopping",
] as const;
export type Strategy = (typeof STRATEGY_VALUES)[number];

export const STRATEGY_LABEL: Record<Strategy, string> = {
  search: "Search",
  display: "Display",
  pmax: "Performance Max",
  demand_gen: "Demand Gen",
  video: "Video / YouTube",
  app: "App Campaigns",
  shopping: "Shopping",
};

export const STRATEGY_DESCRIPTION: Record<Strategy, string> = {
  search:
    "Anuncio RSA en el SERP. URL final + 3..15 titulares (30c) + 2..4 descripciones (90c). Opcional: rutas visibles, sitelinks, callouts, snippets, imágenes y logo.",
  display:
    "Anuncio responsive de Display. URL final + nombre de empresa + titulares cortos/largos + descripciones + imágenes landscape (1.91:1), square (1:1) y logo. Opcional: portrait (4:5), logo landscape, vídeo (YouTube).",
  pmax:
    "Asset group multi-canal. Logo + ≥3 imágenes (al menos una landscape y una square) + 3+ titulares + 1+ titular largo + 2 descripciones + CTA. Vídeo opcional pero Google lo autogenera si no lo subes. Señales de audiencia.",
  demand_gen:
    "Subformatos single image, carousel o video. Imagen landscape + square + logo + titulares (40c) + descripciones + nombre de empresa + CTA. Para carousel: ≥2 tarjetas (imagen + headline + URL).",
  video:
    "YouTube. Vídeo subido + URL final. Skippable / non-skippable / bumper / in-feed con titulares y descripciones según subformato. Companion banner opcional.",
  app:
    "App vinculada de Play / App Store como baseline. 2+ titulares (30c) + 1+ descripción (90c). Hasta 20 imágenes y 20 vídeos en formatos 1.91:1, 1:1, 4:5, 9:16. HTML5 opcional.",
  shopping:
    "Feed de Merchant Center, no anuncio individual. ID producto + título + descripción + link + imagen + disponibilidad + precio + GTIN/marca/MPN según categoría. Imágenes adicionales y promociones opcionales.",
};

export function isStrategyImplemented(s: Strategy): boolean {
  return s === "search";
}

export const CreativeKindSchema = z.enum(["image", "video", "youtube"]);
export type CreativeKind = z.infer<typeof CreativeKindSchema>;

export const CreativeSchema = z.object({
  kind: CreativeKindSchema.default("image"),
  url: z
    .string()
    .refine(
      (v) =>
        /^https?:\/\//i.test(v) ||
        /^data:image\//i.test(v) ||
        /^data:video\//i.test(v),
      "Debe ser una URL http(s) o un data:image|video URL.",
    ),
  // Para YouTube: id del vídeo (extraído de la URL). Permite mostrar embed y
  // miniatura sin recargar otra vez.
  youtube_id: z.string().optional().nullable(),
  // Para los kinds que el modelo NO puede ver (video uploaded), guardamos una
  // miniatura en `thumbnail_url` para mostrar al perfil sintético. Si no
  // existe, el runner ignora la creatividad.
  thumbnail_url: z
    .string()
    .url()
    .optional()
    .nullable(),
  label: z.string().optional().nullable(),
});
export type Creative = z.infer<typeof CreativeSchema>;

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;

export function extractYouTubeId(url: string): string | null {
  const m = url.match(YOUTUBE_REGEX);
  return m?.[1] ?? null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export const CampaignInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  channels: z
    .array(z.enum(CHANNEL_VALUES))
    .min(1, "Selecciona al menos 1 canal.")
    .max(5, "Máximo 5 canales por campaña.")
    .default(["google"])
    .transform((arr) => Array.from(new Set(arr))),
  strategy: z.enum(STRATEGY_VALUES).default("search"),
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
    .min(1, "Al menos 1 titular.")
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
  channels: Channel[];
  strategy: Strategy;
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

/**
 * Normaliza una fila cruda de `campaigns`. Defensivo contra la transición
 * `channel` (single, v0.23) → `channels[]` (array, v0.24): si el cliente
 * ejecuta el código nuevo contra una BD con la migración 0011 aún pendiente,
 * mapea el `channel` antiguo o cae a `["google"]` por defecto. Evita un
 * `TypeError: cannot read 'length' of undefined` en el listado/detalle hasta
 * que el operador aplique la migración.
 */
function normalizeCampaign(row: Record<string, unknown>): Campaign {
  const channels =
    Array.isArray(row.channels) && (row.channels as unknown[]).length > 0
      ? (row.channels as Channel[])
      : typeof row.channel === "string"
        ? [row.channel as Channel]
        : (["google"] as Channel[]);
  const strategy =
    typeof row.strategy === "string" &&
    (STRATEGY_VALUES as readonly string[]).includes(row.strategy)
      ? (row.strategy as Strategy)
      : ("search" as Strategy);
  return { ...(row as unknown as Campaign), channels, strategy };
}

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
  const rows = (data ?? []).map((r) => normalizeCampaign(r as Record<string, unknown>));
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
  if (!data) return null;
  return normalizeCampaign(data as Record<string, unknown>);
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const parsed = CampaignInputSchema.parse(input);
  const supa = getServerClient();
  const base = {
    name: parsed.name,
    brief: parsed.brief ?? null,
    final_url: parsed.final_url,
    landing_image_url: parsed.landing_image_url,
    landing_source_url: parsed.landing_source_url ?? null,
    queries: parsed.queries,
    headlines: parsed.headlines,
    descriptions: parsed.descriptions,
    creatives: parsed.creatives ?? [],
    strategy: parsed.strategy,
  };
  let { data, error } = await supa
    .from("campaigns")
    .insert({ ...base, channels: parsed.channels })
    .select("*")
    .single();
  // Si la migración 0013 aún no está aplicada (strategy no existe), caemos a
  // un insert sin la columna. La 0011 (channels) tiene su propio fallback.
  if (isMissingColumnError(error, "strategy")) {
    console.warn(
      "[createCampaign] columna 'strategy' no existe; fallback sin ella. Aplica la migración 0013_campaigns_strategy.sql.",
    );
    const { strategy: _ignored, ...baseNoStrategy } = base;
    ({ data, error } = await supa
      .from("campaigns")
      .insert({ ...baseNoStrategy, channels: parsed.channels })
      .select("*")
      .single());
  }
  if (isMissingColumnError(error, "channels")) {
    console.warn(
      "[createCampaign] columna 'channels' no existe; fallback a 'channel'. Aplica la migración 0011_campaigns_multichannel.sql.",
    );
    ({ data, error } = await supa
      .from("campaigns")
      .insert({ ...base, channel: parsed.channels[0] })
      .select("*")
      .single());
  }
  if (error) throw new Error(error.message);
  return normalizeCampaign(data as Record<string, unknown>);
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
