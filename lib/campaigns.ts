import { z } from "zod";
import { getRunsStatsByEntity } from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";

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
// Estrategias dentro de un canal. Google Ads modela sus 7 tipos de
// campaña; Meta Ads modela el FORMATO del anuncio (lo que determina
// los campos y lo que ve el perfil), porque en Meta el tipo de campaña
// es el objetivo ODAX y se guarda aparte en channel_spec.objective.
// ============================================================

export const STRATEGY_VALUES = [
  "search",
  "display",
  "pmax",
  "demand_gen",
  "video",
  "app",
  "shopping",
  "meta_single",
  "meta_carousel",
  "meta_collection",
  "tiktok_video",
  "tiktok_carousel",
  "tiktok_spark",
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
  meta_single: "Imagen / Vídeo",
  meta_carousel: "Secuencia (carousel)",
  meta_collection: "Colección",
  tiktok_video: "Vídeo in-feed",
  tiktok_carousel: "Carousel (imágenes)",
  tiktok_spark: "Spark Ad",
};

/** Estrategias visibles por canal: las tabs del form se filtran con esto. */
export const CHANNEL_STRATEGIES: Record<Channel, Strategy[]> = {
  google: ["search", "display", "pmax", "demand_gen", "video", "app", "shopping"],
  meta: ["meta_single", "meta_carousel", "meta_collection"],
  linkedin: [],
  tiktok: ["tiktok_video", "tiktok_carousel", "tiktok_spark"],
  x: [],
};

export const DEFAULT_STRATEGY_BY_CHANNEL: Partial<Record<Channel, Strategy>> = {
  google: "search",
  meta: "meta_single",
  tiktok: "tiktok_video",
};

export function isMetaStrategy(s: Strategy): boolean {
  return s === "meta_single" || s === "meta_carousel" || s === "meta_collection";
}

export function isTikTokStrategy(s: Strategy): boolean {
  return s === "tiktok_video" || s === "tiktok_carousel" || s === "tiktok_spark";
}

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
  meta_single:
    "Anuncio de imagen o vídeo único (Ads Guide oficial 2026). 1..5 textos principales (máx. técnico 1.024c, se trunca con «Ver más» hacia los 125c) + 1..5 titulares (máx. 255c, visibles ~27-40c) + 0..5 descripciones de enlace (solo se muestran en algunos placements) + nombre de página + CTA de la lista de Meta + 1 creatividad. Ratio según placement: 1:1 / 4:5 en feed, 9:16 en Stories y Reels.",
  meta_carousel:
    "Secuencia de 2 a 10 tarjetas, cada una con su imagen (mín. 1080x1080), titular (45c recomendados) y descripción opcional (18c recomendados). El texto principal es compartido (80c recomendados en feed). Disponible en feeds, Stories y Threads (en Threads solo tarjetas de imagen).",
  meta_collection:
    "Colección: portada (imagen o vídeo) + cuadrícula de productos (mínimo 4 tiles). Al tocar se abre una instant experience a pantalla completa. Solo ubicaciones móviles: feeds de Facebook e Instagram y Stories de Instagram. Texto principal (125c) + titular (40c).",
  tiktok_video:
    "Vídeo in-feed de subasta (spec oficial de Auction In-Feed Ads). Vídeo 9:16 (mín. 540x960, recomendado; admite 1:1 y 16:9), 5-60s (mejor rendimiento 21-34s), máx. 500 MB. Texto del anuncio 1-100 caracteres SIN emojis, «#» ni «@» + nombre visible (máx. 20c en pantalla) + botón CTA de la lista cerrada. El perfil sintético evalúa la miniatura del vídeo y el copy (los modelos no procesan vídeo).",
  tiktok_carousel:
    "Carousel de imágenes en el feed (spec oficial de Carousel Ads). De 2 a 35 imágenes (mejor CTR con 3 o 7-9), vertical 720x1280 recomendado, JPG/PNG. Música OBLIGATORIA (suena en bucle). Un solo texto de anuncio, un nombre visible y un botón CTA para todas las tarjetas. El perfil sintético ve las 4 primeras imágenes.",
  tiktok_spark:
    "Spark Ad: post orgánico real promocionado (propio o de un creador con código de autorización). Conserva el caption del post (admite emojis y hashtags; máx. 150c en push de R&F, editable solo allí), la identidad real de la cuenta y suma likes, comentarios y seguidores al post. La interacción completa (perfil, música) está activa.",
};

