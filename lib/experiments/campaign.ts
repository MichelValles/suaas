import { generateObject } from "ai";
import { z } from "zod";
import {
  type Campaign,
  type Channel,
  getCampaign,
  getCampaignWithTrashed,
} from "@/lib/campaigns";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";
import { resolveImageForApi } from "@/lib/image-source";
import { buildSystemPrompt } from "@/lib/prompts";
import { type Profile, getProfile, listProfilesByIds } from "@/lib/profiles";
import { createRun, markRunFinished, upsertMetric } from "@/lib/runs";
import { getServerClient, isMissingColumnError } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

/**
 * Experimento: Campaign Tester (Paid Search RSA).
 *
 * Cada perfil evalúa el anuncio bajo cada query objetivo:
 *  1) Snippet eval: ve el par headline+description como en una SERP y devuelve
 *     intent_to_click, perceived_offer, clarity, credibility, differentiation
 *     y barriers.
 *  2) Landing eval (sólo si intent_to_click >= LANDING_THRESHOLD): comprueba si
 *     la landing (og:image o screenshot) cumple lo que prometía el anuncio.
 *  3) Versión ideal: el perfil propone su headline/description/promise + texto
 *     libre opcional.
 *
 * Caps: 5 queries × 20 perfiles = 100 evals snippet + ~60 landing + 100 ideal.
 */

const LANDING_THRESHOLD = 0.5;

/**
 * Query placeholder para estrategias sin queries (Display): el runner genera
 * al menos 1 respuesta por perfil × canal bajo este contexto. La UI la
 * traduce a una etiqueta legible.
 */
export const GENERAL_CONTEXT_QUERY = "(contexto general)";

/**
 * Caché por run de imágenes ya resueltas para la API multimodal. Sin él,
 * la landing y las creatividades se descargan una vez por combinación
 * perfil × canal × query (hasta cientos de veces por run). Cachea la
 * Promise para que las combinaciones en paralelo compartan la descarga;
 * si falla, se desaloja para permitir un reintento en la siguiente.
 */
type ImageCache = Map<string, Promise<string>>;

function resolveImageCached(url: string, cache: ImageCache): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = resolveImageForApi(url).catch((err) => {
    cache.delete(url);
    throw err;
  });
  cache.set(url, p);
  return p;
}

// ============================================================
// Schemas de salida del LLM
// ============================================================

// El orden de las claves importa: zod lo preserva y generateObject genera
// en ese orden. Percepción y razonamiento van ANTES de los scores para que
// el número salga del texto y no al revés (evita el clustering en valores
// medios que produce pedir primero la cifra).
export const SnippetEvalSchema = z.object({
  perceived_offer: z.string().min(1).describe("Qué crees que te ofrece el anuncio. 1 frase."),
  reasoning: z
    .string()
    .min(1)
    .describe(
      "Tu razonamiento en 1-2 frases, en tu voz, ANTES de puntuar: qué te llama, qué te frena.",
    ),
  barriers: z
    .array(z.string())
    .describe("Lista corta de fricciones percibidas. Vacío si no hay."),
  behavior_class: z
    .enum(["optima", "fuga", "repesca"])
    .describe(
      "Clasifica TU propia conducta ante el anuncio: 'optima' = conecta con tu intención y harías click; 'fuga' = lo ignoras y sigues con lo tuyo; 'repesca' = no haces click ahora pero la necesidad sigue viva, otro mensaje podría recuperarte.",
    ),
  intent_to_click: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 probabilidad subjetiva de hacer click bajo la query"),
  clarity: z.number().min(0).max(1).describe("0..1 según lo claro que entiendes la oferta"),
  credibility: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 cuánto te crees lo que promete"),
  differentiation: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 cuánto te diferencia este anuncio frente a otros que verías para la misma búsqueda"),
});
export type SnippetEval = z.infer<typeof SnippetEvalSchema>;

export const LandingMatchSchema = z.object({
  landing_match: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 cuánto la landing cumple la promesa que hacía el anuncio bajo tu búsqueda"),
  landing_critique: z.string().min(1).describe("1-2 frases tuyas explicando el match"),
});
export type LandingMatch = z.infer<typeof LandingMatchSchema>;

// Sin .max() duros en headline/description: un LLM que devuelve 31
// caracteres lanzaría NoObjectGeneratedError y mataría el run entero.
// El límite vive en el describe (instrucción) y se trunca al persistir.
export const AdJudgeSchema = z.object({
  comprehension: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 cuánto coincide lo percibido con el mensaje pretendido"),
  reasoning: z.string().min(1).describe("1-2 frases justificando el score"),
});
export type AdJudge = z.infer<typeof AdJudgeSchema>;

// Sin .max() duros (un exceso de caracteres del LLM no debe tirar la
// síntesis): los límites se instruyen y se truncan al persistir.
export const RecommendationsSchema = z.object({
  key_findings: z
    .array(z.string())
    .min(1)
    .describe("3-5 hallazgos clave del run, en frases completas y accionables"),
  recommended_headlines: z
    .array(z.string())
    .describe("Hasta 3 titulares listos para usar, máximo 30 caracteres cada uno"),
  recommended_descriptions: z
    .array(z.string())
    .describe("Hasta 2 descripciones listas para usar, máximo 90 caracteres cada una"),
  barrier_fixes: z
    .array(z.string())
    .describe("Cómo desactivar cada barrera top, 1 frase por barrera"),
});
export type CampaignRecommendations = z.infer<typeof RecommendationsSchema>;

export const IdealVersionSchema = z.object({
  ideal_headline: z.string().min(1).describe("Tu titular ideal en máximo 30 caracteres"),
  ideal_description: z
    .string()
    .min(1)
    .describe("Tu descripción ideal en máximo 90 caracteres"),
  ideal_promise: z
    .string()
    .min(1)
    .describe("La promesa central que esperarías leer, en tu voz, 1 frase"),
  ideal_free_text: z
    .string()
    .nullish()
    .describe("Comentario libre opcional, hasta 2 frases. Null si no añades nada"),
});
export type IdealVersion = z.infer<typeof IdealVersionSchema>;

// ============================================================
// Tipos públicos
// ============================================================

export type CampaignResponse = {
  profileId: string;
  channel: Channel;
  query: string;
  intent_to_click: number;
  perceived_offer: string;
  /** Razonamiento del perfil antes de puntuar. Vive en meta (jsonb); null en filas anteriores a v0.35.1. */
  reasoning: string | null;
  /** Juez neutral: cuánto coincide perceived_offer con campaign.intended_message. Null si no hay mensaje pretendido o la fila es anterior a v0.39.0. */
  comprehension_rate: number | null;
  /** Conducta predicha del Gravity Model. Null en filas anteriores a v0.39.1. */
  behavior_class: "optima" | "fuga" | "repesca" | null;
  /** Combinación RSA muestreada que vio el perfil. Null en filas anteriores a v0.40.0 o canales sin muestreo. */
  shown_headlines: string[] | null;
  shown_descriptions: string[] | null;
  clarity: number;
  credibility: number;
  differentiation: number;
  barriers: string[];
  landing_evaluated: boolean;
  landing_match: number | null;
  landing_critique: string | null;
  ideal_headline: string;
  ideal_description: string;
  ideal_promise: string;
  ideal_free_text: string | null;
};

export type BehaviorCounts = { optima: number; fuga: number; repesca: number };

export type AssetPerformance = {
  asset: string;
  kind: "headline" | "description";
  /** Respuestas en las que el asset estuvo presente en la combinación mostrada. */
  n: number;
  mean_intent: number;
  /** Diferencia frente al intent medio del run: positivo = el asset tira hacia arriba. */
  delta_vs_run: number;
};

