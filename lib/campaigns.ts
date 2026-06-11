import { z } from "zod";
import { getRunsStatsByEntity } from "@/lib/runs";
import {
  getServerClient,
  isMissingColumnError,
  MigrationPendingError,
} from "@/lib/supabase";

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
    "Anuncio RSA en el SERP (spec oficial 17092074). URL final + 1..15 titulares (30c) + 1..4 descripciones (90c) + nombre de empresa (25c) + logo (1:1). Opcional: CTA automatizada e imágenes. El bloque de formatos asset-based (titulares de 25c) no está modelado.",
  display:
    "Anuncio responsive de Display. URL final + nombre de empresa + titulares cortos/largos + descripciones + imágenes landscape (1.91:1), square (1:1) y logo. Opcional: portrait (4:5), logo landscape, vídeo (YouTube).",
  pmax:
    "Grupo de recursos multi-superficie (spec oficial 17091269). 3..15 titulares (30c, al menos uno de 15c o menos) + titular largo (90c) + 2..5 descripciones (90c) + nombre de empresa (25c) + CTA + imagen landscape (1.91:1) + square (1:1) + logo square (1:1). Opcional: portrait (4:5), logo landscape (4:1), vídeo (10s o más; Google lo autogenera si falta). Las queries actúan como señales de audiencia (opcionales).",
  demand_gen:
    "Anuncio de imagen en feeds (Discover, Gmail, YouTube; spec oficial 17091672). 1..5 titulares (40c, al menos uno de 30c o menos) + 1..5 descripciones (90c) + nombre de empresa (25c) + CTA + imagen landscape (1.91:1) + square (1:1) + logo (1:1, mín 144x144). Opcional: imagen vertical (4:5) y vídeos (10-60s recomendados, hasta 3 por orientación). Subformatos carousel y video aún no modelados.",
  video:
    "Video action campaign en YouTube (spec oficial 17091270). 1 vídeo (duración recomendada 10s o más) + 1 titular (30c) + 1 descripción (90c) + URL final. Opcional: titular largo (90c) y CTA (máx 10c). El perfil sintético evalúa la miniatura y el copy (los modelos no procesan vídeo).",
  app:
    "App vinculada de Play / App Store como baseline. 2+ titulares (30c) + 1+ descripción (90c). Hasta 20 imágenes y 20 vídeos en formatos 1.91:1, 1:1, 4:5, 9:16. HTML5 opcional.",
  shopping:
    "Ficha de producto generada desde el feed (spec Merchant Center 7052112): sin titulares ni descripciones redactados. Producto con id (50c) + título (150c) + descripción (5.000c) + precio con divisa + disponibilidad; marca (70c), GTIN, MPN (si no hay GTIN) y condición según el caso. La URL final es el link del producto y la imagen principal (500x500 o más) va en creatividades. Las queries son las búsquedas de producto.",
};

export function isStrategyImplemented(s: Strategy): boolean {
  return s !== "app";
}

// ============================================================
// Producto de Shopping (espejo de los atributos obligatorios del feed
// de Merchant Center, spec 7052112). El id del feed se omite: no aporta
// a la simulación. El link es final_url y la imagen va en creatives.
// ============================================================

export const PRODUCT_AVAILABILITY_VALUES = [
  "in_stock",
  "out_of_stock",
  "preorder",
  "backorder",
] as const;

export const PRODUCT_AVAILABILITY_LABEL: Record<
  (typeof PRODUCT_AVAILABILITY_VALUES)[number],
  string
> = {
  in_stock: "En stock",
  out_of_stock: "Agotado",
  preorder: "Reserva previa",
  backorder: "Bajo pedido",
};

export const PRODUCT_CONDITION_VALUES = ["new", "refurbished", "used"] as const;