export function isStrategyImplemented(s: Strategy): boolean {
  return s !== "app";
}

// ============================================================
// Meta Ads: objetivos ODAX, placements de simulación, CTAs y límites.
// Números verificados contra el Ads Guide oficial y la Marketing API
// (asset_feed_spec: body 1.024c, title/description 255c, 5 variantes).
// ============================================================

export const META_OBJECTIVE_VALUES = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "app_promotion",
  "sales",
] as const;
export type MetaObjective = (typeof META_OBJECTIVE_VALUES)[number];

export const META_OBJECTIVE_LABEL: Record<MetaObjective, string> = {
  awareness: "Reconocimiento",
  traffic: "Tráfico",
  engagement: "Interacción",
  leads: "Clientes potenciales",
  app_promotion: "Promoción de la app",
  sales: "Ventas",
};

export const META_OBJECTIVE_DESCRIPTION: Record<MetaObjective, string> = {
  awareness:
    "Maximiza alcance y recuerdo del anuncio. Para lanzamientos de marca y top-of-funnel, sin conversión medible.",
  traffic:
    "Maximiza clics o visitas a la página de destino. Atrae clicadores, no compradores: si el KPI es vender, usa Ventas.",
  engagement:
    "Maximiza mensajes, reproducciones de vídeo o interacción con la publicación. Para calentar audiencias.",
  leads:
    "Recopila datos de contacto vía formulario instantáneo, web o mensajes. Típico de B2B y alta consideración.",
  app_promotion:
    "Instalaciones y eventos de la app (Advantage+ activado por defecto desde 2025).",
  sales:
    "Encuentra personas con probabilidad de comprar (píxel + Conversions API). El flujo Advantage+ sales es el estándar desde 2025.",
};

export const META_PLACEMENT_VALUES = [
  "facebook_feed",
  "instagram_feed",
  "instagram_stories",
  "instagram_reels",
  "threads_feed",
  "whatsapp_status",
] as const;
export type MetaPlacement = (typeof META_PLACEMENT_VALUES)[number];

export const META_PLACEMENT_LABEL: Record<MetaPlacement, string> = {
  facebook_feed: "Feed de Facebook",
  instagram_feed: "Feed de Instagram",
  instagram_stories: "Stories de Instagram",
  instagram_reels: "Reels de Instagram",
  threads_feed: "Feed de Threads",
  whatsapp_status: "Estados de WhatsApp",
};

/**
 * Qué formatos admite cada placement (matriz oficial junio 2026): Reels y
 * WhatsApp Status solo anuncio único; Threads no admite colección y sus
 * carousels son solo de imágenes; la colección vive en feeds y Stories de IG.
 */
export const META_PLACEMENT_STRATEGIES: Record<MetaPlacement, Strategy[]> = {
  facebook_feed: ["meta_single", "meta_carousel", "meta_collection"],
  instagram_feed: ["meta_single", "meta_carousel", "meta_collection"],
  instagram_stories: ["meta_single", "meta_carousel", "meta_collection"],
  instagram_reels: ["meta_single", "meta_collection"],
  threads_feed: ["meta_single", "meta_carousel"],
  whatsapp_status: ["meta_single"],
};

/** Placements 9:16 a pantalla completa (sin headline visible en IG Stories/Reels). */
export function isVerticalPlacement(p: MetaPlacement): boolean {
  return p === "instagram_stories" || p === "instagram_reels" || p === "whatsapp_status";
}

/**
 * Botones CTA de Meta tal como aparecen en Ads Manager en español
 * (lista cerrada: Meta no admite texto libre en el botón).
 */
export const META_CTA_VALUES = [
  "Más información",
  "Comprar",
  "Registrarte",
  "Suscribirte",
  "Descargar",
  "Reservar",
  "Ver más",
  "Enviar solicitud",
  "Realizar pedido",
  "Solicitar cita",
  "Escuchar",
  "Enviar mensaje",
  "Enviar mensaje de WhatsApp",
  "Llamar ahora",
  "Cómo llegar",
  "Contactarnos",
  "Jugar",
  "Ver menú",
  "Donar ahora",
  "Obtener oferta",
  "Solicitar presupuesto",
  "Instalar ahora",
  "Probar en cámara",
] as const;
export type MetaCta = (typeof META_CTA_VALUES)[number];