export type CampaignByQuery = {
  query: string;
  n: number;
  mean_intent_to_click: number;
  mean_clarity: number;
  mean_credibility: number;
  mean_differentiation: number;
  mean_landing_match: number | null;
  click_rate: number;
  top_barriers: { label: string; count: number }[];
  behavior_counts: BehaviorCounts;
};

export type CampaignByChannel = {
  channel: Channel;
  n: number;
  mean_intent_to_click: number;
  mean_clarity: number;
  mean_credibility: number;
  mean_differentiation: number;
  mean_landing_match: number | null;
  click_rate: number;
  top_barriers: { label: string; count: number }[];
  behavior_counts: BehaviorCounts;
};

export type CampaignSummary = {
  n_profiles: number;
  n_responses: number;
  mean_intent_to_click: number;
  /** Desviación estándar del intent entre respuestas: dispersión de la muestra. */
  intent_stddev: number;
  mean_clarity: number;
  mean_credibility: number;
  mean_differentiation: number;
  /** Juez neutral: media de comprehension_rate. Null si la campaña no define intended_message. */
  mean_ad_comprehension: number | null;
  mean_landing_match: number | null;
  click_rate: number;
  byQuery: CampaignByQuery[];
  byChannel: CampaignByChannel[];
  top_barriers: { label: string; count: number }[];
  /** Conducta predicha del Gravity Model. Solo cuenta filas con clase (las anteriores a v0.39.1 no la traen). */
  behavior_counts: BehaviorCounts;
  /** Rendimiento por asset (solo runs con muestreo de combinaciones, v0.40+). Ordenado por intent medio desc. */
  byAsset: AssetPerformance[];
  /**
   * Check de consistencia interna: respuestas cuya clase contradice su
   * intent («fuga» con intent ≥ 0,5 o «optima» con intent < 0,3).
   */
  behavior_inconsistencies: number;
};

// ============================================================
// 1) Snippet eval (multimodal con creatividades si hay)
// ============================================================

/** Combinación RSA concreta mostrada a un perfil bajo una query. */
export type ShownCombination = {
  headlines: string[];
  descriptions: string[];
};

