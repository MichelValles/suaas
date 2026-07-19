/**
 * Estimador de coste previo a las acciones que consumen el AI Gateway.
 *
 * Una acción se modela como partes (scope, modelo, número de llamadas) y se
 * precia con las medias empíricas de gateway_usage (últimas 200 llamadas por
 * scope, split prompt/completion). Sin histórico se usa un fallback
 * conservador para que el coste aparezca desde el primer día: la cifra es
 * siempre orientativa (de ahí el «~» en la UI).
 *
 * Lo consumen el endpoint GET /api/estimate/run (paneles de lanzamiento) y
 * las páginas server que pintan coste junto a botones propios (GEO,
 * Momentum, chat, seeds).
 */

import { getDailyBudget } from "@/lib/budget";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";
import { usdForTokens } from "@/lib/model-pricing";
import {
  type UsageScope,
  getScopeAverages,
  getTokensLast24h,
} from "@/lib/usage";

/** Una parte de la acción: `count` llamadas del scope dado con su modelo. */
export type EstimatePart = { scope: UsageScope; model: string; count: number };

export type ActionEstimate = {
  calls: number;
  est_tokens: number;
  est_usd: number;
  /** Solo con histórico de latencia; null sin él. */
  est_seconds: number | null;
  has_history: boolean;
  budget: { limit: number; spent_24h: number } | null;
};

/** Sin histórico del scope: llamada típica de generateObject con persona. */
const FALLBACK_PROMPT_TOKENS = 1800;
const FALLBACK_COMPLETION_TOKENS = 180;
/** Con histórico pero sin split (filas antiguas): prompt grande, salida corta. */
const FALLBACK_PROMPT_SHARE = 0.9;
/** La landing eval de campañas solo corre con intent >= 0,5 (~60% histórico). */
const LANDING_SHARE = 0.6;
/** Worker pool de los runners (campaign y chunks de 5 en el resto). */
const RUNNER_CONCURRENCY = 5;

type PartsCost = {
  calls: number;
  tokens: number;
  usd: number;
  latencyMs: number;
  hasHistory: boolean;
  hasLatency: boolean;
};

function costParts(
  parts: EstimatePart[],
  byScope: Map<UsageScope, Awaited<ReturnType<typeof getScopeAverages>>[number]>,
): PartsCost {
  let calls = 0;
  let tokens = 0;
  let usd = 0;
  let latencyMs = 0;
  let hasHistory = false;
  let hasLatency = false;

  for (const part of parts) {
    if (part.count <= 0) continue;
    calls += part.count;
    const avg = byScope.get(part.scope);
    let prompt: number;
    let completion: number;
    if (avg && avg.n > 0) {
      hasHistory = true;
      if (avg.avgPromptTokens + avg.avgCompletionTokens > 0) {
        prompt = avg.avgPromptTokens;
        completion = avg.avgCompletionTokens;
      } else {
        prompt = avg.avgTokens * FALLBACK_PROMPT_SHARE;
        completion = avg.avgTokens * (1 - FALLBACK_PROMPT_SHARE);
      }
      if (avg.avgLatencyMs !== null) {
        latencyMs += part.count * avg.avgLatencyMs;
        hasLatency = true;
      }
    } else {
      prompt = FALLBACK_PROMPT_TOKENS;
      completion = FALLBACK_COMPLETION_TOKENS;
    }
    tokens += part.count * (prompt + completion);
    usd += part.count * usdForTokens(part.model, prompt, completion);
  }
  return { calls, tokens, usd, latencyMs, hasHistory, hasLatency };
}

export async function estimateAction(
  parts: EstimatePart[],
): Promise<ActionEstimate> {
  const scopes = [...new Set(parts.map((p) => p.scope))];
  const [averages, spent24h] = await Promise.all([
    getScopeAverages(scopes),
    getTokensLast24h(),
  ]);
  const byScope = new Map(averages.map((a) => [a.scope, a]));
  const cost = costParts(parts, byScope);

  const budget = getDailyBudget();
  return {
    calls: Math.round(cost.calls),
    est_tokens: Math.round(cost.tokens),
    est_usd: cost.usd,
    est_seconds: cost.hasLatency
      ? Math.round(cost.latencyMs / RUNNER_CONCURRENCY / 1000)
      : null,
    has_history: cost.hasHistory,
    budget: budget ? { limit: budget, spent_24h: Math.round(spent24h) } : null,
  };
}

/**
 * Precia varios grupos de partes con UNA sola carga de medias por scope:
 * para páginas que componen muchas estimaciones a la vez (/seed-examples).
 * Devuelve dólares por clave de grupo.
 */