/**
 * Límites de copy de Meta: `max` es el máximo técnico oficial de la API
 * (asset_feed_spec) y `recommended` el visible antes de truncar según el
 * Ads Guide. El form valida contra max y avisa al superar recommended.
 */
export const META_LIMITS = {
  primary_text: { max: 1024, recommended: 125, recommended_carousel: 80 },
  headline: { max: 255, recommended: 40 },
  description: { max: 255, recommended: 30 },
  card_headline: { max: 255, recommended: 45 },
  card_description: { max: 255, recommended: 18 },
  page_name: { max: 75 },
  variants: 5,
  carousel_cards: { min: 2, max: 10 },
  collection_products_min: 4,
} as const;

export const MetaSpecSchema = z.object({
  objective: z.enum(META_OBJECTIVE_VALUES).default("traffic"),
  placement: z.enum(META_PLACEMENT_VALUES).default("instagram_feed"),
  primary_texts: z
    .array(
      z
        .string()
        .min(1, "Texto principal vacío.")
        .max(
          META_LIMITS.primary_text.max,
          "El texto principal admite máximo 1.024 caracteres (límite técnico de Meta).",
        ),
    )
    .min(1, "Meta exige al menos 1 texto principal.")
    .max(META_LIMITS.variants, "Máximo 5 textos principales por anuncio."),
  display_link: z
    .string()
    .max(255, "El enlace visible admite máximo 255 caracteres.")
    .optional()
    .nullable(),
});
export type MetaSpec = z.infer<typeof MetaSpecSchema>;

// ============================================================
// TikTok Ads: objetivos, CTAs y límites. Números verificados contra
// el TikTok Business Help Center y la Marketing API (junio 2026):
// ad text 1-100c latinos sin emojis/«#»/«@» (CJK cuenta doble),
// display name máx. 40c técnico / 20 visibles, CTA de lista cerrada
// (25 opciones de landing page, traducción oficial es-ES), carousel
// 2-35 imágenes con música obligatoria, hasta 5 variantes de texto
// por anuncio (Smart+ ad_text_list).
// ============================================================

export const TIKTOK_OBJECTIVE_VALUES = [
  "reach",
  "traffic",
  "video_views",
  "community_interaction",
  "app_promotion",
  "lead_generation",
  "sales",
] as const;
export type TikTokObjective = (typeof TIKTOK_OBJECTIVE_VALUES)[number];

export const TIKTOK_OBJECTIVE_LABEL: Record<TikTokObjective, string> = {
  reach: "Alcance",
  traffic: "Tráfico",
  video_views: "Reproducciones de vídeo",
  community_interaction: "Interacción con la comunidad",
  app_promotion: "Promoción de la app",
  lead_generation: "Generación de clientes potenciales",
  sales: "Ventas",
};

export const TIKTOK_OBJECTIVE_DESCRIPTION: Record<TikTokObjective, string> = {
  reach:
    "Muestra el anuncio al máximo número de personas (puja CPM). Para notoriedad pura y lanzamientos, sin conversión medible.",
  traffic:
    "Lleva más personas a una URL o a la app (optimiza clics o vistas de landing). Atrae clicadores, no compradores.",
  video_views:
    "Maximiza reproducciones e interacción del vídeo entre la audiencia con más probabilidad de prestarle atención.",
  community_interaction:
    "Consigue seguidores, visitas al perfil o audiencia para un LIVE. El botón lleva al perfil, no a una web.",
  app_promotion:
    "Instalaciones y eventos de la app (App Install y App Retargeting). El botón lleva a la tienda de aplicaciones.",
  lead_generation:
    "Recopila datos de contacto con formularios instantáneos en TikTok o formularios de la web.",
  sales:
    "Vende desde TikTok Shop, la web o la app (fusión de Website Conversions y Product Sales, 2025). Con destino TikTok Shop el tipo de campaña es GMV Max.",
};

/**
 * Botones CTA de TikTok Ads tal como los localiza el Ads Manager en
 * español (lista cerrada de 25 opciones de landing page; «Book now» y
 * «Pre-order now» comparten traducción). No existe texto libre.
 */
