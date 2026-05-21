import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { buildSystemPrompt } from "@/lib/prompts";
import { type FunnelStep, type FunnelWithSteps, getFunnel } from "@/lib/funnels";
import { type Profile, getProfile } from "@/lib/profiles";
import {
  createRun,
  markRunFinished,
  upsertMetric,
} from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

/**
 * Experimento: Simulación de embudo.
 *
 * Cada perfil recorre los pasos del embudo en orden. En cada paso el
 * Reasoner observa la pantalla y el "intent" esperado, considera los pasos
 * previos y devuelve perception + intent_match + effort + friction +
 * would_continue. Si would_continue=false, el recorrido termina y los pasos
 * siguientes no se ejecutan (dropoff en esa posición).
 */

// ============================================================
// Schemas de salida del LLM
// ============================================================

export const StepReasoningSchema = z.object({
  perception: z
    .string()
    .min(1)
    .describe("Qué crees que estás viendo en esta pantalla, en tu propia voz. 1-2 frases."),
  intent_match: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0..1 cuán claro está lo que tienes que hacer aquí. 1 = obvio, 0 = no tengo ni idea.",
    ),
  effort: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0..1 esfuerzo que te supone avanzar desde aquí. 0 = trivial, 1 = bloqueante.",
    ),
  friction: z
    .array(z.string())
    .describe("Lista corta de fricciones concretas. Array vacío si no hay."),
  would_continue: z
    .boolean()
    .describe("Si continuarías al paso siguiente o abandonarías el recorrido."),
  reasoning: z
    .string()
    .min(1)
    .describe("Justificación interna, 1 frase. Por qué decides eso."),
});
export type StepReasoning = z.infer<typeof StepReasoningSchema>;

// ============================================================
// Tipos públicos
// ============================================================

export type FunnelStepResponse = {
  profileId: string;
  stepId: string;
  position: number;
  perception: string;
  intent_match: number;
  effort: number;
  friction: string[];
  would_continue: boolean;
  reasoning: string;
};

export type FunnelRunSummary = {
  n: number;
  completion_rate: number;
  mean_effort: number;
  mean_intent_match: number;
  dropoff_by_step: Array<{
    position: number;
    name: string;
    reached: number;
    continued: number;
    continuation_rate: number;
    mean_effort: number | null;
    mean_intent_match: number | null;
    top_friction: { label: string; count: number }[];
  }>;
  top_friction_overall: { label: string; count: number }[];
};

// ============================================================
// 1) probeFunnelStep — Reasoner multimodal por paso
// ============================================================