/** Hash FNV-1a de 32 bits: semilla estable a partir de un string. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: RNG determinista pequeño y suficiente para muestreo. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates parcial determinista: n elementos sin repetición. */
function pickN<T>(items: T[], n: number, rng: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/**
 * Muestrea la combinación RSA que ve un perfil bajo una query: 3 titulares
 * y 2 descripciones, como un anuncio responsive real (nadie ve los 15
 * titulares a la vez). Determinista por profileId + query: el mismo perfil
 * ve la misma combinación al repetir el run con la misma muestra, lo que
 * mantiene comparables las iteraciones. La exposición de assets queda
 * equilibrada en expectativa (selección uniforme sin repetición).
 */
export function sampleRsaCombination(
  campaign: Campaign,
  profileId: string,
  query: string,
  nHeadlines = 3,
  nDescriptions = 2,
): ShownCombination {
  const rng = mulberry32(hashSeed(`${profileId}|${query}`));
  return {
    headlines: pickN(
      campaign.headlines,
      Math.min(nHeadlines, campaign.headlines.length),
      rng,
    ),
    descriptions: pickN(
      campaign.descriptions,
      Math.min(nDescriptions, campaign.descriptions.length),
      rng,
    ),
  };
}

function renderSnippetText(
  campaign: Campaign,
  channel: Channel,
  shown: ShownCombination | null,
): string {
  // Display Ads tienen render propio (banner con titular largo + CTA) que no
  // depende del canal externo (siempre se ve dentro de Google Display Network).
  if (campaign.strategy === "display") {
    return renderDisplaySnippet(campaign);
  }
  // Performance Max combina los recursos automáticamente: el persona ve UNA
  // combinación (titular corto + titular largo + descripción) muestreada.
  if (campaign.strategy === "pmax") {
    return renderPmaxSnippet(campaign, shown);
  }
  // Demand Gen: anuncio de imagen en feeds de Google (Discover, Gmail,
  // YouTube), también con una combinación muestreada por impresión.
  if (campaign.strategy === "demand_gen") {
    return renderDemandGenSnippet(campaign, shown);
  }
  // Video action campaign: pre-roll saltable en YouTube. El persona ve la
  // miniatura del vídeo (multimodal) junto al copy y la CTA.
  if (campaign.strategy === "video") {
    return renderVideoSnippet(campaign);
  }
  // Shopping: ficha de producto generada desde el feed.
  if (campaign.strategy === "shopping") {
    return renderShoppingSnippet(campaign);
  }
  switch (channel) {
    case "meta":
      return renderFeedSnippet(campaign, "Instagram / Facebook");
    case "linkedin":
      return renderFeedSnippet(campaign, "LinkedIn");
    case "tiktok":
      return renderFeedSnippet(campaign, "TikTok");
    case "x":
      return renderFeedSnippet(campaign, "X (Twitter)");
    case "google":
    default:
      return renderSearchSnippet(campaign, shown);
  }
}

function renderSearchSnippet(
  campaign: Campaign,
  shown: ShownCombination | null,
): string {
  // Desde v0.40.0 el persona ve UNA combinación muestreada (validez
  // ecológica: así sirve Google un RSA), no el inventario completo.
  const headlines = shown?.headlines ?? campaign.headlines;
  const descriptions = shown?.descriptions ?? campaign.descriptions;
  const lines: string[] = [];
  lines.push("Ves este resultado de búsqueda patrocinado:");
  lines.push("");
  lines.push("---");
  if (campaign.company_name) {
    lines.push(
      `Anunciante: ${campaign.company_name} (con su logo) · ${displayUrl(campaign.final_url)}`,
    );
  } else {
    lines.push(`URL visible: ${displayUrl(campaign.final_url)}`);
  }
  lines.push("");
  lines.push(`Titular: ${headlines.join(" | ")}`);
  lines.push("");
  lines.push(`Descripción: ${descriptions.join(" ")}`);
  lines.push("---");
  return lines.join("\n");
}

function renderDisplaySnippet(campaign: Campaign): string {
  const lines: string[] = [];
  lines.push("Ves este banner patrocinado en una web mientras leías:");
  lines.push("");
  lines.push("---");
  if (campaign.company_name) {
    lines.push(`Anunciante: ${campaign.company_name} (${displayUrl(campaign.final_url)})`);
  } else {
    lines.push(`Anunciante: ${displayUrl(campaign.final_url)}`);
  }
  lines.push("");
  if (campaign.long_headline) {
    lines.push(`Titular largo: ${campaign.long_headline}`);
  }
  lines.push("");
  lines.push("Titulares cortos (Google combina con el largo según el slot):");
  for (const h of campaign.headlines) lines.push(`- ${h}`);
  lines.push("");
  lines.push("Descripciones:");
  for (const d of campaign.descriptions) lines.push(`- ${d}`);
  if (campaign.cta) {
    lines.push("");
    lines.push(`Botón CTA: [${campaign.cta}]`);
  }
  lines.push("---");
  return lines.join("\n");
}

function renderPmaxSnippet(
  campaign: Campaign,
  shown: ShownCombination | null,
): string {
  const headline = shown?.headlines[0] ?? campaign.headlines[0];
  const description = shown?.descriptions[0] ?? campaign.descriptions[0];
  const lines: string[] = [];
  lines.push(
    "Ves este anuncio (generado automáticamente con los recursos del anunciante) en una superficie de Google:",
  );
  lines.push("");
  lines.push("---");
  if (campaign.company_name) {
    lines.push(`Anunciante: ${campaign.company_name} (${displayUrl(campaign.final_url)})`);
  } else {
    lines.push(`Anunciante: ${displayUrl(campaign.final_url)}`);
  }
  lines.push("");
  if (campaign.long_headline) {
    lines.push(`Titular largo: ${campaign.long_headline}`);
  }
  lines.push(`Titular: ${headline}`);
  lines.push("");
  lines.push(`Descripción: ${description}`);
  if (campaign.cta) {
    lines.push("");
    lines.push(`Botón CTA: [${campaign.cta}]`);
  }
  lines.push("---");
  return lines.join("\n");
}

function renderDemandGenSnippet(
  campaign: Campaign,
  shown: ShownCombination | null,
): string {
  const headline = shown?.headlines[0] ?? campaign.headlines[0];
  const description = shown?.descriptions[0] ?? campaign.descriptions[0];
  const lines: string[] = [];
  lines.push("Ves esta tarjeta patrocinada en el feed:");
  lines.push("");
  lines.push("---");
  if (campaign.company_name) {
    lines.push(`Anunciante: ${campaign.company_name} (${displayUrl(campaign.final_url)})`);
  } else {
    lines.push(`Anunciante: ${displayUrl(campaign.final_url)}`);
  }
  lines.push("");
  lines.push(`Titular: ${headline}`);
  lines.push("");
  lines.push(`Descripción: ${description}`);
  if (campaign.cta) {
    lines.push("");
    lines.push(`Botón CTA: [${campaign.cta}]`);
  }
  lines.push("---");
  return lines.join("\n");
}

function renderVideoSnippet(campaign: Campaign): string {
  const lines: string[] = [];
  lines.push(
    "Te aparece este anuncio de vídeo antes del contenido (podrás saltarlo a los 5 segundos):",
  );
  lines.push("");
  lines.push("---");
  lines.push(`Anunciante: ${displayUrl(campaign.final_url)}`);
  lines.push("");
  lines.push(`Titular: ${campaign.headlines[0]}`);
  lines.push("");
  lines.push(`Descripción: ${campaign.descriptions[0]}`);
  if (campaign.cta) {
    lines.push("");
    lines.push(`Botón CTA: [${campaign.cta}]`);
  }
  lines.push("");
  lines.push(
    "(La imagen adjunta es la miniatura del vídeo: es lo único visual que conoces antes de decidir si lo saltas.)",
  );
  lines.push("---");
  return lines.join("\n");
}

function renderShoppingSnippet(campaign: Campaign): string {
  const p = campaign.product;
  const lines: string[] = [];
  lines.push(
    "Ves esta ficha de producto en el carrusel de Shopping, entre fichas de competidores:",
  );
  lines.push("");
  lines.push("---");
  lines.push(`Producto: ${p?.title ?? campaign.name}`);
  if (p?.brand) lines.push(`Marca: ${p.brand}`);
  if (p?.price) lines.push(`Precio: ${p.price}`);
  if (p?.availability && p.availability !== "in_stock") {
    lines.push(`Disponibilidad: ${p.availability}`);
  }
  if (p?.condition && p.condition !== "new") {
    lines.push(`Condición: ${p.condition === "refurbished" ? "reacondicionado" : "usado"}`);
  }
  lines.push(`Tienda: ${displayUrl(campaign.final_url)}`);
  lines.push("");
  lines.push("(La imagen adjunta es la foto principal del producto en la ficha.)");
  lines.push("---");
  return lines.join("\n");
}

function renderFeedSnippet(campaign: Campaign, network: string): string {
  const lines: string[] = [];
  lines.push(`Ves este post patrocinado en tu feed de ${network}:`);
  lines.push("");
  lines.push("---");
  lines.push(`Anunciante: ${displayUrl(campaign.final_url)}`);
  lines.push("");
  lines.push("Texto principal / titular(es):");
  for (const h of campaign.headlines) lines.push(`- ${h}`);
  lines.push("");
  lines.push("Cuerpo / descripción(es):");
  for (const d of campaign.descriptions) lines.push(`- ${d}`);
  lines.push("---");
  return lines.join("\n");
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

function networkLabel(channel: Channel): string {
  switch (channel) {
    case "meta":
      return "Instagram / Facebook";
    case "linkedin":
      return "LinkedIn";
    case "tiktok":
      return "TikTok";
    case "x":
      return "X (Twitter)";
    case "google":
    default:
      return "Google";
  }
}

function framingByChannel(
  channel: Channel,
  query: string,
  campaign: Campaign,
): string {
  if (campaign.strategy === "display") {
    const context = query
      ? `Tu interés / contexto actual: «${query}».`
      : "Estás navegando sin un interés específico.";
    return [
      "Estás leyendo un artículo en una web cualquiera (medio digital, blog, foro).",
      context,
      "En medio del contenido aparece un banner patrocinado de la red de Display de Google.",
      "Lo ves un instante mientras scrolleas. Decides en 1-2 segundos si te quedas mirando o sigues.",
    ].join(" ");
  }
  if (campaign.strategy === "pmax") {
    const context =
      query && query !== GENERAL_CONTEXT_QUERY
        ? `Google te lo enseña porque tu actividad reciente encaja con: «${query}».`
        : "Estás navegando sin un interés específico.";
    return [
      "Estás en una de las superficies de Google (Discover en el móvil, Gmail, YouTube o una web de su red).",
      context,
      "Aparece este anuncio entre el contenido. Lo ves de pasada y decides en 1-2 segundos si te interesa o sigues.",
    ].join(" ");
  }
  if (campaign.strategy === "demand_gen") {
    const context =
      query && query !== GENERAL_CONTEXT_QUERY
        ? `El algoritmo te lo enseña porque tus intereses encajan con: «${query}».`
        : "Estás mirando el feed sin buscar nada en concreto.";
    return [
      "Estás pasando el feed de Discover en el móvil (o el feed de YouTube).",
      context,
      "Entre el contenido orgánico aparece esta tarjeta patrocinada con una imagen grande. Decides en 1-2 segundos si paras o sigues scrolleando.",
    ].join(" ");
  }
  if (campaign.strategy === "video") {
    const context =
      query && query !== GENERAL_CONTEXT_QUERY
        ? `YouTube te lo sirve porque tu actividad encaja con: «${query}».`
        : "Ibas a ver otro contenido.";
    return [
      "Estás en YouTube a punto de ver un vídeo.",
      context,
      "Antes del contenido aparece este anuncio saltable: decides en los primeros 5 segundos si lo saltas, lo dejas correr o haces click en la CTA.",
    ].join(" ");
  }
  if (campaign.strategy === "shopping") {
    return [
      `Acabas de buscar en Google: «${query}» con intención de compra.`,
      "Arriba aparece el carrusel de Shopping con varias fichas de producto de tiendas distintas.",
      "Comparas foto, título, precio y tienda en un vistazo antes de decidir en cuál haces click.",
    ].join(" ");
  }
  switch (channel) {
    case "meta":
      return [
        `Estás pasando contenido en Instagram / Facebook. Tu interés general ahora mismo: «${query}».`,
        "Aparece este post patrocinado entre stories de gente que sigues. Lo ves de pasada, en el sofá, no estás buscando comprar nada.",
      ].join(" ");
    case "linkedin":
      return [
        `Estás revisando LinkedIn entre reuniones. El algoritmo sabe que te interesa: «${query}».`,
        "Aparece este post patrocinado en tu feed profesional. Lo lees con prisa pero con cierto criterio (es contexto laboral).",
      ].join(" ");
    case "tiktok":
      return [
        `Estás pasando vídeos en TikTok. Tu interés / nicho: «${query}».`,
        "Aparece este anuncio entre vídeos orgánicos. Decides en menos de 2 segundos si paras o sigues deslizando.",
      ].join(" ");
    case "x":
      return [
        `Estás leyendo X (Twitter). Tu intención de búsqueda o intereses: «${query}».`,
        "Aparece este post patrocinado entre tweets. Tiene formato tweet corto pero está marcado como Promoted.",
      ].join(" ");
    case "google":
    default:
      return [
        `Acabas de buscar en Google: «${query}».`,
        "En la primera página, este anuncio patrocinado es uno de los primeros resultados.",
        "Imagina que es lo único que ves antes de decidir si haces click.",
      ].join(" ");
  }
}

async function probeCampaignSnippet(
  profile: Profile,
  campaign: Campaign,
  channel: Channel,
  query: string,
  imageCache: ImageCache,
  shown: ShownCombination | null,
): Promise<{ output: SnippetEval; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
  > = [
    {
      // El brief del anunciante NO se inyecta aquí: el persona no debe
      // conocer la intención interna del anuncio antes de interpretarlo
      // (sesgo de cámara de eco, ver CONOCIMIENTO-USUARIOS-SINTETICOS §6.1).
      // El brief queda para la UI y como contexto de jueces neutrales.
      type: "text",
      text: [
        framingByChannel(channel, query, campaign),
        "",
        renderSnippetText(campaign, channel, shown),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  // Adjuntar creatividades como imágenes (Display / Performance Max companions).
  // - image: se intenta normalizar la URL directamente.
  // - youtube: el thumbnail (jpg) sí lo entiende el modelo.
  // - video: si trae thumbnail_url la usamos; si no, se ignora (el modelo no
  //   acepta vídeo). El perfil sintético no "ve" el vídeo, sólo su miniatura.
  for (const c of (campaign.creatives ?? []).slice(0, 4)) {
    const candidate =
      c.kind === "youtube" || c.kind === "video"
        ? c.thumbnail_url
        : c.url;
    if (!candidate) continue;
    try {
      const image = await resolveImageCached(candidate, imageCache);
      content.push({ type: "image", image });
    } catch {
      // si una creatividad no se puede normalizar, seguimos con el resto
    }
  }

  const result = await generateObject({
    model: REASONER_MODEL,
    schema: SnippetEvalSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      "- Estás en un test de anuncio de Paid Search. Primero interpreta, luego razona y solo al final puntúa.",
      "- 'perceived_offer': lo que crees que te ofrece el anuncio, en tu voz, 1 frase.",
      "- 'reasoning': 1-2 frases tuyas pensando en voz alta ANTES de decidir: qué te llama, qué te frena.",
      "- 'barriers': fricciones concretas (jerga, promesa vaga, precio oculto, sector no encaja, etc.). Vacío si no las viste.",
      "- 'behavior_class': clasifica tu conducta. 'optima' = conecta con tu intención y harías click; 'fuga' = lo ignoras y sigues; 'repesca' = sin click ahora, pero la necesidad sigue viva y otro mensaje podría recuperarte.",
      "- Después puntúa usando TODO el rango 0..1. No te refugies en valores medios: si lo ignorarías, dilo con un score bajo; si te convence, dilo con uno alto.",
      "- 'intent_to_click': 0,0-0,2 lo ignorarías por completo; 0,3-0,4 lo leerías pero sin click; 0,5-0,7 click probable; 0,8-1,0 click casi seguro.",
      "- 'clarity': 0,0-0,2 no entiendes qué venden; 0,3-0,4 te quedas dudando; 0,5-0,7 lo entiendes con algún hueco; 0,8-1,0 lo entiendes a la primera.",
      "- 'credibility': 0,0-0,2 suena a humo; 0,3-0,4 dudas bastante; 0,5-0,7 plausible con reservas; 0,8-1,0 te lo crees.",
      "- 'differentiation': 0,0-0,2 indistinguible de otros 5 resultados de la misma búsqueda; 0,3-0,4 poco distinto; 0,5-0,7 algo destaca; 0,8-1,0 claramente diferente.",
      "- No inventes características que no aparecen escritas. Habla desde tu perspectiva.",
    ].join("\n"),
    messages: [{ role: "user", content }],
  });

  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

// ============================================================
// 2) Landing match (multimodal con landing image)
// ============================================================

async function judgeLandingMatch(
  profile: Profile,
  campaign: Campaign,
  channel: Channel,
  query: string,
  snippet: SnippetEval,
  imageCache: ImageCache,
): Promise<{ output: LandingMatch; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const image = await resolveImageCached(campaign.landing_image_url, imageCache);
  const channelHook =
    channel === "google"
      ? "Acabas de hacer click en un anuncio de Paid Search"
      : `Acabas de hacer click en el post patrocinado de ${networkLabel(channel)}`;
  const queryFraming =
    channel === "google"
      ? `Tu búsqueda fue: «${query}».`
      : `Tu interés / contexto era: «${query}».`;
  const result = await generateObject({
    model: REASONER_MODEL,
    schema: LandingMatchSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      `- ${channelHook} y has aterrizado en la landing que ves.`,
      "- El anuncio prometía algo concreto en tu interpretación.",
      "- Devuelve 'landing_match' 0..1: cuánto la landing cumple esa promesa.",
      "- 'landing_critique' 1-2 frases: qué encaja, qué chirría.",
      "- Sé honesto: si la landing parece otra cosa o te marea, dilo.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              queryFraming,
              `El anuncio te prometía (en tu interpretación): ${snippet.perceived_offer}`,
              "Esta es la landing donde aterrizaste:",
            ].join("\n"),
          },
          { type: "image", image },
        ],
      },
    ],
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

// ============================================================
// 2b) Juez neutral de comprensión del anuncio
// ============================================================

/**
 * Compara lo que el perfil percibió contra lo que el anunciante quería
 * comunicar. Es un juez SIN persona (no usa buildSystemPrompt): el brief
 * del anunciante alimenta su contexto, nunca al perfil (ver v0.35.0).
 * Rúbrica por bandas clonada del judgeComprehension de five-second.
 */
async function judgeAdComprehension(
  intendedMessage: string,
  perceivedOffer: string,
  brief: string | null,
): Promise<{ output: AdJudge; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: AdJudgeSchema,
    system: [
      "Eres un juez calibrado de tests de comprensión de anuncios.",
      "Vas a comparar el 'mensaje pretendido' definido por el anunciante contra la 'oferta percibida' que verbalizó un usuario sintético al ver el anuncio.",
      "Devuelve un score 0..1:",
      "- 1.0 = la percepción recoge el mensaje pretendido o algo más específico del mismo.",
      "- 0.6-0.8 = la percepción recoge una parte central del mensaje, con omisiones.",
      "- 0.3-0.5 = la percepción toca un elemento periférico (precio, marca, sector) pero pierde el qué.",
      "- 0.0-0.2 = no hay relación o la percepción contradice el mensaje.",
      "Sé estricto con jerga: si el mensaje es específico y la percepción es genérica, baja el score. No premies adivinanzas.",
      "Devuelve también 'reasoning' (1-2 frases) justificando el score.",
    ].join("\n"),
    prompt: [
      `Mensaje pretendido por el anunciante: ${intendedMessage}`,
      brief ? `Contexto del anunciante (brief interno): ${brief}` : "",
      `Oferta percibida por el usuario: ${perceivedOffer}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

// ============================================================
// 3) Versión ideal (Sonnet, sólo texto)
// ============================================================

async function proposeIdealVersion(
  profile: Profile,
  campaign: Campaign,
  channel: Channel,
  query: string,
  snippet: SnippetEval,
): Promise<{ output: IdealVersion; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const formatHint =
    campaign.strategy === "shopping"
      ? "título de ficha de producto (máx 150 chars) y argumento de compra (máx 90)"
      : channel === "google"
        ? "formato Google Ads RSA (titular máx 30 chars, descripción máx 90)"
        : `formato ${networkLabel(channel)} (texto corto que pueda pararte en feed)`;
  const queryFraming =
    channel === "google"
      ? `Tu búsqueda fue: «${query}».`
      : `Tu interés / contexto era: «${query}».`;
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: IdealVersionSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      "- Después de ver el anuncio, escribe TU versión ideal del mismo anuncio, en tu voz.",
      `- 'ideal_headline' es un titular alternativo. Máximo 30 caracteres (${formatHint}).`,
      "- 'ideal_description' es una descripción alternativa. Máximo 90 caracteres.",
      "- 'ideal_promise' es la promesa central que TÚ querrías leer para hacer click.",
      "- 'ideal_free_text' es opcional, 1-2 frases sueltas con matiz extra. null si no añades nada.",
      "- Habla como tú: con tus dudas, tu sector, tu nivel de jerga. NO copies el anuncio original.",
    ].join("\n"),
    prompt: [
      queryFraming,
      `El anuncio te decía (perceived offer): ${snippet.perceived_offer}.`,
      `Tu intent_to_click sobre el original fue ${snippet.intent_to_click.toFixed(2)} y tus barreras: ${snippet.barriers.join("; ") || "ninguna"}.`,
      "",
      "Escribe tu versión ideal del anuncio para ese contexto.",
    ].join("\n"),
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

// ============================================================
// Orquestador
//
// Arquitectura en dos fases para sobrevivir a maxDuration:
//  - prepareCampaignRun / prepareCampaignResume: validación + creación o
//    rehidratación del run. Rápido, dentro del request.
//  - executeCampaignRun: cola perfil × canal × query con worker pool,
//    tolerante a fallos parciales, con deadline interno y cierre
//    GARANTIZADO (summarize sobre lo persistido + markRunFinished).
//    Pensado para correr en after() del route handler.
// ============================================================

const RUNNER_CONCURRENCY = 5;
/** Pasado este margen no se arrancan combinaciones nuevas: el cierre
 * (summarize + métricas + estado) debe caber dentro de maxDuration=300. */
const RUNNER_DEADLINE_MS = 270_000;

export type RunCampaignInput = { campaignId: string; profileIds: string[] };
export type RunCampaignOutput = { runId: string; summary: CampaignSummary };

export type PreparedCampaignRun = {
  runId: string;
  campaign: Campaign;
  profiles: Profile[];
  queries: string[];
  expected: number;
};

export async function prepareCampaignRun(
  input: RunCampaignInput,
): Promise<PreparedCampaignRun> {
  const campaign = await getCampaign(input.campaignId);
  if (!campaign) throw new Error("Campaign no encontrada.");
  if (
    (campaign.strategy === "search" || campaign.strategy === "shopping") &&
    campaign.queries.length === 0
  ) {
    throw new Error("Esta estrategia exige al menos 1 query de búsqueda.");
  }
  if (!campaign.channels || campaign.channels.length === 0) {
    throw new Error("La campaign no tiene canales seleccionados.");
  }

  const profiles: Profile[] = [];
  for (const pid of input.profileIds) {
    const p = await getProfile(pid);
    if (!p) throw new Error(`Perfil ${pid} no encontrado.`);
    profiles.push(p);
  }
  if (profiles.length === 0) throw new Error("Sin perfiles para evaluar.");
  if (profiles.length > 20) throw new Error("Máximo 20 perfiles por run.");

  // Para estrategias sin queries (Display), usamos 1 placeholder de contexto
  // general para que el runner genere al menos 1 respuesta por perfil × canal.
  const queriesToUse =
    campaign.queries.length > 0 ? campaign.queries : [GENERAL_CONTEXT_QUERY];

  // Cap defensivo del techo combinatorio (20 × 5 × 5 = 500 en el peor caso).
  const combinations =
    profiles.length * campaign.channels.length * queriesToUse.length;
  if (combinations > 200) {
    throw new Error(
      `Combinatorial demasiado grande: ${profiles.length} perfiles × ${campaign.channels.length} canales × ${queriesToUse.length} queries = ${combinations}. Máximo 200. Reduce perfiles, canales o queries.`,
    );
  }

  const run = await createRun({
    profile_id: profiles[0].id,
    kind: "campaign",
    campaign_id: campaign.id,
    params: {
      campaignId: campaign.id,
      profileIds: profiles.map((p) => p.id),
      queries: queriesToUse,
      channels: campaign.channels,
    },
  });

  return {
    runId: run.id,
    campaign,
    profiles,
    queries: queriesToUse,
    expected: combinations,
  };
}

/**
 * Rehidrata un run interrumpido (zombi en «running» o «error» parcial) para
 * retomarlo: las combinaciones ya persistidas se saltan en executeCampaignRun.
 */
export async function prepareCampaignResume(
  runId: string,
): Promise<PreparedCampaignRun> {
  const supa = getServerClient();
  const { data: run, error } = await supa
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!run || run.kind !== "campaign") throw new Error("Run no encontrado.");

  const params = (run.params ?? {}) as Record<string, unknown>;
  const campaignId =
    (run.campaign_id as string | null) ?? (params.campaignId as string | undefined);
  if (!campaignId) throw new Error("El run no referencia ninguna campaña.");
  const campaign = await getCampaignWithTrashed(campaignId);
  if (!campaign) throw new Error("Campaign no encontrada.");

  const profileIds = (params.profileIds as string[] | undefined) ?? [];
  if (profileIds.length === 0) throw new Error("El run no guarda perfiles.");
  // Sin filtrar papelera: la muestra original debe respetarse.
  const profiles = await listProfilesByIds(profileIds);
  if (profiles.length === 0) throw new Error("Los perfiles del run ya no existen.");

  const queries =
    (params.queries as string[] | undefined) ??
    (campaign.queries.length > 0 ? campaign.queries : [GENERAL_CONTEXT_QUERY]);

  // Reabrir el run: vuelve a «running» mientras se completa.
  const { error: updErr } = await supa
    .from("runs")
    .update({ status: "running", finished_at: null })
    .eq("id", runId);
  if (updErr) throw new Error(updErr.message);

  return {
    runId,
    campaign,
    profiles,
    queries,
    expected: profiles.length * campaign.channels.length * queries.length,
  };
}

/**
 * Procesa la cola completa del run. No lanza: los fallos por combinación se
 * registran (1 reintento cada una) y el run SIEMPRE se cierra con summarize
 * sobre lo persistido. Con deadline interno: lo que no quepa queda saltado
 * y puede retomarse con prepareCampaignResume.
 */
export async function executeCampaignRun(prep: PreparedCampaignRun): Promise<void> {
  const { runId, campaign, profiles, queries } = prep;
  const startedAt = Date.now();
  const supa = getServerClient();
  const imageCache: ImageCache = new Map();

  let failedCount = 0;
  let skippedByDeadline = 0;

  try {
    // Combinaciones ya persistidas (resume): se saltan. El upsert es
    // idempotente, pero repetirlas costaría tokens.
    const { data: existing } = await supa
      .from("campaign_responses")
      .select("profile_id, channel, query")
      .eq("run_id", runId);
    const already = new Set(
      (existing ?? []).map(
        (r) => `${r.profile_id}|${(r.channel as string) ?? "google"}|${r.query}`,
      ),
    );

    const combos = profiles
      .flatMap((profile) =>
        campaign.channels.flatMap((channel) =>
          queries.map((query) => ({ profile, channel, query })),
        ),
      )
      .filter((c) => !already.has(`${c.profile.id}|${c.channel}|${c.query}`));

    let cursor = 0;
    const worker = async () => {
      for (;;) {
        const i = cursor;
        cursor += 1;
        if (i >= combos.length) return;
        if (Date.now() - startedAt > RUNNER_DEADLINE_MS) {
          skippedByDeadline += 1;
          continue;
        }
        const combo = combos[i];
        try {
          await processCombo(runId, campaign, combo, imageCache);
        } catch {
          try {
            await processCombo(runId, campaign, combo, imageCache);
          } catch (err) {
            failedCount += 1;
            console.error(
              `[campaign] combinación falló tras reintento (profile=${combo.profile.id}, channel=${combo.channel}, query=${combo.query}):`,
              (err as Error).message,
            );
          }
        }
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(RUNNER_CONCURRENCY, Math.max(combos.length, 1)) },
        () => worker(),
      ),
    );
  } catch (err) {
    console.error(`[campaign] el pool del run ${runId} reventó:`, (err as Error).message);
  }

  // Cierre garantizado: summarize con TODO lo persistido (lo de antes del
  // resume incluido) y estado final según haya datos o no.
  try {
    const responses = await listCampaignResponses(runId);
    const summary = summarize(campaign, profiles.length, responses);
    await upsertMetric({
      run_id: runId,
      key: "mean_intent_to_click",
      value: summary.mean_intent_to_click,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: runId,
      key: "mean_clarity",
      value: summary.mean_clarity,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: runId,
      key: "mean_credibility",
      value: summary.mean_credibility,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: runId,
      key: "mean_differentiation",
      value: summary.mean_differentiation,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: runId,
      key: "intent_stddev",
      value: summary.intent_stddev,
      unit: "0..1",
    });
    if (summary.mean_landing_match !== null) {
      await upsertMetric({
        run_id: runId,
        key: "mean_landing_match",
        value: summary.mean_landing_match,
        unit: "0..1",
      });
    }
    if (summary.mean_ad_comprehension !== null) {
      await upsertMetric({
        run_id: runId,
        key: "mean_ad_comprehension",
        value: summary.mean_ad_comprehension,
        unit: "0..1",
      });
    }
    await upsertMetric({
      run_id: runId,
      key: "click_rate",
      value: summary.click_rate,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: runId,
      key: "n",
      value: summary.n_profiles,
      unit: "count",
    });
    await upsertMetric({
      run_id: runId,
      key: "n_failed",
      value: failedCount,
      unit: "count",
    });
    await upsertMetric({
      run_id: runId,
      key: "n_skipped_deadline",
      value: skippedByDeadline,
      unit: "count",
    });
    // Síntesis «Qué cambiar»: una llamada extra, tolerante a fallos.
    if (responses.length > 0) {
      try {
        await synthesizeRecommendations(runId, campaign, summary, responses);
      } catch (err) {
        console.error(
          `[campaign] síntesis de recomendaciones falló (run ${runId}):`,
          (err as Error).message,
        );
      }
    }
    await markRunFinished(runId, responses.length > 0 ? "done" : "error");
  } catch (err) {
    console.error(`[campaign] cierre del run ${runId} falló:`, (err as Error).message);
    await markRunFinished(runId, "error").catch(() => {});
  }
}

/**
 * Síntesis accionable del run («Qué cambiar»): una sola llamada que convierte
 * las 200 filas en recomendaciones. Se persiste mergeada en runs.params
 * (jsonb existente, sin migración) y la pinta la página de resultados.
 */
async function synthesizeRecommendations(
  runId: string,
  campaign: Campaign,
  summary: CampaignSummary,
  responses: CampaignResponse[],
): Promise<void> {
  const topIdeals = [...responses]
    .sort((a, b) => b.intent_to_click - a.intent_to_click)
    .slice(0, 10)
    .map((r) => `- "${r.ideal_headline}" / "${r.ideal_description}" (intent ${r.intent_to_click.toFixed(2)})`);
  const worstQueries = [...summary.byQuery]
    .sort((a, b) => a.mean_intent_to_click - b.mean_intent_to_click)
    .slice(0, 3)
    .map(
      (q) =>
        `- "${q.query}": intent ${q.mean_intent_to_click.toFixed(2)}, claridad ${q.mean_clarity.toFixed(2)}`,
    );

  const startedAt = Date.now();
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: RecommendationsSchema,
    system: [
      "Eres un consultor senior de paid media y CRO. Resumes un test de anuncio con usuarios sintéticos en recomendaciones accionables para el equipo de marketing.",
      "Escribe en castellano, con acentos correctos. No uses nunca el guion largo (em-dash); usa coma, dos puntos o paréntesis.",
      "Los titulares recomendados deben caber en 30 caracteres y las descripciones en 90 (formato Google Ads RSA).",
      "Apóyate en los datos: no inventes hallazgos que los números no respalden.",
    ].join("\n"),
    prompt: [
      `Campaña: ${campaign.name} (${campaign.strategy}).`,
      `Titulares actuales: ${campaign.headlines.join(" | ")}`,
      `Descripciones actuales: ${campaign.descriptions.join(" | ")}`,
      "",
      `Resultados del run (${summary.n_responses} respuestas de ${summary.n_profiles} perfiles):`,
      `- Intent medio: ${summary.mean_intent_to_click.toFixed(2)} (desviación ${summary.intent_stddev.toFixed(2)})`,
      `- Claridad ${summary.mean_clarity.toFixed(2)} · credibilidad ${summary.mean_credibility.toFixed(2)} · diferenciación ${summary.mean_differentiation.toFixed(2)}`,
      summary.mean_ad_comprehension !== null
        ? `- Comprensión del mensaje pretendido (juez): ${summary.mean_ad_comprehension.toFixed(2)}`
        : "",
      summary.mean_landing_match !== null
        ? `- Match landing: ${summary.mean_landing_match.toFixed(2)}`
        : "",
      `- Conducta: ${summary.behavior_counts.optima} óptima / ${summary.behavior_counts.repesca} repesca / ${summary.behavior_counts.fuga} fuga`,
      "",
      `Barreras top: ${summary.top_barriers.map((b) => `${b.label} (${b.count})`).join(", ") || "ninguna"}`,
      worstQueries.length > 0 ? `Queries más débiles:\n${worstQueries.join("\n")}` : "",
      topIdeals.length > 0
        ? `Mejores versiones ideales propuestas por los perfiles:\n${topIdeals.join("\n")}`
        : "",
      "",
      "Devuelve los hallazgos clave, titulares y descripciones recomendados (puedes refinar las versiones ideales) y cómo desactivar cada barrera.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  await recordUsage({
    runId,
    scope: "campaign_synthesis",
    model: DEFAULT_MODEL,
    usage: result.usage ?? null,
    meta: { latency_ms: Date.now() - startedAt },
  }).catch(() => {});

  // Truncado suave a los límites RSA y a los tamaños prometidos.
  const recommendations: CampaignRecommendations = {
    key_findings: result.object.key_findings.slice(0, 5),
    recommended_headlines: result.object.recommended_headlines
      .slice(0, 3)
      .map((h) => h.slice(0, 30)),
    recommended_descriptions: result.object.recommended_descriptions
      .slice(0, 2)
      .map((d) => d.slice(0, 90)),
    barrier_fixes: result.object.barrier_fixes.slice(0, 5),
  };

  const supa = getServerClient();
  const { data: run, error: readErr } = await supa
    .from("runs")
    .select("params")
    .eq("id", runId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  const { error } = await supa
    .from("runs")
    .update({ params: { ...((run?.params as object) ?? {}), recommendations } })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

/**
 * Wrapper síncrono (lo usa el sembrador): prepara, ejecuta y devuelve el
 * summary final calculado sobre lo persistido.
 */
export async function runCampaignTest(
  input: RunCampaignInput,
): Promise<RunCampaignOutput> {
  const prep = await prepareCampaignRun(input);
  await executeCampaignRun(prep);
  const responses = await listCampaignResponses(prep.runId);
  return {
    runId: prep.runId,
    summary: summarize(prep.campaign, prep.profiles.length, responses),
  };
}

type Combo = { profile: Profile; channel: Channel; query: string };

/** Una combinación completa: probe → landing condicional → ideal → upsert. */
async function processCombo(
  runId: string,
  campaign: Campaign,
  { profile, channel, query }: Combo,
  imageCache: ImageCache,
): Promise<void> {
  const supa = getServerClient();
  // Search en Google: el persona ve UNA combinación RSA muestreada (3
  // titulares + 2 descripciones, determinista por perfil + query). PMax
  // combina automáticamente: 1 titular corto + 1 descripción por impresión.
  // El resto de renders no cambian.
  const shown =
    channel === "google" && campaign.strategy === "search"
      ? sampleRsaCombination(campaign, profile.id, query)
      : channel === "google" &&
          (campaign.strategy === "pmax" || campaign.strategy === "demand_gen")
        ? sampleRsaCombination(campaign, profile.id, query, 1, 1)
        : null;
  const snippet = await probeCampaignSnippet(
    profile,
    campaign,
    channel,
    query,
    imageCache,
    shown,
  );
  await recordUsage({
    runId,
    scope: "campaign_probe",
    model: REASONER_MODEL,
    usage: snippet.usage,
    meta: { latency_ms: snippet.latencyMs, query, channel, profile_id: profile.id },
  }).catch(() => {});

  let landingEvaluated = false;
  let landingMatch: number | null = null;
  let landingCritique: string | null = null;
  let landingError: string | null = null;
  if (snippet.output.intent_to_click >= LANDING_THRESHOLD) {
    try {
      const landing = await judgeLandingMatch(
        profile,
        campaign,
        channel,
        query,
        snippet.output,
        imageCache,
      );
      landingEvaluated = true;
      landingMatch = landing.output.landing_match;
      landingCritique = landing.output.landing_critique;
      await recordUsage({
        runId,
        scope: "campaign_landing",
        model: REASONER_MODEL,
        usage: landing.usage,
        meta: { latency_ms: landing.latencyMs, query, channel, profile_id: profile.id },
      }).catch(() => {});
    } catch (err) {
      // El run sigue sin landing eval, pero el fallo queda trazado:
      // landing_error en meta distingue fallo técnico de gating por intent.
      landingError = (err as Error).message;
      console.error(
        `[campaign] landing eval falló (profile=${profile.id}, channel=${channel}, query=${query}):`,
        landingError,
      );
    }
  }

  // Juez neutral de comprensión: solo si la campaña define mensaje pretendido.
  // Tolerante a fallos: una respuesta sin juez no rompe la combinación.
  let comprehensionRate: number | null = null;
  let judgeReasoning: string | null = null;
  if (campaign.intended_message) {
    try {
      const judge = await judgeAdComprehension(
        campaign.intended_message,
        snippet.output.perceived_offer,
        campaign.brief,
      );
      comprehensionRate = judge.output.comprehension;
      judgeReasoning = judge.output.reasoning;
      await recordUsage({
        runId,
        scope: "campaign_judge",
        model: DEFAULT_MODEL,
        usage: judge.usage,
        meta: { latency_ms: judge.latencyMs, query, channel, profile_id: profile.id },
      }).catch(() => {});
    } catch (err) {
      console.error(
        `[campaign] juez de comprensión falló (profile=${profile.id}, channel=${channel}, query=${query}):`,
        (err as Error).message,
      );
    }
  }

  const ideal = await proposeIdealVersion(
    profile,
    campaign,
    channel,
    query,
    snippet.output,
  );
  await recordUsage({
    runId,
    scope: "campaign_ideal",
    model: DEFAULT_MODEL,
    usage: ideal.usage,
    meta: { latency_ms: ideal.latencyMs, query, channel, profile_id: profile.id },
  }).catch(() => {});

  const meta = {
    model_snippet: REASONER_MODEL,
    model_landing: REASONER_MODEL,
    model_ideal: DEFAULT_MODEL,
    latency_ms_snippet: snippet.latencyMs,
    latency_ms_ideal: ideal.latencyMs,
    reasoning: snippet.output.reasoning,
    landing_error: landingError,
    judge_reasoning: judgeReasoning,
  };
  const record = {
    run_id: runId,
    profile_id: profile.id,
    channel,
    query,
    intent_to_click: snippet.output.intent_to_click,
    perceived_offer: snippet.output.perceived_offer,
    clarity: snippet.output.clarity,
    credibility: snippet.output.credibility,
    differentiation: snippet.output.differentiation,
    barriers: snippet.output.barriers,
    landing_evaluated: landingEvaluated,
    landing_match: landingMatch,
    landing_critique: landingCritique,
    // El límite RSA (30/90) se instruye en el prompt y aquí se garantiza;
    // en Shopping el «titular ideal» es un título de ficha (150c).
    ideal_headline: ideal.output.ideal_headline.slice(
      0,
      campaign.strategy === "shopping" ? 150 : 30,
    ),
    ideal_description: ideal.output.ideal_description.slice(0, 90),
    ideal_promise: ideal.output.ideal_promise,
    ideal_free_text: ideal.output.ideal_free_text ?? null,
  };
  const onConflict = { onConflict: "run_id,profile_id,query,channel" };

  let { error } = await supa
    .from("campaign_responses")
    .upsert(
      {
        ...record,
        comprehension_rate: comprehensionRate,
        behavior_class: snippet.output.behavior_class,
        shown_headlines: shown?.headlines ?? null,
        shown_descriptions: shown?.descriptions ?? null,
        meta,
      },
      onConflict,
    );
  // 0019 pendiente: comprehension_rate, behavior_class y shown_* faltan
  // juntas (misma migración); los valores viajan en meta y
  // listCampaignResponses los lee de ahí.
  if (
    isMissingColumnError(error, "comprehension_rate") ||
    isMissingColumnError(error, "behavior_class") ||
    isMissingColumnError(error, "shown_headlines") ||
    isMissingColumnError(error, "shown_descriptions")
  ) {
    ({ error } = await supa
      .from("campaign_responses")
      .upsert(
        {
          ...record,
          meta: {
            ...meta,
            comprehension_rate: comprehensionRate,
            behavior_class: snippet.output.behavior_class,
            shown_headlines: shown?.headlines ?? null,
            shown_descriptions: shown?.descriptions ?? null,
          },
        },
        onConflict,
      ));
  }
  if (error) throw new Error(error.message);
}

// ============================================================
// Lectura + agregación
// ============================================================

export async function listCampaignResponses(
  runId: string,
): Promise<CampaignResponse[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("campaign_responses")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    profileId: r.profile_id as string,
    channel: (r.channel as Channel) ?? "google",
    query: r.query as string,
    intent_to_click: Number(r.intent_to_click),
    perceived_offer: r.perceived_offer as string,
    reasoning:
      typeof (r.meta as Record<string, unknown> | null)?.reasoning === "string"
        ? ((r.meta as Record<string, unknown>).reasoning as string)
        : null,
    comprehension_rate:
      r.comprehension_rate !== null && r.comprehension_rate !== undefined
        ? Number(r.comprehension_rate)
        : typeof (r.meta as Record<string, unknown> | null)?.comprehension_rate ===
            "number"
          ? ((r.meta as Record<string, unknown>).comprehension_rate as number)
          : null,
    behavior_class: parseBehaviorClass(
      r.behavior_class ?? (r.meta as Record<string, unknown> | null)?.behavior_class,
    ),
    shown_headlines: parseStringArray(
      r.shown_headlines ?? (r.meta as Record<string, unknown> | null)?.shown_headlines,
    ),
    shown_descriptions: parseStringArray(
      r.shown_descriptions ??
        (r.meta as Record<string, unknown> | null)?.shown_descriptions,
    ),
    clarity: Number(r.clarity),
    credibility: Number(r.credibility),
    differentiation: Number(r.differentiation),
    barriers: (r.barriers as string[]) ?? [],
    landing_evaluated: Boolean(r.landing_evaluated),
    landing_match:
      r.landing_match === null || r.landing_match === undefined
        ? null
        : Number(r.landing_match),
    landing_critique: (r.landing_critique as string | null) ?? null,
    ideal_headline: r.ideal_headline as string,
    ideal_description: r.ideal_description as string,
    ideal_promise: r.ideal_promise as string,
    ideal_free_text: (r.ideal_free_text as string | null) ?? null,
  }));
}

export function summarizeCampaignResponses(
  campaign: Campaign,
  totalProfiles: number,
  responses: CampaignResponse[],
): CampaignSummary {
  return summarize(campaign, totalProfiles, responses);
}

function summarize(
  campaign: Campaign,
  totalProfiles: number,
  rs: CampaignResponse[],
): CampaignSummary {
  if (rs.length === 0) {
    return {
      n_profiles: totalProfiles,
      n_responses: 0,
      mean_intent_to_click: 0,
      intent_stddev: 0,
      mean_clarity: 0,
      mean_credibility: 0,
      mean_differentiation: 0,
      mean_ad_comprehension: null,
      mean_landing_match: null,
      click_rate: 0,
      byQuery: [],
      byChannel: campaign.channels.map((c) => emptyByChannel(c)),
      top_barriers: [],
      behavior_counts: { optima: 0, fuga: 0, repesca: 0 },
      byAsset: [],
      behavior_inconsistencies: 0,
    };
  }

  const n = rs.length;
  const meanIntent = avg(rs.map((r) => r.intent_to_click));
  const meanClarity = avg(rs.map((r) => r.clarity));
  const meanCred = avg(rs.map((r) => r.credibility));
  const meanDiff = avg(rs.map((r) => r.differentiation));
  const matched = rs
    .filter((r) => r.landing_evaluated && typeof r.landing_match === "number")
    .map((r) => r.landing_match as number);
  const meanMatch = matched.length === 0 ? null : avg(matched);
  const judged = rs
    .filter((r) => typeof r.comprehension_rate === "number")
    .map((r) => r.comprehension_rate as number);
  const meanAdComprehension = judged.length === 0 ? null : avg(judged);
  const clicks = rs.filter((r) => r.intent_to_click >= LANDING_THRESHOLD).length;
  const clickRate = clicks / n;

  // Las queries salen de las respuestas reales, no de campaign.queries:
  // un run de Display usa el placeholder GENERAL_CONTEXT_QUERY (que no está
  // en campaign.queries) y un run antiguo puede tener queries que la campaña
  // ya no declara. Se conserva el orden de la campaña y las extra van al final.
  const present = new Set(rs.map((r) => r.query));
  const orderedQueries = [
    ...campaign.queries.filter((q) => present.has(q)),
    ...[...present].filter((q) => !campaign.queries.includes(q)),
  ];
  const byQuery: CampaignByQuery[] = orderedQueries.map(
    (query) =>
      aggregateBy(
        rs.filter((r) => r.query === query),
        "query",
        query,
      ) as CampaignByQuery,
  );

  const byChannel: CampaignByChannel[] = campaign.channels.map((channel) => {
    const subset = rs.filter((r) => r.channel === channel);
    if (subset.length === 0) return emptyByChannel(channel);
    return aggregateBy(subset, "channel", channel) as CampaignByChannel;
  });

  return {
    n_profiles: totalProfiles,
    n_responses: n,
    mean_intent_to_click: meanIntent,
    intent_stddev: stdDev(rs.map((r) => r.intent_to_click)),
    mean_clarity: meanClarity,
    mean_credibility: meanCred,
    mean_differentiation: meanDiff,
    mean_ad_comprehension: meanAdComprehension,
    mean_landing_match: meanMatch,
    click_rate: clickRate,
    byQuery,
    byChannel,
    top_barriers: topBarriers(rs),
    behavior_counts: behaviorCounts(rs),
    byAsset: assetPerformance(campaign, rs, meanIntent),
    behavior_inconsistencies: rs.filter(
      (r) =>
        (r.behavior_class === "fuga" && r.intent_to_click >= LANDING_THRESHOLD) ||
        (r.behavior_class === "optima" && r.intent_to_click < 0.3),
    ).length,
  };
}

/**
 * Rendimiento por asset: para cada titular y descripción de la campaña,
 * intent medio de las respuestas donde el asset estuvo en la combinación
 * mostrada y delta frente a la media del run. Vacío si el run no tiene
 * muestreo (anterior a v0.40.0).
 */
function assetPerformance(
  campaign: Campaign,
  rs: CampaignResponse[],
  runMeanIntent: number,
): AssetPerformance[] {
  const sampled = rs.filter((r) => r.shown_headlines !== null);
  if (sampled.length === 0) return [];
  const out: AssetPerformance[] = [];
  const measure = (asset: string, kind: "headline" | "description") => {
    const subset = sampled.filter((r) =>
      (kind === "headline" ? r.shown_headlines : r.shown_descriptions)?.includes(asset),
    );
    if (subset.length === 0) return;
    const mean = avg(subset.map((r) => r.intent_to_click));
    out.push({
      asset,
      kind,
      n: subset.length,
      mean_intent: mean,
      delta_vs_run: mean - runMeanIntent,
    });
  };
  for (const h of campaign.headlines) measure(h, "headline");
  for (const d of campaign.descriptions) measure(d, "description");
  return out.sort((a, b) => b.mean_intent - a.mean_intent);
}

function behaviorCounts(rs: CampaignResponse[]): BehaviorCounts {
  const counts: BehaviorCounts = { optima: 0, fuga: 0, repesca: 0 };
  for (const r of rs) {
    if (r.behavior_class === "optima") counts.optima++;
    else if (r.behavior_class === "fuga") counts.fuga++;
    else if (r.behavior_class === "repesca") counts.repesca++;
  }
  return counts;
}

function aggregateBy(
  subset: CampaignResponse[],
  field: "query" | "channel",
  value: string,
): CampaignByQuery | CampaignByChannel {
  const matchedQ = subset
    .filter((r) => r.landing_evaluated && typeof r.landing_match === "number")
    .map((r) => r.landing_match as number);
  const base = {
    n: subset.length,
    mean_intent_to_click: avg(subset.map((r) => r.intent_to_click)),
    mean_clarity: avg(subset.map((r) => r.clarity)),
    mean_credibility: avg(subset.map((r) => r.credibility)),
    mean_differentiation: avg(subset.map((r) => r.differentiation)),
    mean_landing_match: matchedQ.length === 0 ? null : avg(matchedQ),
    click_rate:
      subset.filter((r) => r.intent_to_click >= LANDING_THRESHOLD).length /
      subset.length,
    top_barriers: topBarriers(subset),
    behavior_counts: behaviorCounts(subset),
  };
  if (field === "channel") {
    return { channel: value as Channel, ...base };
  }
  return { query: value, ...base };
}

function emptyByChannel(channel: Channel): CampaignByChannel {
  return {
    channel,
    n: 0,
    mean_intent_to_click: 0,
    mean_clarity: 0,
    mean_credibility: 0,
    mean_differentiation: 0,
    mean_landing_match: null,
    click_rate: 0,
    top_barriers: [],
    behavior_counts: { optima: 0, fuga: 0, repesca: 0 },
  };
}

function parseBehaviorClass(
  v: unknown,
): "optima" | "fuga" | "repesca" | null {
  return v === "optima" || v === "fuga" || v === "repesca" ? v : null;
}

function parseStringArray(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((x) => typeof x === "string")
    ? (v as string[])
    : null;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - mean) ** 2)));
}

function topBarriers(rs: CampaignResponse[]): { label: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const r of rs) {
    for (const raw of r.barriers) {
      const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
      if (!key) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}
