import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { getSetting } from "@/lib/settings";

/**
 * Motores reales del GEO Tester.
 *
 * Cada sonda lanza la query del segmento TAL CUAL contra un motor de
 * respuesta IA real, vía AI Gateway:
 * - claude: modelo Anthropic + tool server-side de búsqueda web (con citas).
 * - perplexity: el modelo Sonar busca y cita por sí mismo.
 * - chatgpt: modelo OpenAI + tool web_search de la Responses API.
 *
 * El modelo de cada motor se elige en /tokens (app_settings, clave
 * 'geo_engine_models'): ligero para pruebas, frontera para análisis reales.
 * AI Overview y Gemini quedan fuera por ahora (sin API oficial / pendiente).
 */

export type GeoEngineId = "claude" | "perplexity" | "chatgpt";

export const GEO_ENGINE_IDS: GeoEngineId[] = ["claude", "perplexity", "chatgpt"];

export type GeoEngineModels = Record<GeoEngineId, string>;

export type GeoEngineModelOption = {
  id: string;
  label: string;
  /** Tarifa por millón de tokens, para el hint del selector. */
  priceHint: string;
};

export type GeoEngineSpec = {
  id: GeoEngineId;
  label: string;
  provider: string;
  /** Coste de búsqueda del motor, para el hint del selector. */
  searchFeeHint: string;
  models: GeoEngineModelOption[];
  defaultModel: string;
};

/**
 * Slugs verificados contra el catálogo del gateway (GET /v1/models) el
 * 2026-06-12. Tarifas: catálogo del gateway (Anthropic/OpenAI) y docs de
 * Perplexity. Mantener model-pricing.ts alineado al añadir opciones.
 */
export const GEO_ENGINE_CATALOG: GeoEngineSpec[] = [
  {
    id: "claude",
    label: "Claude",
    provider: "Anthropic",
    searchFeeHint: "10 $/1.000 búsquedas",
    models: [
      { id: "anthropic/claude-haiku-4.5", label: "Haiku 4.5 · ligero", priceHint: "1/5 $ por MTok" },
      { id: "anthropic/claude-sonnet-4.6", label: "Sonnet 4.6 · estándar", priceHint: "3/15 $ por MTok" },
      { id: "anthropic/claude-opus-4.8", label: "Opus 4.8 · frontera", priceHint: "5/25 $ por MTok" },
    ],
    defaultModel: "anthropic/claude-sonnet-4.6",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    provider: "Perplexity",
    searchFeeHint: "5-14 $/1.000 búsquedas",
    models: [
      { id: "perplexity/sonar", label: "Sonar · ligero", priceHint: "1/1 $ por MTok" },
      { id: "perplexity/sonar-pro", label: "Sonar Pro · profundo", priceHint: "3/15 $ por MTok" },
    ],
    defaultModel: "perplexity/sonar",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    provider: "OpenAI",
    searchFeeHint: "10 $/1.000 búsquedas",
    models: [
      { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini · ligero", priceHint: "0,75/4,5 $ por MTok" },
      { id: "openai/gpt-5.4", label: "GPT-5.4 · estándar", priceHint: "2,5/15 $ por MTok" },
      { id: "openai/gpt-5.5", label: "GPT-5.5 · frontera", priceHint: "5/30 $ por MTok" },
    ],
    defaultModel: "openai/gpt-5.5",
  },
];

export const GEO_ENGINE_LABEL: Record<GeoEngineId, string> = {
  claude: "Claude",
  perplexity: "Perplexity",
  chatgpt: "ChatGPT",
};

export const GEO_MODELS_SETTING_KEY = "geo_engine_models";

export function defaultGeoEngineModels(): GeoEngineModels {
  return Object.fromEntries(
    GEO_ENGINE_CATALOG.map((e) => [e.id, e.defaultModel]),
  ) as GeoEngineModels;
}

/**
 * Modelos vigentes por motor: lo guardado en app_settings validado contra
 * el catálogo (un slug retirado del catálogo cae al default de su motor).
 */
export async function getGeoEngineModels(): Promise<GeoEngineModels> {
  const stored = await getSetting<Partial<Record<GeoEngineId, string>>>(
    GEO_MODELS_SETTING_KEY,
    {},
  );
  const models = defaultGeoEngineModels();
  for (const spec of GEO_ENGINE_CATALOG) {
    const candidate = stored?.[spec.id];
    if (candidate && spec.models.some((m) => m.id === candidate)) {
      models[spec.id] = candidate;
    }
  }
  return models;
}

// ============================================================
// Sondas reales
// ============================================================

export type EngineCitation = { url: string; title: string | null };

export type EngineProbe = {
  engine: GeoEngineId;
  model: string;
  response: string;
  citations: EngineCitation[];
  latencyMs: number;
  usage: unknown;
};

/** Resultados localizados para el mercado español. */
const USER_LOCATION = {
  type: "approximate" as const,
  country: "ES",
  timezone: "Europe/Madrid",
};

/** Cota de búsquedas por sonda: acota coste y latencia sin truncar queries simples. */
const MAX_SEARCHES = 3;

function extractCitations(sources: unknown): EngineCitation[] {
  if (!Array.isArray(sources)) return [];
  const seen = new Set<string>();
  const out: EngineCitation[] = [];
  for (const s of sources) {
    const src = s as { sourceType?: string; url?: string; title?: string };
    if (src?.sourceType !== "url" || typeof src.url !== "string") continue;
    if (seen.has(src.url)) continue;
    seen.add(src.url);
    out.push({ url: src.url, title: src.title ?? null });
  }
  return out;
}

/**
 * Lanza la query del segmento contra un motor real y devuelve su respuesta
 * con citas. Sin system prompt: la sonda debe ser la pregunta desnuda,
 * como la haría el usuario.
 */
export async function runEngineProbe(
  engine: GeoEngineId,
  model: string,
  query: string,
): Promise<EngineProbe> {
  const startedAt = Date.now();

  const res =
    engine === "claude"
      ? await generateText({
          model,
          prompt: query,
          tools: {
            web_search: anthropic.tools.webSearch_20250305({
              maxUses: MAX_SEARCHES,
              userLocation: USER_LOCATION,
            }),
          },
        })
      : engine === "chatgpt"
        ? await generateText({
            model,
            prompt: query,
            tools: {
              web_search: openai.tools.webSearch({
                searchContextSize: "medium",
                userLocation: USER_LOCATION,
              }),
            },
          })
        : await generateText({ model, prompt: query });

  return {
    engine,
    model,
    response: res.text.trim(),
    citations: extractCitations(res.sources),
    latencyMs: Date.now() - startedAt,
    usage: res.usage ?? null,
  };
}
