import { generateObject } from "ai";
import { z } from "zod";
import { type Campaign, type Channel, getCampaign } from "@/lib/campaigns";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";
import { resolveImageForApi } from "@/lib/image-source";
import { buildSystemPrompt } from "@/lib/prompts";
import { type Profile, getProfile } from "@/lib/profiles";
import { createRun, markRunFinished, upsertMetric } from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";
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
const PROFILE_CHUNK = 4;

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
};

export type CampaignSummary = {
  n_profiles: number;
  n_responses: number;
  mean_intent_to_click: number;
  mean_clarity: number;
  mean_credibility: number;
  mean_differentiation: number;
  mean_landing_match: number | null;
  click_rate: number;
  byQuery: CampaignByQuery[];
  byChannel: CampaignByChannel[];
  top_barriers: { label: string; count: number }[];
};

// ============================================================
// 1) Snippet eval (multimodal con creatividades si hay)
// ============================================================

function renderSnippetText(campaign: Campaign, channel: Channel): string {
  // Display Ads tienen render propio (banner con titular largo + CTA) que no
  // depende del canal externo (siempre se ve dentro de Google Display Network).
  if (campaign.strategy === "display") {
    return renderDisplaySnippet(campaign);
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
      return renderSearchSnippet(campaign);
  }
}

