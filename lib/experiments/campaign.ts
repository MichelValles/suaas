import { generateObject } from "ai";
import { z } from "zod";
import { type Campaign, getCampaign } from "@/lib/campaigns";
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

// ============================================================
// Schemas de salida del LLM
// ============================================================

export const SnippetEvalSchema = z.object({
  intent_to_click: z
    .number()
    .min(0)
    .max(1)
    .describe("0..1 probabilidad subjetiva de hacer click bajo la query"),
  perceived_offer: z.string().min(1).describe("Qué crees que te ofrece el anuncio. 1 frase."),
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
  barriers: z
    .array(z.string())
    .describe("Lista corta de fricciones percibidas. Vacío si no hay."),
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

export const IdealVersionSchema = z.object({
  ideal_headline: z.string().min(1).max(30).describe("Tu titular ideal en máximo 30 caracteres"),
  ideal_description: z
    .string()
    .min(1)
    .max(90)
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
  query: string;
  intent_to_click: number;
  perceived_offer: string;
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
  top_barriers: { label: string; count: number }[];
};

// ============================================================
// 1) Snippet eval (multimodal con creatividades si hay)
// ============================================================

function renderSnippetText(campaign: Campaign): string {
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

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

async function probeCampaignSnippet(
  profile: Profile,
  campaign: Campaign,
  query: string,
): Promise<{ output: SnippetEval; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string }
  > = [
    {
      type: "text",
      text: [
        `Acabas de buscar en Google: «${query}».`,
        "En la primera página, este anuncio patrocinado es uno de los primeros resultados.",
        "Imagina que es lo único que ves antes de decidir si haces click.",
        "",
        renderSnippetText(campaign),
        campaign.brief
          ? `\nNota del anunciante (no la verías tú, sólo contexto): ${campaign.brief}`
          : "",
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
      const image = await resolveImageForApi(candidate);
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
      "- Estás en un test de anuncio de Paid Search.",
      "- 'intent_to_click' es subjetivo: ¿harías click TÚ con tu vida y tu intención de búsqueda?",
      "- 'perceived_offer' es lo que crees que te ofrece el anuncio, en tu voz, 1 frase.",
      "- 'clarity' 0..1: lo entiendes a la primera o te quedas dudando.",
      "- 'credibility' 0..1: te lo crees o suena a humo.",
      "- 'differentiation' 0..1: este anuncio te diferencia frente a otros 5 resultados de la misma búsqueda.",
      "- 'barriers' lista fricciones concretas (jerga, promesa vaga, precio oculto, sector no encaja, etc.). Vacío si no las viste.",
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
  query: string,
  snippet: SnippetEval,
): Promise<{ output: LandingMatch; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const image = await resolveImageForApi(campaign.landing_image_url);
  const result = await generateObject({
    model: REASONER_MODEL,
    schema: LandingMatchSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      "- Acabas de hacer click en un anuncio de Paid Search y has aterrizado en la landing que ves.",
      "- Tu búsqueda original era explícita; el anuncio prometía algo concreto.",
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
              `Tu búsqueda fue: «${query}».`,
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
  campaign: Campaign,
  query: string,
  snippet: SnippetEval,
): Promise<{ output: IdealVersion; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: IdealVersionSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      "- Después de ver el anuncio, escribe TU versión ideal del mismo anuncio, en tu voz.",
      "- 'ideal_headline' es un titular alternativo. Máximo 30 caracteres (formato Google Ads RSA).",
      "- 'ideal_description' es una descripción alternativa. Máximo 90 caracteres (RSA).",
      "- 'ideal_promise' es la promesa central que TÚ querrías leer para hacer click.",
      "- 'ideal_free_text' es opcional, 1-2 frases sueltas con matiz extra. null si no añades nada.",
      "- Habla como tú: con tus dudas, tu sector, tu nivel de jerga. NO copies el anuncio original.",
    ].join("\n"),
    prompt: [
      `Tu búsqueda fue: «${query}».`,
      `El anuncio te decía (perceived offer): ${snippet.perceived_offer}.`,
      `Tu intent_to_click sobre el original fue ${snippet.intent_to_click.toFixed(2)} y tus barreras: ${snippet.barriers.join("; ") || "ninguna"}.`,
      "",
      "Escribe tu versión ideal del anuncio para esa búsqueda.",
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
  if (campaign.queries.length === 0) throw new Error("La campaign no tiene queries.");

  const profiles: Profile[] = [];
  for (const pid of input.profileIds) {
    const p = await getProfile(pid);
    if (!p) throw new Error(`Perfil ${pid} no encontrado.`);
    profiles.push(p);
  }
  if (profiles.length === 0) throw new Error("Sin perfiles para evaluar.");
  if (profiles.length > 20) throw new Error("Máximo 20 perfiles por run.");

  const run = await createRun({
    profile_id: profiles[0].id,
    kind: "campaign",
    campaign_id: campaign.id,
    params: {
      campaignId: campaign.id,
      profileIds: profiles.map((p) => p.id),
      queries: campaign.queries,
    },
  });

  try {
    const collected: CampaignResponse[] = [];
    for (const chunk of chunks(profiles, PROFILE_CHUNK)) {
      const results = await Promise.all(
        chunk.map((profile) => probeProfileAllQueries(run.id, campaign, profile)),
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
): Promise<CampaignResponse[]> {
  const out: CampaignResponse[] = [];
  const supa = getServerClient();
  for (const query of campaign.queries) {
    const snippet = await probeCampaignSnippet(profile, campaign, query);
    await recordUsage({
      runId,
      scope: "campaign_probe",
      model: REASONER_MODEL,
      usage: snippet.usage,
      meta: { latency_ms: snippet.latencyMs, query },
    }).catch(() => {});

    let landingEvaluated = false;
    let landingMatch: number | null = null;
    let landingCritique: string | null = null;
    if (snippet.output.intent_to_click >= LANDING_THRESHOLD) {
      try {
        const landing = await judgeLandingMatch(
          profile,
          campaign,
          query,
          snippet.output,
        );
        landingEvaluated = true;
        landingMatch = landing.output.landing_match;
        landingCritique = landing.output.landing_critique;
        await recordUsage({
          runId,
          scope: "campaign_landing",
          model: REASONER_MODEL,
          usage: landing.usage,
          meta: { latency_ms: landing.latencyMs, query },
        }).catch(() => {});
      } catch {
        // si falla la landing eval seguimos sin ella
      }
    }

    const ideal = await proposeIdealVersion(profile, campaign, query, snippet.output);
    await recordUsage({
      runId,
      scope: "campaign_ideal",
      model: DEFAULT_MODEL,
      usage: ideal.usage,
      meta: { latency_ms: ideal.latencyMs, query },
    }).catch(() => {});

    const row: CampaignResponse = {
      profileId: profile.id,
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
      ideal_headline: ideal.output.ideal_headline,
      ideal_description: ideal.output.ideal_description,
      ideal_promise: ideal.output.ideal_promise,
      ideal_free_text: ideal.output.ideal_free_text ?? null,
    };

    const { error } = await supa.from("campaign_responses").upsert(
      {
        run_id: runId,
        profile_id: profile.id,
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
        },
      },
      { onConflict: "run_id,profile_id,query" },
    );
    if (error) throw new Error(error.message);
    out.push(row);
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
    query: r.query as string,
    intent_to_click: Number(r.intent_to_click),
    perceived_offer: r.perceived_offer as string,
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
      byQuery: campaign.queries.map((q) => emptyByQuery(q)),
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

  const byQuery: CampaignByQuery[] = campaign.queries.map((query) => {
    const subset = rs.filter((r) => r.query === query);
    if (subset.length === 0) return emptyByQuery(query);
    const matchedQ = subset
      .filter((r) => r.landing_evaluated && typeof r.landing_match === "number")
      .map((r) => r.landing_match as number);
    return {
      query,
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
    top_barriers: topBarriers(rs),
  };
}

function emptyByQuery(query: string): CampaignByQuery {
  return {
    query,
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