export const TIKTOK_CTA_VALUES = [
  "Más información",
  "Comprar ahora",
  "Registrarse",
  "Suscribirse",
  "Descargar",
  "Instalar ahora",
  "Reservar ahora",
  "Solicitar ahora",
  "Contáctanos",
  "Hacer pedido",
  "Obtener presupuesto",
  "Me interesa",
  "Probar ahora",
  "Leer más",
  "Ver ahora",
  "Mirar ahora",
  "Escuchar ahora",
  "Visitar la tienda",
  "Comprar entradas ahora",
  "Obtener horarios de espectáculos",
  "Jugar",
  "Unirse al hashtag",
  "Grabar con este efecto",
  "Ver vídeo con este efecto",
] as const;
export type TikTokCta = (typeof TIKTOK_CTA_VALUES)[number];

/**
 * Límites de TikTok: `max` es el técnico de la Marketing API y
 * `recommended` lo visible en pantalla antes de truncar. El caption
 * corta a ~2 líneas con «más» en la práctica (4 líneas máximo técnico).
 * En Spark Ads el caption hereda del post orgánico (150c en push R&F).
 */
export const TIKTOK_LIMITS = {
  ad_text: { max: 100, visible_lines: 2 },
  spark_caption: { max: 150 },
  display_name: { max: 40, recommended: 20 },
  identity_handle: { max: 30 },
  music_name: { max: 80 },
  variants: 5,
  carousel_images: { min: 2, max: 35 },
} as const;

// Cubre también los emojis con presentación por defecto fuera de los
// bloques principales (estrella U+2B50, reloj U+23F0, exclamación doble
// U+203C, TM U+2122, flechas U+2190..) que llegan sin el selector FE0F.
const NO_EMOJI_REGEX =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2190}-\u{21FF}\u{203C}\u{2049}\u{2122}\u{2139}\u{FE0F}]/u;

export const TikTokSpecSchema = z.object({
  /** Discriminador del union de channel_spec (las filas de Meta no lo llevan). */
  network: z.literal("tiktok"),
  objective: z.enum(TIKTOK_OBJECTIVE_VALUES).default("traffic"),
  ad_texts: z
    .array(
      z
        .string()
        .min(1, "Texto del anuncio vacío.")
        .max(
          TIKTOK_LIMITS.spark_caption.max,
          "El caption admite máximo 150 caracteres (Spark push).",
        ),
    )
    .min(1, "TikTok exige el texto del anuncio.")
    .max(TIKTOK_LIMITS.variants, "Máximo 5 variantes de texto por anuncio."),
  /** @usuario mostrado junto al caption. Si falta, se deriva del nombre visible. */
  identity_handle: z
    .string()
    .max(TIKTOK_LIMITS.identity_handle.max, "El usuario admite máximo 30 caracteres.")
    .optional()
    .nullable(),
  /** Nombre de la pista en la fila de música. Obligatoria en carousel. */
  music_name: z
    .string()
    .max(TIKTOK_LIMITS.music_name.max, "El nombre de la música admite máximo 80 caracteres.")
    .optional()
    .nullable(),
});
export type TikTokSpec = z.infer<typeof TikTokSpecSchema>;

/** Campos específicos del canal: Meta (sin discriminador, legacy) o TikTok. */
export type ChannelSpec = MetaSpec | TikTokSpec;

export function isTikTokSpec(spec: ChannelSpec): spec is TikTokSpec {
  return "network" in spec && spec.network === "tiktok";
}

/** Spec de Meta de la campaña, o null si no aplica (Google, TikTok). */
export function metaSpecOf(c: Campaign): MetaSpec | null {
  if (!c.channel_spec || isTikTokSpec(c.channel_spec)) return null;
  return c.channel_spec;
}