function renderSearchSnippet(campaign: Campaign): string {
  const lines: string[] = [];
  lines.push("Ves esta cabecera de resultado de búsqueda patrocinado:");
  lines.push("");
  lines.push("---");
  lines.push(`URL visible: ${displayUrl(campaign.final_url)}`);
  lines.push("");
  lines.push("Titulares (uno será el principal según el algoritmo):");
  for (const h of campaign.headlines) lines.push(`- ${h}`);
  lines.push("");
  lines.push("Descripciones:");
  for (const d of campaign.descriptions) lines.push(`- ${d}`);
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
        renderSnippetText(campaign, channel),
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
// 3) Versión ideal (Sonnet, sólo texto)
// ============================================================

async function proposeIdealVersion(
  profile: Profile,
  channel: Channel,
  query: string,
  snippet: SnippetEval,
): Promise<{ output: IdealVersion; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const formatHint =
    channel === "google"
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
// ============================================================

export type RunCampaignInput = { campaignId: string; profileIds: string[] };
export type RunCampaignOutput = { runId: string; summary: CampaignSummary };

export async function runCampaignTest(
  input: RunCampaignInput,
): Promise<RunCampaignOutput> {
  const campaign = await getCampaign(input.campaignId);
  if (!campaign) throw new Error("Campaign no encontrada.");
  if (campaign.strategy === "search" && campaign.queries.length === 0) {
    throw new Error("Search exige al menos 1 query.");
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

  // Cap defensivo del techo combinatorio. 20 × 5 × 5 = 500 snippets en peor
  // caso es demasiado para maxDuration=300. Bloqueamos por encima de 200
  // combinaciones perfil-canal-query con un mensaje claro.
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

  try {
    const collected: CampaignResponse[] = [];
    const imageCache: ImageCache = new Map();
    for (const chunk of chunks(profiles, PROFILE_CHUNK)) {
      const results = await Promise.all(
        chunk.map((profile) =>
          probeProfileAllQueries(run.id, campaign, profile, queriesToUse, imageCache),
        ),
      );
      for (const arr of results) collected.push(...arr);
    }

    const summary = summarize(campaign, profiles.length, collected);
    await upsertMetric({
      run_id: run.id,
      key: "mean_intent_to_click",
      value: summary.mean_intent_to_click,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: run.id,
      key: "mean_clarity",
      value: summary.mean_clarity,
      unit: "0..1",
    });
    if (summary.mean_landing_match !== null) {
      await upsertMetric({
        run_id: run.id,
        key: "mean_landing_match",
        value: summary.mean_landing_match,
        unit: "0..1",
      });
    }
    await upsertMetric({
      run_id: run.id,
      key: "click_rate",
      value: summary.click_rate,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: run.id,
      key: "n",
      value: summary.n_profiles,
      unit: "count",
    });

    await markRunFinished(run.id, "done");
    return { runId: run.id, summary };
  } catch (err) {
    await markRunFinished(run.id, "error").catch(() => {});
    throw err;
  }
}

async function probeProfileAllQueries(
  runId: string,
  campaign: Campaign,
  profile: Profile,
  queries: string[],
  imageCache: ImageCache,
): Promise<CampaignResponse[]> {
  const out: CampaignResponse[] = [];
  const supa = getServerClient();
  for (const channel of campaign.channels) {
    for (const query of queries) {
      const snippet = await probeCampaignSnippet(
        profile,
        campaign,
        channel,
        query,
        imageCache,
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

      const ideal = await proposeIdealVersion(profile, channel, query, snippet.output);
      await recordUsage({
        runId,
        scope: "campaign_ideal",
        model: DEFAULT_MODEL,
        usage: ideal.usage,
        meta: { latency_ms: ideal.latencyMs, query, channel, profile_id: profile.id },
      }).catch(() => {});

      const row: CampaignResponse = {
        profileId: profile.id,
        channel,
        query,
        intent_to_click: snippet.output.intent_to_click,
        perceived_offer: snippet.output.perceived_offer,
        reasoning: snippet.output.reasoning,
        clarity: snippet.output.clarity,
        credibility: snippet.output.credibility,
        differentiation: snippet.output.differentiation,
        barriers: snippet.output.barriers,
        landing_evaluated: landingEvaluated,
        landing_match: landingMatch,
        landing_critique: landingCritique,
        // El límite RSA (30/90) se instruye en el prompt; aquí se garantiza.
        ideal_headline: ideal.output.ideal_headline.slice(0, 30),
        ideal_description: ideal.output.ideal_description.slice(0, 90),
        ideal_promise: ideal.output.ideal_promise,
        ideal_free_text: ideal.output.ideal_free_text ?? null,
      };

      const { error } = await supa.from("campaign_responses").upsert(
        {
          run_id: runId,
          profile_id: profile.id,
          channel: row.channel,
          query: row.query,
          intent_to_click: row.intent_to_click,
          perceived_offer: row.perceived_offer,
          clarity: row.clarity,
          credibility: row.credibility,
          differentiation: row.differentiation,
          barriers: row.barriers,
          landing_evaluated: row.landing_evaluated,
          landing_match: row.landing_match,
          landing_critique: row.landing_critique,
          ideal_headline: row.ideal_headline,
          ideal_description: row.ideal_description,
          ideal_promise: row.ideal_promise,
          ideal_free_text: row.ideal_free_text,
          meta: {
            model_snippet: REASONER_MODEL,
            model_landing: REASONER_MODEL,
            model_ideal: DEFAULT_MODEL,
            latency_ms_snippet: snippet.latencyMs,
            latency_ms_ideal: ideal.latencyMs,
            reasoning: row.reasoning,
            landing_error: landingError,
          },
        },
        { onConflict: "run_id,profile_id,query,channel" },
      );
      if (error) throw new Error(error.message);
      out.push(row);
    }
  }
  return out;
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
      mean_clarity: 0,
      mean_credibility: 0,
      mean_differentiation: 0,
      mean_landing_match: null,
      click_rate: 0,
      byQuery: [],
      byChannel: campaign.channels.map((c) => emptyByChannel(c)),
      top_barriers: [],
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
    mean_clarity: meanClarity,
    mean_credibility: meanCred,
    mean_differentiation: meanDiff,
    mean_landing_match: meanMatch,
    click_rate: clickRate,
    byQuery,
    byChannel,
    top_barriers: topBarriers(rs),
  };
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
  };
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
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

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