export const ProductSchema = z.object({
  id: z
    .string()
    .min(1, "El producto exige un id (usa el SKU).")
    .max(50, "El id del producto admite máximo 50 caracteres."),
  title: z
    .string()
    .min(1, "El producto exige título.")
    .max(150, "El título del producto admite máximo 150 caracteres."),
  description: z
    .string()
    .min(1, "El producto exige descripción.")
    .max(5000, "La descripción del producto admite máximo 5.000 caracteres."),
  price: z
    .string()
    .regex(
      /^\d+([.,]\d+)?\s?[A-Z]{3}$/,
      "Precio con divisa ISO 4217, p. ej. «15.00 EUR».",
    ),
  availability: z.enum(PRODUCT_AVAILABILITY_VALUES),
  brand: z
    .string()
    .max(70, "La marca admite máximo 70 caracteres.")
    .optional()
    .nullable(),
  gtin: z
    .string()
    .regex(/^\d{8,14}$/, "El GTIN tiene entre 8 y 14 dígitos.")
    .optional()
    .nullable(),
  /** Obligatorio en el feed real solo si el producto no tiene GTIN. */
  mpn: z
    .string()
    .max(70, "El MPN admite máximo 70 caracteres.")
    .optional()
    .nullable(),
  condition: z.enum(PRODUCT_CONDITION_VALUES).optional().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

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
    // PMax se valida por estrategia en el superRefine. Mínimo 0 porque
    // Shopping no lleva titulares ni descripciones (los exige por
    // estrategia el superRefine).
    headlines: z
      .array(
        z
          .string()
          .min(1, "Titular vacío.")
          .max(40, "Cada titular admite máximo 40 caracteres."),
      )
      .max(15, "Máximo 15 titulares.")
      .default([]),
    descriptions: z
      .array(
        z
          .string()
          .min(1, "Descripción vacía.")
          .max(90, "Cada descripción admite máximo 90 caracteres."),
      )
      .max(5, "Máximo 5 descripciones.")
      .default([]),
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
    product: ProductSchema.optional().nullable(),
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
    // Mínimos comunes de copy: aplican a todo salvo Shopping (la ficha se
    // genera desde el producto). Search/PMax/Video tienen mínimos mayores
    // en sus bloques.
    if (data.strategy !== "shopping") {
      if (data.headlines.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Al menos 1 titular.",
        });
      }
      if (data.descriptions.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Al menos 1 descripción.",
        });
      }
    }
    // Search: spec oficial 17092074. Bloque «Responsive search ads»:
    // titulares 30c 1-15 y descripciones 90c 1-4, ambos obligatorios
    // (los mínimos de 1 los cubre el check común). Bloque «Business
    // information»: nombre de empresa (25c) y logo 1:1, obligatorios.
    // El bloque «Ad assets» (formatos asset-based, titulares de 25c)
    // no está modelado.
    if (data.strategy === "search") {
      if (data.queries.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["queries"],
          message: "Search exige al menos 1 query.",
        });
      }
      if (data.descriptions.length > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Search (RSA) admite máximo 4 descripciones.",
        });
      }
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Search exige nombre de empresa (max 25c, bloque Business information).",
        });
      }
      const creatives = data.creatives ?? [];
      if (!creatives.some((c) => c.role === "logo_square")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Search exige 1 logo (1:1, bloque Business information).",
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
      // La tabla oficial marca la CTA como obligatoria (1, «Automated»).
      if (!data.cta || !data.cta.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message: "Demand Gen exige una CTA.",
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
    // Video action campaign: spec oficial 17091270, tabla de text assets:
    // Headline 30c, Long headline 90c, Description 90c, CTA 10c, Final URL.
    // La página no declara cantidades ni obligatoriedad: el módulo modela
    // 1 anuncio (1 titular + 1 descripción + 1 vídeo); el titular largo y
    // la CTA son opcionales con sus límites.
    if (data.strategy === "video") {
      if (data.headlines.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Video lleva 1 titular por anuncio (max 30c).",
        });
      }
      if (data.descriptions.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["descriptions"],
          message: "Video lleva 1 descripción por anuncio (max 90c).",
        });
      }
      if (data.cta && data.cta.trim().length > 10) {
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
          message: "Video exige 1 vídeo (YouTube o subido); duración recomendada 10 segundos o más.",
        });
      }
    }
    // Shopping: la ficha se genera desde el producto del feed (spec
    // Merchant Center 7052112). Exige producto completo, al menos 1 query
    // (la búsqueda que dispara la ficha) y 1 imagen principal de producto.
    if (data.strategy === "shopping") {
      if (!data.product) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["product"],
          message: "Shopping exige los datos del producto (título, descripción, precio, disponibilidad).",
        });
      }
      if (data.queries.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["queries"],
          message: "Shopping exige al menos 1 búsqueda de producto.",
        });
      }
      const creatives = data.creatives ?? [];
      if (!creatives.some((c) => c.kind === "image")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creatives"],
          message: "Shopping exige la imagen principal del producto (500x500 o más).",
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
  /** Producto del feed (solo shopping). Null en el resto de estrategias. */
  product: Product | null;
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
  product: z
    .unknown()
    .transform((v) => {
      const parsed = ProductSchema.safeParse(v);
      return parsed.success ? parsed.data : null;
    })
    .catch(null),
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
      product: parsed.product ?? null,
      channels: parsed.channels,
    })
    .select("*")
    .single();
  // Si la 0020 aún no está aplicada (product no existe): una campaña
  // shopping NO puede crearse sin su producto; el resto sigue sin la columna.
  if (isMissingColumnError(error, "product")) {
    if (parsed.strategy === "shopping") {
      throw new MigrationPendingError("0020_shopping.sql");
    }
    ({ data, error } = await supa
      .from("campaigns")
      .insert({
        ...base,
        intended_message: parsed.intended_message ?? null,
        channels: parsed.channels,
      })
      .select("*")
      .single());
  }
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
