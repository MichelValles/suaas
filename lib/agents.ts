import { generateObject, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";
import type { Profile } from "@/lib/profiles";
import { buildSystemPrompt } from "@/lib/prompts";

/**
 * Arquitectura Talker-Reasoner.
 * Sigue docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md, sección 3.
 *
 * - Reasoner (Sistema 2): analítico, lento. Modela el estado interno del
 *   usuario, detecta barreras, define plan de respuesta.
 * - Talker (Sistema 1): fluido, rápido. Habla en voz del perfil siguiendo
 *   el plan del Reasoner. Emite tokens en streaming.
 */

export const ReasonerPlanSchema = z.object({
  state: z.string().describe(
    "Estado interno percibido del usuario en este turno: energía, atención, emoción, prisa. Máximo 2 frases.",
  ),
  intent: z.string().describe(
    "Qué quiere conseguir el usuario en este turno. 1 frase.",
  ),
  barriers_detected: z
    .array(z.string())
    .describe(
      "Barreras COM-B activas en este turno, citando capability/opportunity/motivation cuando aplique.",
    ),
  tone: z.enum([
    "seco",
    "interesado",
    "escéptico",
    "frustrado",
    "curioso",
    "impaciente",
    "neutral",
  ]),
  effort: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Esfuerzo percibido por el usuario en este turno: 0 = fluido, 1 = a punto de abandonar.",
    ),
  momentum: z
    .object({
      intensity: z
        .number()
        .min(0)
        .max(1)
        .describe(
          "Intensidad del intent: 0 = sin intención de avanzar hacia la acción, 1 = acción inminente.",
        ),
      direction: z
        .enum(["approaching", "stable", "drifting"])
        .describe(
          "Dirección: 'approaching' = se acerca a la acción objetivo, 'stable' = sin cambio apreciable, 'drifting' = se aleja o desconecta.",
        ),
      velocity: z
        .enum(["accelerating", "steady", "decelerating"])
        .describe(
          "Velocidad del cambio entre turnos: 'accelerating' = momentum creciendo, 'steady' = estable, 'decelerating' = disminuyendo.",
        ),
    })
    .describe("Intent Momentum del usuario en este turno (Gravity Model)."),
  social_friction: z
    .object({
      intensity: z
        .number()
        .min(0)
        .max(1)
        .describe(
          "Fricción simbólica o de clase percibida en este turno: 0 = el perfil se siente legitimado y cómodo con el registro de la interacción; 1 = disonancia de clase, exclusión cultural o pérdida de legitimidad fuerte. Es un juicio declarativo, no una medida validada.",
        ),
      trigger: z
        .string()
        .describe(
          "Qué la provoca, o 'ninguna'. Ej.: jerga excluyente, paternalismo de marca, asimetría al pedir datos personales sin dar valor a cambio, sensación de ser tratado como un 'lead' genérico y no como alguien cualificado.",
        ),
      habitus_note: z
        .string()
        .describe(
          "Lectura en clave de habitus y capital cultural (Bourdieu): cómo el origen social y los esquemas de percepción del perfil reaccionan al registro de la interacción. 1 frase. Vacío si no aplica.",
        ),
    })
    .describe(
      "Lente sociológica del Sistema 2: fricción simbólica más allá de las barreras funcionales COM-B. Juicio declarativo del LLM, sin validación externa.",
    ),
  plan: z.string().describe(
    "Pauta concreta para el Talker: cómo debe responder en voz del perfil. 1-2 frases. No incluir el texto literal. Si social_friction es alta, refléjala aquí para que el Talker la module en la voz del perfil.",
  ),
});

export type ReasonerPlan = z.infer<typeof ReasonerPlanSchema>;

export type ReasonerInput = {
  profile: Profile;
  history: ModelMessage[];
  message: string;
};

export type ReasonerResult = {
  plan: ReasonerPlan;
  latencyMs: number;
  model: string;
  usage: unknown;
};

export async function reason(input: ReasonerInput): Promise<ReasonerResult> {
  const startedAt = Date.now();
  const result = await generateObject({
    model: REASONER_MODEL,
    schema: ReasonerPlanSchema,
    system: buildReasonerSystem(input.profile),
    messages: [
      ...input.history,
      { role: "user", content: input.message },
    ],
  });
  return {
    plan: result.object,
    latencyMs: Date.now() - startedAt,
    model: REASONER_MODEL,
    usage: result.usage ?? null,
  };
}

export type TalkerInput = {
  profile: Profile;
  plan: ReasonerPlan;
  history: ModelMessage[];
  message: string;
};

export function talkStream(input: TalkerInput) {
  return streamText({
    model: DEFAULT_MODEL,
    system: buildTalkerSystem(input.profile, input.plan),
    messages: [
      ...input.history,
      { role: "user", content: input.message },
    ],
  });
}

// ============================================================
// Prompt builders
// ============================================================

function buildReasonerSystem(profile: Profile): string {
  return [
    "Eres un MODELADOR cognitivo. Tu trabajo es analizar el estado interno del usuario y producir un plan estructurado para el Talker que hablará a continuación. No respondes al usuario. No le hablas.",
    "",
    "## Perfil del usuario (no se lo digas, sólo úsalo)",
    buildSystemPrompt(profile),
    "",
    "## Reglas",
    "- Sé conciso y específico. No moralices, no recomiendes.",
    "- 'effort' calibrado contra la fricción del último mensaje (0 = sin fricción, 1 = abandonaría ya).",
    "- Si el usuario no entiende algo, refléjalo en 'barriers_detected' citando 'capability'.",
    "- Si el usuario está distraído o cansado según su perfil, refléjalo en 'state'.",
    "- 'social_friction': opera además como sociólogo. Más allá de las barreras funcionales COM-B, evalúa si el registro de la interacción (el tono, la jerga, las peticiones de datos, el trato de la marca) genera disonancia de clase, exclusión cultural o pérdida de legitimidad, leyendo el habitus y el capital cultural del perfil (Bourdieu). Ej.: pedir el teléfono a cambio de un PDF sin dar el precio se lee como táctica extractiva que un perfil sofisticado percibe como un insulto a su análisis previo; la jerga médica sin explicar excluye a un perfil de baja alfabetización. Si no hay fricción simbólica, intensity 0 y trigger 'ninguna'. NO la fuerces: la mayoría de turnos neutros no la tienen.",
    "- 'plan' es instrucción interna, NUNCA texto literal a decir.",
  ].join("\n");
}

function buildTalkerSystem(profile: Profile, plan: ReasonerPlan): string {
  return [
    buildSystemPrompt(profile),
    "",
    "## Plan interno de este turno (no lo cites, solo aplícalo)",
    `- Estado percibido: ${plan.state}`,
    `- Intento: ${plan.intent}`,
    `- Tono: ${plan.tone}`,
    plan.barriers_detected.length
      ? `- Barreras activas: ${plan.barriers_detected.join("; ")}`
      : "- Sin barreras explícitas en este turno.",
    `- Pauta: ${plan.plan}`,
    "",
    "Responde en una sola intervención, en voz del perfil, máximo 4 frases. No digas 'como [perfil]', no anuncies el tono, no listes barreras.",
  ].join("\n");
}