/** Spec de TikTok de la campaña, o null si no aplica. */
export function tiktokSpecOf(c: Campaign): TikTokSpec | null {
  if (!c.channel_spec || !isTikTokSpec(c.channel_spec)) return null;
  return c.channel_spec;
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
  "card", //            tarjeta de carousel / tile de colección (Meta)
  "cover", //           portada de colección (Meta)
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
  card: "Tarjeta (1:1)",
  cover: "Portada de colección",
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
  // Solo tarjetas de Meta (role card): titular y descripción por tarjeta.
  // Caps duros = máximo técnico de la API (255c); los recomendados de
  // visualización (45c/18c) se avisan en el form sin bloquear.
  card_headline: z
    .string()
    .max(255, "El titular de la tarjeta admite máximo 255 caracteres.")
    .optional()
    .nullable(),
  card_description: z
    .string()
    .max(255, "La descripción de la tarjeta admite máximo 255 caracteres.")
    .optional()
    .nullable(),
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
    // Cap global 255c (máximo técnico de Meta Ads); los límites de Google
    // (30c Search/Display/PMax, 40c Demand Gen) se validan por estrategia
    // en el superRefine. Mínimo 0 porque Shopping no lleva titulares ni
    // descripciones (los exige por estrategia el superRefine).
    headlines: z
      .array(
        z
          .string()
          .min(1, "Titular vacío.")
          .max(255, "Cada titular admite máximo 255 caracteres."),
      )
      .max(15, "Máximo 15 titulares.")
      .default([]),
    descriptions: z
      .array(
        z
          .string()
          .min(1, "Descripción vacía.")
          .max(255, "Cada descripción admite máximo 255 caracteres."),
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
    // Cap global 75c (nombre de página de Facebook); el límite de 25c de
    // Google se valida por estrategia en el superRefine.
    company_name: z
      .string()
      .max(75, "Nombre de empresa máximo 75 caracteres.")
      .optional()
      .nullable(),
    long_headline: z
      .string()
      .max(90, "Titular largo máximo 90 caracteres.")
      .optional()
      .nullable(),
    cta: z.string().optional().nullable(),
    product: ProductSchema.optional().nullable(),
    /** Campos específicos del canal (Meta o TikTok). Null en Google. */
    channel_spec: z
      .union([TikTokSpecSchema, MetaSpecSchema])
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    const isMeta = isMetaStrategy(data.strategy);
    const isTikTok = isTikTokStrategy(data.strategy);
    // Titulares de 30c en las estrategias de Google salvo Demand Gen (40c,
    // spec oficial 17091672). En Meta el cap duro es el técnico (255c).
    // TikTok no lleva titulares (su copy vive en channel_spec.ad_texts).
    if (
      !isMeta &&
      !isTikTok &&
      data.strategy !== "demand_gen" &&
      data.headlines.some((h) => h.length > 30)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headlines"],
        message: "Los titulares admiten máximo 30 caracteres en esta estrategia.",
      });
    }
    if (data.strategy === "demand_gen" && data.headlines.some((h) => h.length > 40)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headlines"],
        message: "Demand Gen admite titulares de máximo 40 caracteres.",
      });
    }
    // Descripciones de 90c en Google (RSA/Display/PMax/Demand Gen/Video).
    if (!isMeta && !isTikTok && data.descriptions.some((d) => d.length > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["descriptions"],
        message: "Las descripciones admiten máximo 90 caracteres en esta estrategia.",
      });
    }
    // Nombre de empresa de 25c en Google (el cap global de 75c es el del
    // nombre de página de Facebook; TikTok admite 40c técnicos).
    if (!isMeta && !isTikTok && data.company_name && data.company_name.length > 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company_name"],
        message: "El nombre de empresa admite máximo 25 caracteres en Google Ads.",
      });
    }
    // Mínimos comunes de copy de Google: aplican a todo salvo Shopping (la
    // ficha se genera desde el producto), Meta y TikTok (sus mínimos viven
    // en sus bloques). Search/PMax/Video tienen mínimos mayores en los suyos.
    if (!isMeta && !isTikTok && data.strategy !== "shopping") {
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
    // ============ Meta Ads (formatos single / carousel / collection) ============
    if (isMeta) {
      const spec =
        data.channel_spec && !isTikTokSpec(data.channel_spec)
          ? data.channel_spec
          : null;
      if (!spec) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channel_spec"],
          message:
            "Las estrategias de Meta exigen objetivo, placement y al menos 1 texto principal.",
        });
      } else if (!META_PLACEMENT_STRATEGIES[spec.placement].includes(data.strategy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channel_spec"],
          message: `${META_PLACEMENT_LABEL[spec.placement]} no admite el formato ${STRATEGY_LABEL[data.strategy]} (matriz oficial de placements).`,
        });
      }
      if (spec && spec.objective === "app_promotion" && spec.placement === "whatsapp_status") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channel_spec"],
          message: "Estados de WhatsApp no está disponible para el objetivo Promoción de la app.",
        });
      }
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Meta exige el nombre de la página de Facebook (identidad del anuncio).",
        });
      }
      if (data.company_name && data.company_name.length > META_LIMITS.page_name.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "El nombre de página admite máximo 75 caracteres.",
        });
      }
      if (!data.cta || !META_CTA_VALUES.includes(data.cta as MetaCta)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message:
            "Meta exige un botón CTA de su lista cerrada (en Meta el botón está siempre presente; por defecto «Más información»).",
        });
      }
      if (data.headlines.length > META_LIMITS.variants) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["headlines"],
          message: "Meta admite máximo 5 titulares por anuncio (asset_feed_spec).",
        });
      }
      const creatives = data.creatives ?? [];
      const cards = creatives.filter((c) => c.role === "card");
      const covers = creatives.filter((c) => c.role === "cover");
      if (data.strategy === "meta_single") {
        if (data.headlines.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["headlines"],
            message: "El anuncio único lleva al menos 1 titular (máx. 255c, visibles ~40).",
          });
        }
        const visible = creatives.filter(
          (c) =>
            c.kind === "image" ||
            ((c.kind === "video" || c.kind === "youtube") && c.thumbnail_url),
        );
        if (visible.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message:
              "El anuncio único exige 1 creatividad: imagen, o vídeo con miniatura (el perfil sintético evalúa la miniatura).",
          });
        }
      }
      if (data.strategy === "meta_carousel") {
        if (
          cards.length < META_LIMITS.carousel_cards.min ||
          cards.length > META_LIMITS.carousel_cards.max
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message: "La secuencia lleva de 2 a 10 tarjetas (creatividades con rol «Tarjeta»).",
          });
        }
        if (cards.some((c) => !c.card_headline || !c.card_headline.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message: "Cada tarjeta de la secuencia exige su titular (45c recomendados).",
          });
        }
        if (
          spec?.placement === "threads_feed" &&
          cards.some((c) => c.kind !== "image")
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message: "En Threads el carousel solo admite tarjetas de imagen (spec oficial).",
          });
        }
      }
      if (data.strategy === "meta_collection") {
        if (data.headlines.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["headlines"],
            message: "La colección lleva 1 titular (máx. 40c visibles junto al CTA).",
          });
        }
        if (covers.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message: "La colección exige exactamente 1 portada (imagen o vídeo con miniatura).",
          });
        }
        if (cards.length < META_LIMITS.collection_products_min) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message:
              "La colección exige al menos 4 tiles de producto (creatividades con rol «Tarjeta», nombre del producto en el titular).",
          });
        }
      }
    }
    // ============ TikTok Ads (vídeo in-feed / carousel / spark) ============
    if (isTikTok) {
      const spec =
        data.channel_spec && isTikTokSpec(data.channel_spec)
          ? data.channel_spec
          : null;
      if (!spec) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channel_spec"],
          message:
            "Las estrategias de TikTok exigen objetivo y al menos 1 texto del anuncio.",
        });
      } else {
        // Non-Spark: 1-100c, sin emojis, «#» ni «{ }» (spec oficial de
        // Auction In-Feed). Spark hereda el caption del post (150c, emojis ok).
        if (data.strategy !== "tiktok_spark") {
          if (spec.ad_texts.some((t) => t.length > TIKTOK_LIMITS.ad_text.max)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["channel_spec"],
              message:
                "El texto del anuncio admite máximo 100 caracteres en TikTok (límite técnico de la API).",
            });
          }
          if (spec.ad_texts.some((t) => NO_EMOJI_REGEX.test(t))) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["channel_spec"],
              message:
                "TikTok no admite emojis en el texto del anuncio (solo los Spark Ads los conservan).",
            });
          }
          if (spec.ad_texts.some((t) => /[#@{}]/.test(t))) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["channel_spec"],
              message:
                "El texto del anuncio de TikTok no admite «#», «@» ni «{ }» (spec oficial).",
            });
          }
        }
        // Spark usa la identidad REAL de la cuenta del post: el @ es
        // parte esencial del formato (el form lo declara obligatorio).
        if (data.strategy === "tiktok_spark" && !spec.identity_handle?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channel_spec"],
            message:
              "El Spark Ad exige el @usuario de la cuenta del post (es su identidad real).",
          });
        }
        if (data.strategy === "tiktok_carousel" && !spec.music_name?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channel_spec"],
            message:
              "El carousel de TikTok exige música (suena en bucle): indica el nombre de la pista.",
          });
        }
      }
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message:
            "TikTok exige el nombre visible de la identidad (en pantalla se muestran 20 caracteres).",
        });
      }
      if (
        data.company_name &&
        data.company_name.length > TIKTOK_LIMITS.display_name.max
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message:
            "El nombre visible admite máximo 40 caracteres (límite técnico; en pantalla se ven 20).",
        });
      }
      if (!data.cta || !TIKTOK_CTA_VALUES.includes(data.cta as TikTokCta)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cta"],
          message:
            "TikTok exige un botón CTA de su lista cerrada (no admite texto libre; por defecto «Más información»).",
        });
      }
      const creatives = data.creatives ?? [];
      if (data.strategy === "tiktok_video" || data.strategy === "tiktok_spark") {
        // El avatar (role logo_square) no cuenta como vídeo del anuncio.
        const videos = creatives.filter(
          (c) =>
            (c.kind === "video" || c.kind === "youtube") &&
            c.thumbnail_url &&
            c.role !== "logo_square",
        );
        if (videos.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message:
              "TikTok exige 1 vídeo con miniatura (9:16 recomendado; el perfil sintético evalúa la miniatura, los modelos no procesan vídeo).",
          });
        }
      }
      if (data.strategy === "tiktok_carousel") {
        const cards = creatives.filter((c) => c.role === "card" && c.kind === "image");
        if (
          cards.length < TIKTOK_LIMITS.carousel_images.min ||
          cards.length > TIKTOK_LIMITS.carousel_images.max
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["creatives"],
            message:
              "El carousel de TikTok lleva de 2 a 35 imágenes (creatividades de imagen con rol «Tarjeta»).",
          });
        }
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
  /** Campos específicos del canal (Meta o TikTok). Null en Google. */
  channel_spec: ChannelSpec | null;
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
  // El jsonb se discrimina por `network`: los specs de TikTok lo declaran,
  // los de Meta (incluidas filas legacy) no lo llevan.
  channel_spec: z
    .unknown()
    .transform((v): ChannelSpec | null => {
      if (
        v &&
        typeof v === "object" &&
        (v as Record<string, unknown>).network === "tiktok"
      ) {
        const tiktok = TikTokSpecSchema.safeParse(v);
        return tiktok.success ? tiktok.data : null;
      }
      const meta = MetaSpecSchema.safeParse(v);
      return meta.success ? meta.data : null;
    })
    .catch(null),
  deleted_at: z.string().nullable().catch(null),
});