export async function probeFunnelStep(
  profile: Profile,
  funnel: FunnelWithSteps,
  step: FunnelStep,
  prevResponses: FunnelStepResponse[],
): Promise<{ output: StepReasoning; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const prevSummary = prevResponses.length
    ? prevResponses
        .map(
          (r) =>
            `- Paso ${r.position} (${nameOfStep(funnel, r.stepId)}): vi «${r.perception}». Decisión: ${
              r.would_continue ? "continué" : "habría abandonado"
            }.`,
        )
        .join("\n")
    : "(este es el primer paso del recorrido)";

  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: StepReasoningSchema,
    system: buildFunnelSystem(profile, funnel, step),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Estás recorriendo el embudo "${funnel.name}" paso a paso.`,
              `Vas por el paso ${step.position} de ${funnel.steps.length}: "${step.name}".`,
              `Intent esperado por el equipo de producto en este paso: ${step.intent}`,
              "",
              "Pasos previos:",
              prevSummary,
              "",
              "Ahora ves esta pantalla. Reacciona con honestidad: ¿qué crees que es, qué se espera de ti, te supone esfuerzo, hay fricciones, continuarías?",
            ].join("\n"),
          },
          { type: "image", image: step.payload.image_url },
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

function nameOfStep(funnel: FunnelWithSteps, stepId: string): string {
  return funnel.steps.find((s) => s.id === stepId)?.name ?? "paso";
}

function buildFunnelSystem(
  profile: Profile,
  funnel: FunnelWithSteps,
  step: FunnelStep,
): string {
  return [
    buildSystemPrompt(profile),
    "",
    "## Tarea de este turno",
    `- Estás probando un embudo de UX llamado "${funnel.name}".`,
    `- Te enseñan UNA pantalla cada vez. No puedes saltar pasos ni mirar adelante.`,
    `- En este paso (${step.position}/${funnel.steps.length}) el equipo espera que: ${step.intent}`,
    "- 'perception' debe sonar a algo que tú dirías, no a un análisis UX.",
    "- 'intent_match' es cómo de claro está lo que tienes que hacer AQUÍ, no lo bien diseñada que está la pantalla en abstracto.",
    "- 'effort' es esfuerzo TUYO para avanzar (leer, escribir, decidir).",
    "- 'friction' lista barreras concretas que te cita el propio perfil (jerga, formularios largos, falta de prueba, etc.).",
    "- 'would_continue': si abandonarías el recorrido aquí, ponlo en false. Sé estricto: una persona normal abandona ante poca claridad.",
    "- NO completes información que la pantalla no dé. Si dudas, lo dices.",
  ].join("\n");
}

// ============================================================
// 2) Orquestador: runFunnelTest
// ============================================================

export type RunFunnelInput = {
  funnelId: string;
  profileIds: string[];
};

export type RunFunnelOutput = {
  runId: string;
  summary: FunnelRunSummary;
};

export async function runFunnelTest(
  input: RunFunnelInput,
): Promise<RunFunnelOutput> {
  const funnel = await getFunnel(input.funnelId);
  if (!funnel) throw new Error("Embudo no encontrado.");
  if (funnel.steps.length < 2) {
    throw new Error("El embudo necesita al menos 2 pasos.");
  }

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
    funnel_id: funnel.id,
    kind: "funnel",
    params: {
      funnelId: funnel.id,
      profileIds: profiles.map((p) => p.id),
    },
  });

  try {
    // Cada perfil corre en paralelo (chunks de 5 para no saturar gateway).
    const allResponses: FunnelStepResponse[] = [];
    for (const chunk of chunks(profiles, 5)) {
      const results = await Promise.all(
        chunk.map((profile) => simulateOneProfile(run.id, profile, funnel)),
      );
      for (const arr of results) allResponses.push(...arr);
    }

    const summary = summarize(funnel, profiles.length, allResponses);

    await upsertMetric({
      run_id: run.id,
      key: "completion_rate",
      value: summary.completion_rate,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: run.id,
      key: "mean_effort",
      value: summary.mean_effort,
      unit: "0..1",
    });
    await upsertMetric({
      run_id: run.id,
      key: "mean_intent_match",
      value: summary.mean_intent_match,
      unit: "0..1",
    });
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

async function simulateOneProfile(
  runId: string,
  profile: Profile,
  funnel: FunnelWithSteps,
): Promise<FunnelStepResponse[]> {
  const responses: FunnelStepResponse[] = [];
  for (const step of funnel.steps) {
    let probed;
    try {
      probed = await probeFunnelStep(profile, funnel, step, responses);
      await recordUsage({
        runId,
        scope: "probe_funnel",
        model: DEFAULT_MODEL,
        usage: probed.usage,
        meta: { latency_ms: probed.latencyMs, step: step.position },
      });
    } catch (err) {
      const e = err as Error & { text?: string; cause?: unknown };
      console.error("[probeFunnelStep] fallo", {
        profileId: profile.id,
        stepId: step.id,
        position: step.position,
        message: e.message,
        text: typeof e.text === "string" ? e.text.slice(0, 1500) : undefined,
      });
      throw err;
    }

    const row: FunnelStepResponse = {
      profileId: profile.id,
      stepId: step.id,
      position: step.position,
      perception: probed.output.perception,
      intent_match: probed.output.intent_match,
      effort: probed.output.effort,
      friction: probed.output.friction,
      would_continue: probed.output.would_continue,
      reasoning: probed.output.reasoning,
    };
    responses.push(row);

    const supa = getServerClient();
    const { error } = await supa.from("funnel_step_responses").upsert(
      {
        run_id: runId,
        profile_id: profile.id,
        step_id: step.id,
        position: step.position,
        perception: row.perception,
        intent_match: row.intent_match,
        effort: row.effort,
        friction: row.friction,
        would_continue: row.would_continue,
        reasoning: row.reasoning,
        meta: {
          model: DEFAULT_MODEL,
          latency_ms: probed.latencyMs,
        },
      },
      { onConflict: "run_id,profile_id,step_id" },
    );
    if (error) throw new Error(error.message);

    if (!row.would_continue) break;
  }
  return responses;
}

// ============================================================
// Utilidades
// ============================================================

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function summarize(
  funnel: FunnelWithSteps,
  totalProfiles: number,
  responses: FunnelStepResponse[],
): FunnelRunSummary {
  const totalSteps = funnel.steps.length;
  const lastPosition = totalSteps;
  const reachedLast = responses.filter(
    (r) => r.position === lastPosition && r.would_continue,
  );
  const completion_rate = totalProfiles === 0 ? 0 : reachedLast.length / totalProfiles;

  const mean_effort =
    responses.length === 0
      ? 0
      : responses.reduce((a, b) => a + b.effort, 0) / responses.length;
  const mean_intent_match =
    responses.length === 0
      ? 0
      : responses.reduce((a, b) => a + b.intent_match, 0) / responses.length;

  const dropoff_by_step = funnel.steps.map((s) => {
    const atStep = responses.filter((r) => r.stepId === s.id);
    const continued = atStep.filter((r) => r.would_continue).length;
    const meanE =
      atStep.length === 0
        ? null
        : atStep.reduce((a, b) => a + b.effort, 0) / atStep.length;
    const meanI =
      atStep.length === 0
        ? null
        : atStep.reduce((a, b) => a + b.intent_match, 0) / atStep.length;

    const freq = new Map<string, number>();
    for (const r of atStep) {
      for (const raw of r.friction) {
        const key = normalize(raw);
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    }
    const top_friction = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));

    return {
      position: s.position,
      name: s.name,
      reached: atStep.length,
      continued,
      continuation_rate: atStep.length === 0 ? 0 : continued / atStep.length,
      mean_effort: meanE,
      mean_intent_match: meanI,
      top_friction,
    };
  });

  const overall = new Map<string, number>();
  for (const r of responses) {
    for (const raw of r.friction) {
      const key = normalize(raw);
      overall.set(key, (overall.get(key) ?? 0) + 1);
    }
  }
  const top_friction_overall = [...overall.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  return {
    n: totalProfiles,
    completion_rate,
    mean_effort,
    mean_intent_match,
    dropoff_by_step,
    top_friction_overall,
  };
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ============================================================
// Lectura para la vista de resultados
// ============================================================

export async function listFunnelStepResponses(
  runId: string,
): Promise<FunnelStepResponse[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("funnel_step_responses")
    .select("*")
    .eq("run_id", runId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    profileId: r.profile_id as string,
    stepId: r.step_id as string,
    position: r.position as number,
    perception: r.perception as string,
    intent_match: r.intent_match as number,
    effort: r.effort as number,
    friction: (r.friction as string[]) ?? [],
    would_continue: r.would_continue as boolean,
    reasoning: (r.reasoning as string) ?? "",
  }));
}

export function summarizeFunnelResponses(
  funnel: FunnelWithSteps,
  totalProfiles: number,
  responses: FunnelStepResponse[],
): FunnelRunSummary {
  return summarize(funnel, totalProfiles, responses);
}
