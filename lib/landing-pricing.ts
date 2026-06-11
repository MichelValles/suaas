/**
 * Datos y helpers de la landing comercial (propuesta de venta).
 *
 * Módulo puro sin dependencias de servidor: lo consumen tanto la página
 * (server, tabla estática de proveedores) como la calculadora (client).
 *
 * Precios de IA verificados el 2026-06-11 (investigación de mercado). Infra
 * verificada contra Supabase/Vercel. Todo en USD por millón de tokens salvo
 * lo indicado; se convierte a EUR con EUR_PER_USD para la calculadora.
 */

/** Cambio aproximado USD→EUR. Ajustar si el tipo se mueve mucho. */
export const EUR_PER_USD = 0.92;

/**
 * Perfil de un «run estándar» para estimar coste por proveedor: un
 * experimento sobre una cohorte pequeña son ~12 llamadas LLM con el system
 * prompt del perfil repetido. Cifra redonda y transparente; el coste real
 * de cada módulo varía (una campaña a tope cuesta más que un test de copy).
 */
export const RUN_INPUT_TOKENS = 20_000;
export const RUN_OUTPUT_TOKENS = 2_500;
export const RUN_CALLS = 12;

export type AiModel = {
  id: string;
  label: string;
  /** USD por millón de tokens de entrada. */
  inUsd: number;
  /** USD por millón de tokens de salida. */
  outUsd: number;
  /** USD por 1.000 requests (sólo Perplexity cobra fee por request). */
  reqFeeUsd?: number;
  /** Modelo que usa la plataforma hoy por defecto. */
  current?: boolean;
};

export type AiProvider = { provider: string; note: string; models: AiModel[] };

export const AI_PROVIDERS: AiProvider[] = [
  {
    provider: "Anthropic",
    note: "Motor actual de la plataforma. Mejor calidad de razonamiento y multimodal para el scoring.",
    models: [
      { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", inUsd: 3, outUsd: 15, current: true },
      { id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7", inUsd: 5, outUsd: 25 },
      { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", inUsd: 1, outUsd: 5 },
    ],
  },
  {
    provider: "OpenAI",
    note: "Familia GPT-5.4, multimodal y con salida estructurada (equivalente a generateObject).",
    models: [
      { id: "openai/gpt-5.4", label: "GPT-5.4", inUsd: 2.5, outUsd: 15 },
      { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini", inUsd: 0.75, outUsd: 4.5 },
      { id: "openai/gpt-5.4-nano", label: "GPT-5.4 nano", inUsd: 0.2, outUsd: 1.25 },
    ],
  },
  {
    provider: "Google Gemini",
    note: "Serie 3.x. Los Flash bajan mucho el coste por run manteniendo multimodal.",
    models: [
      { id: "google/gemini-3.1-pro", label: "Gemini 3.1 Pro", inUsd: 2, outUsd: 12 },
      { id: "google/gemini-3-flash", label: "Gemini 3 Flash", inUsd: 0.5, outUsd: 3 },
      { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", inUsd: 0.25, outUsd: 1.5 },
    ],
  },
  {
    provider: "Perplexity",
    note: "Modelos Sonar con búsqueda web en vivo: encajan en el módulo GEO. Cobran fee por request además de tokens.",
    models: [
      { id: "perplexity/sonar", label: "Sonar", inUsd: 1, outUsd: 1, reqFeeUsd: 8 },
      { id: "perplexity/sonar-pro", label: "Sonar Pro", inUsd: 3, outUsd: 15, reqFeeUsd: 10 },
      { id: "perplexity/sonar-reasoning-pro", label: "Sonar Reasoning Pro", inUsd: 2, outUsd: 8, reqFeeUsd: 10 },
    ],
  },
];

/** Coste en EUR de un run estándar con el modelo dado. */
export function runCostEur(m: AiModel): number {
  const usd =
    (RUN_INPUT_TOKENS / 1e6) * m.inUsd +
    (RUN_OUTPUT_TOKENS / 1e6) * m.outUsd +
    (RUN_CALLS / 1000) * (m.reqFeeUsd ?? 0);
  return usd * EUR_PER_USD;
}

/** Runs que compra un presupuesto mensual (USD) con el modelo dado. */
export function runsForBudget(m: AiModel, budgetUsd: number): number {
  const costUsd = runCostEur(m) / EUR_PER_USD;
  return costUsd > 0 ? Math.floor(budgetUsd / costUsd) : 0;
}

/** Presupuesto de IA de referencia para la tabla comparativa de la landing (USD/mes). */
export const BUDGET_REF_USD = 30;

// ============================================================
// Paquetes comerciales
// ============================================================

export type Tier = {
  id: string;
  name: string;
  /** Precio recurrente en EUR/mes. */
  priceMonth: number;
  /** Calibración (opcional), EUR one-time. */
  setup: number;
  /** Presupuesto de IA incluido (budget de la API key), USD/mes. */
  apiBudgetUsd: number;
  blurb: string;
  features: string[];
  target: string;
  /** Tier objetivo, destacado en la landing. */
  featured?: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonth: 290,
    setup: 1200,
    apiBudgetUsd: 30,
    blurb: "Para validar rápido lo esencial antes de tocar la web.",
    features: [
      "Generación de 50 perfiles calibrados según el target del proyecto",
      "Módulos básicos: claridad 5s, copy y pricing",
      "Resultados en minutos, no en semanas",
      "Presupuesto de IA ~30 $/mes incluido",
    ],
    target: "PYME pequeña (facturación < 1 M)",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonth: 790,
    setup: 1800,
    apiBudgetUsd: 70,
    blurb: "El estándar: todos los módulos y tu marca en la plataforma.",
    features: [
      "Generación de 50 perfiles calibrados según el target del proyecto",
      "Todos los módulos: campañas, embudos, GEO y momentum",
      "Tu marca en la plataforma (white-label)",
      "Presupuesto de IA ~70 $/mes incluido",
    ],
    target: "PYME media / empresa mediana (1-5 M)",
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    priceMonth: 1900,
    setup: 2500,
    apiBudgetUsd: 200,
    blurb: "Instancia dedicada premium, sin límites y con SLA.",
    features: [
      "Generación de 50 perfiles calibrados según el target del proyecto",
      "Todo lo de Pro, sin límite diario de uso",
      "SLA y soporte prioritario",
      "Presupuesto de IA ~200 $/mes incluido",
    ],
    target: "Empresa mediana grande (> 5 M)",
  },
];

// ============================================================
// Costes de infraestructura (para la calculadora de rentabilidad)
// ============================================================

// Desglose de infraestructura (EUR/mes). Por instancia: Supabase Micro + Vercel
// compute. Fijo compartido por la flota: seat de Vercel + base de la org Supabase.
export const SUPABASE_MICRO_EUR = 10;
export const VERCEL_COMPUTE_EUR = 2;
export const SUPABASE_ORG_BASE_EUR = 15;
export const VERCEL_SEAT_EUR = 20;

/** Coste marginal de infra por cliente/mes: Supabase Micro ~10 € + Vercel ~2 €. */
export const INFRA_PER_CLIENT_EUR = SUPABASE_MICRO_EUR + VERCEL_COMPUTE_EUR;

/** Overhead fijo compartido por toda la flota/mes: seat Vercel ~20 € + base org Supabase ~15 €. */
export const FIXED_OVERHEAD_EUR = SUPABASE_ORG_BASE_EUR + VERCEL_SEAT_EUR;
