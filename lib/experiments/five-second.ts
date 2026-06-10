import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { resolveImageForApi } from "@/lib/image-source";
import { buildSystemPrompt } from "@/lib/prompts";
import { type Profile, getProfile } from "@/lib/profiles";
import {
  createRun,
  markRunFinished,
  upsertMetric,
} from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";
import { type Target, getTarget } from "@/lib/targets";
import { recordUsage } from "@/lib/usage";

/**
 * Experimento: Test de claridad de 5 segundos.
 *
 * Simula que cada perfil ve la pantalla durante 5 s y la pantalla se oculta.
 * Mide recall, oferta percibida, claridad propia (0..1) y barreras.
 * Después, un LLM-as-judge compara recall contra main_promise y devuelve un
 * comprehension_rate (0..1) que evita comparaciones literales frágiles.
 */

// ============================================================
// Schemas de salida del LLM
// ============================================================

export const ProbeOutputSchema = z.object({
  recall: z
    .string()
    .min(1)
    .describe("Qué recuerdas tras ver la pantalla 5 s. Máximo 2 frases."),
  perceived_offer: z
    .string()
    .min(1)
    .describe("Qué crees que te ofrece la pantalla. 1 frase."),
  clarity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0..1 según lo claro que te quedó. 0 = no entendiste nada, 1 = clarísimo.",
    ),
  barriers_detected: z
    .array(z.string())
    .describe("Lista corta de fricciones percibidas. Array vacío si no hay."),
  behavior_class: z
    .enum(["optima", "fuga", "repesca"])
    .describe(
      "Clasifica TU propia conducta: 'optima' = entendiste el mensaje y seguirías hacia la acción; 'fuga' = carga cognitiva o promesa poco clara, abandonarías; 'repesca' = dudas o preguntas pero la intención sigue viva, podrías ser recuperado con el mensaje adecuado.",
    ),
});
export type ProbeOutput = z.infer<typeof ProbeOutputSchema>;

export const JudgeOutputSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "1 = el recuerdo del usuario recoge la promesa principal o algo más específico. 0 = el recuerdo no tiene relación con la promesa.",
    ),
  reasoning: z.string().min(1),
});
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

// ============================================================
// Tipos públicos
// ============================================================

export type FiveSecondResponse = {
  profileId: string;
  recall: string;
  perceived_offer: string;
  clarity: number;
  comprehension_rate: number | null;
  barriers_detected: string[];
  behavior_class: "optima" | "fuga" | "repesca" | null;
};

export type FiveSecondSummary = {
  n: number;
  mean_clarity: number;
  mean_comprehension: number | null;
  top_barriers: { label: string; count: number }[];
  behavior_counts: { optima: number; fuga: number; repesca: number };
};

// ============================================================
// 1) probeProfile : vista breve y oclusión, multimodal
// ============================================================

/**
 * Nota sobre modelos: arrancamos con DEFAULT_MODEL (Sonnet 4.6) también aquí.
 * El plan original pedía Opus 4.7 para mejor recall, pero hoy hay un mismatch
 * con generateObject + multimodal: Opus devuelve la respuesta envuelta en XML
 * de tool-call y el AI SDK no parsea el JSON interno. Revisar en v0.4.x.
 */
export async function probeProfile(
  profile: Profile,
  target: Target,
): Promise<{
  output: ProbeOutput;
  latencyMs: number;
  usage: unknown;
}> {
  const startedAt = Date.now();
  const image = await resolveImageForApi(target.payload.image_url);
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: ProbeOutputSchema,
    system: buildProbeSystem(profile),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Acabas de ver la siguiente pantalla durante exactamente 5 segundos antes de que la ocultaran.",
              "No la puedes mirar de nuevo. Sé honesto sobre lo que recuerdas (puede ser poco). No completes lo que no viste.",
            ].join(" "),
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

function buildProbeSystem(profile: Profile): string {
  return [
    buildSystemPrompt(profile),
    "",
    "## Tarea de este turno",
    "- Estás en un test de claridad de 5 segundos. Te enseñan una pantalla, la quitan, y debes responder con lo que recuerdas.",
    "- 'recall' y 'perceived_offer' deben ser cortos, en tu voz, sin meta-comentarios.",
    "- 'clarity' es subjetivo: cómo te sentiste tú con la pantalla, no una nota objetiva.",
    "- 'barriers_detected' lista fricciones concretas (jerga, exceso de info, promesas vagas, falta de prueba, etc.). Vacío si no las viste.",
    "- Si no entendiste algo, dilo. NO completes basándote en lo que un banco/landing 'normalmente' tendría.",
  ].join("\n");
}