/**
 * Normaliza una fila cruda de `campaigns` validando con zod en lugar de
 * castear. El mapeo legacy `channel` → `channels[]` se podó al aplicar la
 * 0019 (que dropea la columna `channel`); el `.catch(["google"])` del
 * schema sigue cubriendo cualquier fila degenerada.
 */
function normalizeCampaign(row: Record<string, unknown>): Campaign {
  return CampaignRowSchema.parse(row);
}

export async function listCampaigns(): Promise<
  Array<Campaign & { run_count: number; user_count: number }>
> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("campaigns")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
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
  const { data, error } = await supa
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
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
  // Insert directo: los fallbacks legacy (pre-0011 channels, pre-0013
  // strategy, 0019 intended_message, 0020 product) se podaron cuando esas
  // migraciones constaron aplicadas en suaas_migrations (v0.46.0).
  // channel_spec (0021) solo se incluye cuando hay spec de Meta: así las
  // campañas de Google siguen creándose aunque la 0021 no esté aplicada.
  const { data, error } = await supa
    .from("campaigns")
    .insert({
      ...base,
      intended_message: parsed.intended_message ?? null,
      product: parsed.product ?? null,
      channels: parsed.channels,
      ...(parsed.channel_spec ? { channel_spec: parsed.channel_spec } : {}),
    })
    .select("*")
    .single();
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
