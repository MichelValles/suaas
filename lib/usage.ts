import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type UsageScope =
  | "probe_5s"
  | "judge_5s"
  | "probe_funnel"
  | "reasoner_chat"
  | "talker_chat"
  | "copy_resonance"
  | "pricing_react"
  | "campaign_probe"
  | "campaign_landing"
  | "campaign_ideal"
  | "campaign_judge"
  | "campaign_synthesis"
  | "onboard_synthesize"
  | "geo_probe"
  | "momentum_probe"
  | "seed_brief"
  | "batch_intent";

type RawUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
} | null | undefined;

/**
 * Extrae prompt/completion/total tokens de la estructura `usage` que devuelve
 * el AI SDK. Distintos providers y versiones usan keys diferentes; soportamos
 * ambas convenciones (camelCase y la nueva input/output).
 */
function normalizeUsage(u: unknown): {
  prompt: number | null;
  completion: number | null;
  total: number | null;
} {
  if (!u || typeof u !== "object") {
    return { prompt: null, completion: null, total: null };
  }
  const r = u as RawUsage;
  const prompt =
    typeof r?.promptTokens === "number"
      ? r.promptTokens
      : typeof r?.inputTokens === "number"
        ? r.inputTokens
        : null;
  const completion =
    typeof r?.completionTokens === "number"
      ? r.completionTokens
      : typeof r?.outputTokens === "number"
        ? r.outputTokens
        : null;
  const total =
    typeof r?.totalTokens === "number"
      ? r.totalTokens
      : prompt !== null && completion !== null
        ? prompt + completion
        : null;
  return { prompt, completion, total };
}

/**
 * Persiste una fila de consumo. Falla en silencio si Supabase no está
 * configurado o si la inserción falla: la telemetría no debe romper el flujo.
 */
