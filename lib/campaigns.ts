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
    "Grupo de recursos multi-superficie (spec oficial 17091269). 3..15 titulares (30c, al menos uno de 15c o menos) + titular largo (90c) + 2..5 descripciones (90c) + nombre de empresa (25c) + CTA + imagen landscape (1.91:1) + square (1:1) + logo square (1:1). Opcional: portrait (4:5), logo landscape (4:1), vídeo (10s o más; Google lo autogenera si falta). Las queries actúan como señales de audiencia (opcionales).",
  demand_gen:
    "Anuncio de imagen en feeds (Discover, Gmail, YouTube; spec oficial 17091672). 1..5 titulares (40c, al menos uno de 30c o menos) + 1..5 descripciones (90c) + nombre de empresa (25c) + imagen landscape (1.91:1) + square (1:1) + logo (1:1). Opcional: portrait (4:5), vertical (9:16), CTA (automatizada por defecto). Subformatos carousel y video aún no modelados.",
  video:
    "Video action campaign en YouTube (spec oficial 17091270). 1 vídeo de YouTube (10s o más) + 1 titular (30c) + 1 descripción (90c) + CTA (máx 10c) + URL final. El perfil sintético evalúa la miniatura y el copy (los modelos no procesan vídeo).",
  app:
    "App vinculada de Play / App Store como baseline. 2+ titulares (30c) + 1+ descripción (90c). Hasta 20 imágenes y 20 vídeos en formatos 1.91:1, 1:1, 4:5, 9:16. HTML5 opcional.",
  shopping:
    "Feed de Merchant Center, no anuncio individual. ID producto + título + descripción + link + imagen + disponibilidad + precio + GTIN/marca/MPN según categoría. Imágenes adicionales y promociones opcionales.",
};

