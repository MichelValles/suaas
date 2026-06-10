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
  return s === "search" || s === "display";
}

export const CreativeKindSchema = z.enum(["image", "video", "youtube"]);
export type CreativeKind = z.infer<typeof CreativeKindSchema>;

export const CREATIVE_ROLE_VALUES = [
  "generic",
  "landscape_image", // 1.91:1 · obligatorio en Display
  "square_image", //    1:1   · obligatorio en Display
  "portrait_image", //  4:5   · opcional
  "logo_square", //     1:1   · obligatorio en Display
  "logo_landscape", //  4:1   · opcional
  "video_youtube", //   YouTube · opcional
] as const;
export type CreativeRole = (typeof CREATIVE_ROLE_VALUES)[number];

export const CREATIVE_ROLE_LABEL: Record<CreativeRole, string> = {
  generic: "Creatividad",
  landscape_image: "Imagen landscape (1.91:1)",
  square_image: "Imagen square (1:1)",
  portrait_image: "Imagen portrait (4:5)",
  logo_square: "Logo square (1:1)",
  logo_landscape: "Logo landscape (4:1)",
  video_youtube: "Vídeo YouTube",
};

export const CreativeSchema = z.object({
  kind: CreativeKindSchema.default("image"),
  role: z.enum(CREATIVE_ROLE_VALUES).default("generic"),
  url: z
    .string()
    .refine(
      (v) =>
        /^https?:\/\//i.test(v) ||
        /^data:image\//i.test(v) ||
        /^data:video\//i.test(v),
      "Debe ser una URL http(s) o un data:image|video URL.",
    ),
  // Para YouTube: id del vídeo (extraído de la URL).
  youtube_id: z.string().optional().nullable(),
  // Para los kinds que el modelo NO puede ver (video uploaded), guardamos una
  // miniatura en `thumbnail_url`. Si no existe, el runner ignora la creatividad.
  thumbnail_url: z
    .string()
    .url()
    .optional()
    .nullable(),
  label: z.string().optional().nullable(),
});
export type Creative = z.infer<typeof CreativeSchema>;

// CTAs predefinidos de Google Ads (Display / Demand Gen / etc.).
export const CTA_VALUES = [
  "Más información",
  "Comprar",
  "Reservar ahora",
  "Suscribirse",
  "Descargar",
  "Instalar",
  "Aprender más",
  "Solicitar presupuesto",
  "Inscribirse",
  "Ver más",
  "Contactar",
  "Aplicar ahora",
] as const;
export type Cta = (typeof CTA_VALUES)[number];

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;

export function extractYouTubeId(url: string): string | null {
  const m = url.match(YOUTUBE_REGEX);
  return m?.[1] ?? null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export const CampaignInputSchema = z
  .object({
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
      .max(5, "Máximo 5 queries por campaign.")
      .default([]),
    headlines: z
      .array(
        z
          .string()
          .min(1, "Titular vacío.")
          .max(30, "Cada titular admite máximo 30 caracteres."),
      )
      .min(1, "Al menos 1 titular.")
      .max(15, "Máximo 15 titulares."),
    descriptions: z
      .array(
        z
          .string()
          .min(1, "Descripción vacía.")
          .max(90, "Cada descripción admite máximo 90 caracteres."),
      )
      .min(1, "Al menos 1 descripción.")
      .max(5, "Máximo 5 descripciones."),
    creatives: z
      .array(CreativeSchema)
      .max(20, "Máximo 20 creatividades.")
      .optional()
      .default([]),
    company_name: z
      .string()
      .max(25, "Nombre de empresa máximo 25 caracteres.")
      .optional()
      .nullable(),
    long_headline: z
      .string()
      .max(90, "Titular largo máximo 90 caracteres.")
      .optional()
      .nullable(),
    cta: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.strategy === "search") {
      if (data.queries.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["queries"],
          message: "Search exige al menos 1 query.",
        });
      }
      if (data.descriptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Search exige mínimo 2 descripciones.",
        });
      }
      if (data.descriptions.length > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Search admite máximo 4 descripciones.",
        });
      }
    }
    if (data.strategy === "display") {
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Display exige nombre de empresa (max 25c).",
        });
      }
      if (!data.long_headline || !data.long_headline.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["long_headline"],
          message: "Display exige titular largo (max 90c).",
        });
      }
      if (data.headlines.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Display admite máximo 5 titulares cortos.",
        });
      }
      const creatives = data.creatives ?? [];
      const has = (role: CreativeRole) =>
        creatives.some((c) => c.role === role);
      if (!has("landscape_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Display exige al menos 1 imagen landscape (1.91:1).",
        });
      }
      if (!has("square_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Display exige al menos 1 imagen square (1:1).",
        });
      }
      if (!has("logo_square")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Display exige al menos 1 logo square (1:1).",
        });
      }
    }
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
  company_name: string | null;
  long_headline: string | null;
  cta: string | null;
  deleted_at?: string | null;
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

/**
 * No filtra `deleted_at`: lo usan las vistas de resultados históricos
 * (runs de campaña) y deben seguir mostrando la campaña aunque esté en
 * la papelera.
 */
export async function getCampaignWithTrashed(id: string): Promise<Campaign | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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
    company_name: parsed.company_name ?? null,
    long_headline: parsed.long_headline ?? null,
    cta: parsed.cta ?? null,
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