// ============================================================
// 2) judgeComprehension : LLM-as-judge
// ============================================================

export async function judgeComprehension(
  mainPromise: string,
  recall: string,
): Promise<{ output: JudgeOutput; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: JudgeOutputSchema,
    system: [
      "Eres un juez calibrado de tests de claridad de 5 segundos.",
      "Vas a comparar la 'promesa principal' definida por el equipo de producto contra el 'recall' que produjo un usuario sintético tras ver la pantalla 5 segundos.",
      "Devuelve un score 0..1:",
      "- 1.0 = el recall recoge la promesa principal o algo más específico de la misma.",
      "- 0.6-0.8 = el recall recoge una parte central de la promesa, con omisiones.",
      "- 0.3-0.5 = el recall toca un elemento periférico (precio, marca, sector) pero pierde el qué.",
      "- 0.0-0.2 = no hay relación o el recall contradice la promesa.",
      "Sé estricto con jerga: si la promesa es específica y el recall es genérico, baja el score. No premies adivinanzas.",
      "Devuelve también 'reasoning' (1-2 frases) justificando el score.",
    ].join("\n"),
    prompt: [
      `Promesa principal: ${mainPromise}`,
      `Recall del usuario: ${recall}`,
    ].join("\n"),
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

// ============================================================
// 3) Orquestador: runFiveSecondTest
// ============================================================

export type RunFiveSecondInput = {
  targetId: string;
  profileIds: string[];
};

export type RunFiveSecondOutput = {
  runId: string;
  summary: FiveSecondSummary;
};

export async function runFiveSecondTest(
  input: RunFiveSecondInput,
): Promise<RunFiveSecondOutput> {
  const target = await getTarget(input.targetId);
  if (!target) throw new Error("Target no encontrado.");
  if (target.payload.kind !== "5s_test") {
    throw new Error("El target no es de tipo 5s_test.");
  }

  const profiles: Profile[] = [];
  for (const pid of input.profileIds) {
    const p = await getProfile(pid);
    if (!p) throw new Error(`Perfil ${pid} no encontrado.`);
    profiles.push(p);
  }
  if (profiles.length === 0) throw new Error("Sin perfiles para evaluar.");
  if (profiles.length > 20) throw new Error("Máximo 20 perfiles por run.");

  // Un run por experimento. profile_id = primer perfil por convención (la
  // columna no acepta null y la tabla está pensada para 1 perfil; aquí la
  // usamos como "owner" del run aunque la N-aridad real esté en
  // five_second_responses).
  const run = await createRun({
    profile_id: profiles[0].id,
    target_id: target.id,
    kind: "5s_test",
    params: { profileIds: profiles.map((p) => p.id) },
  });

  try {
    const responses: FiveSecondResponse[] = [];
    for (const chunk of chunks(profiles, 5)) {
      const results = await Promise.all(
        chunk.map((profile) => probeOne(run.id, profile, target)),
      );
      responses.push(...results);
    }

    const summary = summarize(responses);

    await upsertMetric({
      run_id: run.id,
      key: "mean_clarity",
      value: summary.mean_clarity,
      unit: "0..1",
    });
    if (summary.mean_comprehension !== null) {
      await upsertMetric({
        run_id: run.id,
        key: "mean_comprehension",
        value: summary.mean_comprehension,
        unit: "0..1",
      });
    }
    await upsertMetric({
      run_id: run.id,
      key: "n",
      value: summary.n,
      unit: "count",
    });

    await markRunFinished(run.id, "done");
    return { runId: run.id, summary };
  } catch (err) {
    await markRunFinished(run.id, "error").catch(() => {});
    throw err;
  }
}

async function probeOne(
  runId: string,
  profile: Profile,
  target: Target,
): Promise<FiveSecondResponse> {
  let probed;
  try {
    probed = await probeProfile(profile, target);
    await recordUsage({
      runId,
      scope: "probe_5s",
      model: DEFAULT_MODEL,
      usage: probed.usage,
      meta: { latency_ms: probed.latencyMs },
    });
  } catch (err) {
    const e = err as Error & {
      text?: string;
      cause?: unknown;
      response?: unknown;
    };
    console.error("[probeProfile] fallo", {
      profileId: profile.id,
      targetId: target.id,
      imageUrl: target.payload.image_url.slice(0, 100),
      message: e.message,
      text: typeof e.text === "string" ? e.text.slice(0, 1500) : undefined,
      cause:
        e.cause && typeof e.cause === "object"
          ? JSON.stringify(e.cause).slice(0, 800)
          : e.cause,
    });
    throw err;
  }

  let comprehension: JudgeOutput | null = null;
  let judgeLatency: number | null = null;
  try {
    const judged = await judgeComprehension(
      target.payload.main_promise,
      probed.output.recall,
    );
    comprehension = judged.output;
    judgeLatency = judged.latencyMs;
    await recordUsage({
      runId,
      scope: "judge_5s",
      model: DEFAULT_MODEL,
      usage: judged.usage,
      meta: { latency_ms: judged.latencyMs },
    });
  } catch {
    // Si el judge falla, dejamos comprehension_rate=null y seguimos.
  }

  const supa = getServerClient();
  const row = {
    run_id: runId,
    profile_id: profile.id,
    recall: probed.output.recall,
    perceived_offer: probed.output.perceived_offer,
    clarity: probed.output.clarity,
    comprehension_rate: comprehension?.score ?? null,
    barriers_detected: probed.output.barriers_detected,
    behavior_class: probed.output.behavior_class,
    meta: {
      model_probe: DEFAULT_MODEL,
      model_judge: DEFAULT_MODEL,
      latency_ms_probe: probed.latencyMs,
      latency_ms_judge: judgeLatency,
      judge_reasoning: comprehension?.reasoning ?? null,
    },
  };
  const { error } = await supa
    .from("five_second_responses")
    .upsert(row, { onConflict: "run_id,profile_id" });
  if (error) throw new Error(error.message);

  return {
    profileId: profile.id,
    recall: probed.output.recall,
    perceived_offer: probed.output.perceived_offer,
    clarity: probed.output.clarity,
    comprehension_rate: comprehension?.score ?? null,
    barriers_detected: probed.output.barriers_detected,
    behavior_class: probed.output.behavior_class,
  };
}

// ============================================================
// Utilidades
// ============================================================

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function summarize(responses: FiveSecondResponse[]): FiveSecondSummary {
  const n = responses.length;
  const meanClarity = responses.reduce((a, b) => a + b.clarity, 0) / n;
  const compValues = responses
    .map((r) => r.comprehension_rate)
    .filter((v): v is number => typeof v === "number");
  const meanComp =
    compValues.length === 0
      ? null
      : compValues.reduce((a, b) => a + b, 0) / compValues.length;

  const freq = new Map<string, number>();
  for (const r of responses) {
    for (const raw of r.barriers_detected) {
      const key = normalizeBarrier(raw);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const topBarriers = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  const behavior_counts = { optima: 0, fuga: 0, repesca: 0 };
  for (const r of responses) {
    if (r.behavior_class === "optima") behavior_counts.optima++;
    else if (r.behavior_class === "fuga") behavior_counts.fuga++;
    else if (r.behavior_class === "repesca") behavior_counts.repesca++;
  }

  return {
    n,
    mean_clarity: meanClarity,
    mean_comprehension: meanComp,
    top_barriers: topBarriers,
    behavior_counts,
  };
}

function normalizeBarrier(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ============================================================
// Lectura: responses + summary por runId (para la vista de resultados)
// ============================================================

export async function listFiveSecondResponses(
  runId: string,
): Promise<FiveSecondResponse[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("five_second_responses")
    .select("*")
    .eq("run_id", runId)
    .order("clarity", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    profileId: r.profile_id as string,
    recall: r.recall as string,
    perceived_offer: r.perceived_offer as string,
    clarity: r.clarity as number,
    comprehension_rate: (r.comprehension_rate as number | null) ?? null,
    barriers_detected: (r.barriers_detected as string[]) ?? [],
    behavior_class: (r.behavior_class as "optima" | "fuga" | "repesca" | null) ?? null,
  }));
}

export function summarizeResponses(
  responses: FiveSecondResponse[],
): FiveSecondSummary {
  if (responses.length === 0) {
    return {
      n: 0,
      mean_clarity: 0,
      mean_comprehension: null,
      top_barriers: [],
      behavior_counts: { optima: 0, fuga: 0, repesca: 0 },
    };
  }
  return summarize(responses);
}