export async function estimateManyUsd(
  groups: Record<string, EstimatePart[]>,
): Promise<Record<string, number>> {
  const scopes = [
    ...new Set(Object.values(groups).flatMap((parts) => parts.map((p) => p.scope))),
  ];
  const averages = await getScopeAverages(scopes);
  const byScope = new Map(averages.map((a) => [a.scope, a]));
  const out: Record<string, number> = {};
  for (const [key, parts] of Object.entries(groups)) {
    out[key] = costParts(parts, byScope).usd;
  }
  return out;
}

export const ESTIMATE_KINDS = [
  "five_second",
  "ab",
  "copy",
  "pricing",
  "funnel",
  "campaign",
  "geo",
  "momentum",
  "chat_turn",
  "seed_profiles",
] as const;
export type EstimateKind = (typeof ESTIMATE_KINDS)[number];

/**
 * Partes de cada acción según su runner:
 * - `profiles` = N perfiles seleccionados.
 * - `perProfile` = multiplicador por perfil que la página conoce (bloques del
 *   deck en copy, precios en pricing, pasos en funnel, canales × queries en
 *   campaign) o, en geo, el número de segmentos.
 * - `judge` = la campaña define intended_message (añade 1 juez por combo).
 * Funnel es cota superior: cada perfil puede abandonar antes del último paso.
 */
export function partsForKind(
  kind: EstimateKind,
  opts: {
    profiles?: number;
    perProfile?: number;
    judge?: boolean;
    /** GEO: modelos vigentes por motor (de /tokens). Sin ellos, defaults. */
    geoModels?: Record<string, string>;
  } = {},
): EstimatePart[] {
  const n = Math.max(1, opts.profiles ?? 1);
  const k = Math.max(1, opts.perProfile ?? 1);
  switch (kind) {
    case "five_second":
      return [
        { scope: "probe_5s", model: DEFAULT_MODEL, count: n },
        { scope: "judge_5s", model: DEFAULT_MODEL, count: n },
      ];
    case "ab":
      return [
        { scope: "probe_5s", model: DEFAULT_MODEL, count: 2 * n },
        { scope: "judge_5s", model: DEFAULT_MODEL, count: 2 * n },
      ];
    case "copy":
      return [{ scope: "copy_resonance", model: DEFAULT_MODEL, count: n * k }];
    case "pricing":
      return [{ scope: "pricing_react", model: DEFAULT_MODEL, count: n * k }];
    case "funnel":
      return [{ scope: "probe_funnel", model: DEFAULT_MODEL, count: n * k }];
    case "campaign": {
      const combos = n * k;
      const parts: EstimatePart[] = [
        { scope: "campaign_probe", model: DEFAULT_MODEL, count: combos },
        {
          scope: "campaign_landing",
          model: DEFAULT_MODEL,
          count: LANDING_SHARE * combos,
        },
        { scope: "campaign_ideal", model: DEFAULT_MODEL, count: combos },
        { scope: "campaign_synthesis", model: DEFAULT_MODEL, count: 1 },
      ];
      if (opts.judge) {
        parts.push({
          scope: "campaign_judge",
          model: DEFAULT_MODEL,
          count: combos,
        });
      }
      return parts;
    }
    case "geo": {
      // k = número de segmentos (no usa perfiles). Por segmento: 1 sonda
      // real por motor (Claude, Perplexity, ChatGPT) + 1 análisis por sonda.
      // Solo tokens: la cuota de búsqueda (~0,01 $/sonda) se suma en la página.
      const geoModels = Object.values(opts.geoModels ?? {});
      const probeParts: EstimatePart[] =
        geoModels.length > 0
          ? geoModels.map((model) => ({ scope: "geo_probe", model, count: k }))
          : [{ scope: "geo_probe", model: DEFAULT_MODEL, count: 3 * k }];
      return [
        ...probeParts,
        { scope: "geo_analysis", model: DEFAULT_MODEL, count: 3 * k },
      ];
    }
    case "momentum":
      return [{ scope: "momentum_probe", model: DEFAULT_MODEL, count: n }];
    case "chat_turn":
      return [
        { scope: "reasoner_chat", model: REASONER_MODEL, count: 1 },
        { scope: "talker_chat", model: DEFAULT_MODEL, count: 1 },
      ];
    case "seed_profiles":
      // Scope propio desde v0.61.x. Sin histórico aún, el estimador cae al
      // fallback conservador hasta acumular llamadas nuevas.
      return [{ scope: "seed_profile", model: REASONER_MODEL, count: n }];
  }
}