export async function recordUsage(input: {
  runId?: string | null;
  scope: UsageScope;
  model: string;
  usage: unknown;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { prompt, completion, total } = normalizeUsage(input.usage);
  try {
    const supa = getServerClient();
    await supa.from("gateway_usage").insert({
      run_id: input.runId ?? null,
      scope: input.scope,
      model: input.model,
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: total,
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.warn("[recordUsage] insert failed", (err as Error).message);
  }
}

// ============================================================
// Presupuesto y estimación
// ============================================================

/**
 * Tamaño de página para las lecturas de gateway_usage. PostgREST devuelve
 * como máximo 1.000 filas por petición (db-max-rows): sin paginar, el
 * presupuesto y los agregados se calculan sobre un subconjunto en cuanto
 * hay carga (un run de campaña genera cientos de filas), que es justo
 * cuando el freno más importa.
 */
const USAGE_PAGE = 1000;

/** Tokens consumidos en las últimas 24 horas (todas las llamadas, todos los scopes). */
export async function getTokensLast24h(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supa = getServerClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let total = 0;
  for (let from = 0; ; from += USAGE_PAGE) {
    const { data, error } = await supa
      .from("gateway_usage")
      .select("prompt_tokens, completion_tokens, total_tokens")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + USAGE_PAGE - 1);
    if (error) {
      console.warn("[getTokensLast24h] select failed", error.message);
      return total;
    }
    for (const r of data ?? []) {
      total +=
        (r.total_tokens as number | null) ??
        ((r.prompt_tokens as number | null) ?? 0) +
          ((r.completion_tokens as number | null) ?? 0);
    }
    if (!data || data.length < USAGE_PAGE) return total;
  }
}

export type ScopeAverage = {
  scope: UsageScope;
  /** Media de tokens por llamada en la muestra. 0 si no hay histórico. */
  avgTokens: number;
  /** Media de latencia (ms) si las filas guardan meta.latency_ms. */
  avgLatencyMs: number | null;
  n: number;
};

/**
 * Medias empíricas por scope sobre las últimas `sample` llamadas de cada uno.
 * Alimenta la estimación de coste previa al lanzamiento de un run.
 */
export async function getScopeAverages(
  scopes: UsageScope[],
  sample = 200,
): Promise<ScopeAverage[]> {
  if (!isSupabaseConfigured()) {
    return scopes.map((scope) => ({ scope, avgTokens: 0, avgLatencyMs: null, n: 0 }));
  }
  const supa = getServerClient();
  return Promise.all(
    scopes.map(async (scope) => {
      const { data, error } = await supa
        .from("gateway_usage")
        .select("prompt_tokens, completion_tokens, total_tokens, meta")
        .eq("scope", scope)
        .order("created_at", { ascending: false })
        .limit(sample);
      if (error || !data || data.length === 0) {
        return { scope, avgTokens: 0, avgLatencyMs: null, n: 0 };
      }
      let tokens = 0;
      let latencySum = 0;
      let latencyN = 0;
      let counted = 0;
      for (const r of data) {
        // Las filas de llamadas fallidas (meta.failed, v0.47.2) suelen traer
        // tokens null: contarlas como 0 deflactaría la media y haría que la
        // estimación de coste pre-run infraestimara justo tras un incidente.
        if ((r.meta as Record<string, unknown> | null)?.failed === true) continue;
        counted += 1;
        tokens +=
          (r.total_tokens as number | null) ??
          ((r.prompt_tokens as number | null) ?? 0) +
            ((r.completion_tokens as number | null) ?? 0);
        const lat = (r.meta as Record<string, unknown> | null)?.latency_ms;
        if (typeof lat === "number") {
          latencySum += lat;
          latencyN += 1;
        }
      }
      if (counted === 0) {
        return { scope, avgTokens: 0, avgLatencyMs: null, n: 0 };
      }
      return {
        scope,
        avgTokens: tokens / counted,
        avgLatencyMs: latencyN > 0 ? latencySum / latencyN : null,
        n: counted,
      };
    }),
  );
}

// ============================================================
// Lectura agregada (para la página /tokens)
// ============================================================

export type UsageBucket = {
  key: string;
  prompt: number;
  completion: number;
  total: number;
  calls: number;
};

export type UsageSummary = {
  total: { prompt: number; completion: number; total: number; calls: number };
  byModel: UsageBucket[];
  byScope: UsageBucket[];
  last7d: { date: string; total: number; calls: number }[];
  lastUpdated: string | null;
};

export async function getUsageSummary(): Promise<UsageSummary> {
  const empty: UsageSummary = {
    total: { prompt: 0, completion: 0, total: 0, calls: 0 },
    byModel: [],
    byScope: [],
    last7d: [],
    lastUpdated: null,
  };
  if (!isSupabaseConfigured()) return empty;

  const supa = getServerClient();

  type Row = {
    created_at: string;
    scope: string;
    model: string;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
  };

  // Paginado: sin .range() PostgREST corta a 1.000 filas y los totales de
  // /tokens se congelarían al llegar a ese histórico.
  const rows: Row[] = [];
  for (let from = 0; ; from += USAGE_PAGE) {
    const { data, error } = await supa
      .from("gateway_usage")
      .select("created_at, scope, model, prompt_tokens, completion_tokens, total_tokens")
      .order("created_at", { ascending: false })
      .range(from, from + USAGE_PAGE - 1);
    if (error) {
      console.warn("[getUsageSummary] select failed", error.message);
      return empty;
    }
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < USAGE_PAGE) break;
  }
  if (rows.length === 0) return empty;
  const total = { prompt: 0, completion: 0, total: 0, calls: rows.length };
  const byModelMap = new Map<string, UsageBucket>();
  const byScopeMap = new Map<string, UsageBucket>();
  const dayMap = new Map<string, { total: number; calls: number }>();
  const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const r of rows) {
    const p = r.prompt_tokens ?? 0;
    const c = r.completion_tokens ?? 0;
    const t = r.total_tokens ?? p + c;
    total.prompt += p;
    total.completion += c;
    total.total += t;

    const m = byModelMap.get(r.model) ?? {
      key: r.model,
      prompt: 0,
      completion: 0,
      total: 0,
      calls: 0,
    };
    m.prompt += p;
    m.completion += c;
    m.total += t;
    m.calls += 1;
    byModelMap.set(r.model, m);

    const s = byScopeMap.get(r.scope) ?? {
      key: r.scope,
      prompt: 0,
      completion: 0,
      total: 0,
      calls: 0,
    };
    s.prompt += p;
    s.completion += c;
    s.total += t;
    s.calls += 1;
    byScopeMap.set(r.scope, s);

    if (new Date(r.created_at).getTime() >= sevenAgo) {
      const day = r.created_at.slice(0, 10);
      const d = dayMap.get(day) ?? { total: 0, calls: 0 };
      d.total += t;
      d.calls += 1;
      dayMap.set(day, d);
    }
  }

  const last7d = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    byModel: [...byModelMap.values()].sort((a, b) => b.total - a.total),
    byScope: [...byScopeMap.values()].sort((a, b) => b.total - a.total),
    last7d,
    lastUpdated: rows[0]?.created_at ?? null,
  };
}

// ============================================================
// AI Gateway: créditos restantes
// ============================================================

export type GatewayCredits = {
  ok: boolean;
  balance: number | null;
  totalUsed: number | null;
  raw: unknown;
  error: string | null;
};

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Consulta el endpoint de créditos del Vercel AI Gateway. La forma exacta
 * de la respuesta puede variar según el plan y versión; guardamos `raw` para
 * que la página pueda mostrar lo que llegue aunque no encajemos los campos.
 */
export async function getGatewayCredits(): Promise<GatewayCredits> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) {
    return {
      ok: false,
      balance: null,
      totalUsed: null,
      raw: null,
      error:
        "AI Gateway sin API key visible. Las llamadas a modelos siguen funcionando en Vercel vía OIDC; sólo falla la consulta de saldo. Enlaza AI Gateway al proyecto desde el dashboard (Storage → AI Gateway → Connect to project) para verlo aquí.",
    };
  }
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const raw = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      return {
        ok: false,
        balance: null,
        totalUsed: null,
        raw,
        error: `HTTP ${res.status}`,
      };
    }
    const r = (raw ?? {}) as Record<string, unknown>;
    const balance =
      coerceNumber(r.balance) ??
      coerceNumber(r.credits) ??
      coerceNumber(r.remaining) ??
      coerceNumber(r.creditBalance) ??
      coerceNumber(r.available) ??
      null;
    const totalUsed =
      coerceNumber(r.total_used) ??
      coerceNumber(r.used) ??
      coerceNumber(r.totalUsed) ??
      null;
    return { ok: true, balance, totalUsed, raw, error: null };
  } catch (err) {
    return {
      ok: false,
      balance: null,
      totalUsed: null,
      raw: null,
      error: (err as Error).message,
    };
  }
}