export function isStrategyImplemented(s: Strategy): boolean {
  return (
    s === "search" ||
    s === "display" ||
    s === "pmax" ||
    s === "demand_gen" ||
    s === "video"
  );
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
    // Cap global 40c (Demand Gen); el límite de 30c de Search, Display y
    // PMax se valida por estrategia en el superRefine.
    headlines: z
      .array(
        z
          .string()
          .min(1, "Titular vacío.")
          .max(40, "Cada titular admite máximo 40 caracteres."),
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
    intended_message: z
      .string()
      .max(200, "El mensaje pretendido admite máximo 200 caracteres.")
      .optional()
      .nullable(),
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
    // Titulares de 30c en todas las estrategias salvo Demand Gen (40c,
    // spec oficial 17091672).
    if (data.strategy !== "demand_gen" && data.headlines.some((h) => h.length > 30)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headlines"],
        message: "Los titulares admiten máximo 30 caracteres en esta estrategia.",
      });
    }
    if (data.strategy === "search") {
      if (data.queries.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["queries"],
          message: "Search exige al menos 1 query.",
        });
      }
      // Spec oficial RSA (support.google.com/google-ads/answer/17092074 +
      // 7684791): para crear el anuncio Google exige mínimo 3 titulares
      // y 2 descripciones.
      if (data.headlines.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Search (RSA) exige mínimo 3 titulares.",
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
    // Performance Max: spec oficial 17091269. Combinación mínima del grupo
    // de recursos: 3 titulares (uno de 15c o menos), titular largo, 2
    // descripciones, nombre de empresa, CTA, landscape + square + logo.
    if (data.strategy === "pmax") {
      if (data.headlines.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Performance Max exige mínimo 3 titulares.",
        });
      }
      if (!data.headlines.some((h) => h.trim().length > 0 && h.trim().length <= 15)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Performance Max exige al menos 1 titular de 15 caracteres o menos.",
        });
      }
      if (!data.long_headline || !data.long_headline.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["long_headline"],
          message: "Performance Max exige titular largo (max 90c).",
        });
      }
      if (data.descriptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Performance Max exige mínimo 2 descripciones.",
        });
      }
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Performance Max exige nombre de empresa (max 25c).",
        });
      }
      if (!data.cta || !data.cta.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message: "Performance Max exige una CTA.",
        });
      }
      const creatives = data.creatives ?? [];
      const has = (role: CreativeRole) => creatives.some((c) => c.role === role);
      if (!has("landscape_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Performance Max exige al menos 1 imagen landscape (1.91:1).",
        });
      }
      if (!has("square_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Performance Max exige al menos 1 imagen square (1:1).",
        });
      }
      if (!has("logo_square")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Performance Max exige al menos 1 logo square (1:1).",
        });
      }
    }
    // Demand Gen (imagen única): spec oficial 17091672. 1..5 titulares de
    // 40c (al menos uno de 30c o menos para no caer en «Incompleto»),
    // 1..5 descripciones, nombre de empresa, landscape + square + logo.
    // CTA opcional (automatizada por defecto).
    if (data.strategy === "demand_gen") {
      if (data.headlines.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Demand Gen admite máximo 5 titulares.",
        });
      }
      if (!data.headlines.some((h) => h.trim().length > 0 && h.trim().length <= 30)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Demand Gen exige al menos 1 titular de 30 caracteres o menos.",
        });
      }
      if (data.descriptions.length > 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Demand Gen admite máximo 5 descripciones.",
        });
      }
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Demand Gen exige nombre de empresa (max 25c).",
        });
      }
      const creatives = data.creatives ?? [];
      const has = (role: CreativeRole) => creatives.some((c) => c.role === role);
      if (!has("landscape_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Demand Gen exige al menos 1 imagen landscape (1.91:1).",
        });
      }
      if (!has("square_image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Demand Gen exige al menos 1 imagen square (1:1).",
        });
      }
      if (!has("logo_square")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Demand Gen exige al menos 1 logo (1:1).",
        });
      }
    }
    // Video action campaign: spec oficial 17091270. Exactamente 1 titular
    // (30c), 1 descripción (90c), CTA de hasta 10 caracteres y 1 vídeo de
    // YouTube (10s o más; la duración no es verificable desde aquí).
    if (data.strategy === "video") {
      if (data.headlines.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Video exige exactamente 1 titular (max 30c).",
        });
      }
      if (data.descriptions.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Video exige exactamente 1 descripción (max 90c).",
        });
      }
      if (!data.cta || !data.cta.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message: "Video exige una CTA (max 10 caracteres).",
        });
      } else if (data.cta.trim().length > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message: "La CTA de Video admite máximo 10 caracteres.",
        });
      }
      const creatives = data.creatives ?? [];
      if (!creatives.some((c) => c.kind === "youtube" || c.kind === "video")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Video exige 1 vídeo (YouTube o subido) de 10 segundos o más.",
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
  /** Mensaje que el anunciante quiere que se entienda; activa el juez neutral de comprensión. */
  intended_message: string | null;
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
 * Schema de la fila cruda de `campaigns`: la frontera tipada con la BD.
 * Los `.catch()` cubren filas legacy o jsonb corrupto sin tumbar el listado;
 * `creatives` se valida elemento a elemento (un elemento corrupto se descarta,
 * los válidos sobreviven) para que el runner nunca reciba creatividades sin
 * `kind`/`role` validados.
 */
const CampaignRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  name: z.string().catch(""),
  channels: z.array(z.enum(CHANNEL_VALUES)).min(1).catch(["google"]),
  strategy: z.enum(STRATEGY_VALUES).catch("search"),
  brief: z.string().nullable().catch(null),
  intended_message: z.string().nullable().catch(null),
  final_url: z.string().catch(""),
  landing_image_url: z.string().catch(""),
  landing_source_url: z.string().nullable().catch(null),
  queries: z.array(z.string()).catch([]),
  headlines: z.array(z.string()).catch([]),
  descriptions: z.array(z.string()).catch([]),
  creatives: z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr.flatMap((c) => {
        const parsed = CreativeSchema.safeParse(c);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  company_name: z.string().nullable().catch(null),
  long_headline: z.string().nullable().catch(null),
  cta: z.string().nullable().catch(null),
  deleted_at: z.string().nullable().catch(null),
});

/**
 * Normaliza una fila cruda de `campaigns` validando con zod en lugar de
 * castear. Mantiene la transición `channel` (single, v0.23) → `channels[]`
 * (array, v0.24) para BDs con la migración 0011 pendiente; la poda de ese
 * fallback queda para después de la consolidación de esquema.
 */
function normalizeCampaign(row: Record<string, unknown>): Campaign {
  const withChannels = {
    ...row,
    channels:
      Array.isArray(row.channels) && (row.channels as unknown[]).length > 0
        ? row.channels
        : typeof row.channel === "string"
          ? [row.channel]
          : undefined,
  };
  return CampaignRowSchema.parse(withChannels);
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
    .insert({
      ...base,
      intended_message: parsed.intended_message ?? null,
      channels: parsed.channels,
    })
    .select("*")
    .single();
  // Si la 0019 aún no está aplicada (intended_message no existe), caemos a
  // un insert sin la columna (el juez de comprensión queda inactivo).
  if (isMissingColumnError(error, "intended_message")) {
    console.warn(
      "[createCampaign] columna 'intended_message' no existe; fallback sin ella. Aplica la migración 0019_consolidacion.sql.",
    );
    ({ data, error } = await supa
      .from("campaigns")
      .insert({ ...base, channels: parsed.channels })
      .select("*")
      .single());
  }
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
