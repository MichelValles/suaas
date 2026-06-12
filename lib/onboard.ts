import { generateObject } from "ai";
import { z } from "zod";
import { REASONER_MODEL } from "@/lib/gateway";
import {
  HEXACO_ITEMS,
  isComplete,
  mapToOcean,
  scoreHexaco,
  type HexacoAnswers,
  type HexacoScores,
  type OceanScores,
} from "@/lib/hexaco";
import { createProfile, ProfileInputSchema, type Profile } from "@/lib/profiles";
import { recordUsage } from "@/lib/usage";

/**
 * Onboard público: genera un perfil calibrado a partir de las
 * respuestas que un humano real contesta en /onboard.
 *
 * Modelo híbrido C (ver docs/SIGUIENTE-PASO.md):
 *   - Big Five se calcula determinísticamente desde HEXACO (no se delega al
 *     LLM, evita variabilidad inter-run).
 *   - COM-B y backstory se delegan al LLM (Opus), que recibe las dos
 *     respuestas abiertas como anclas TEXTUALES. El LLM ejerce de costurero,
 *     no de creador: tiene prohibido inventar detalles que no estén en los
 *     datos que se le pasan.
 *   - Honestidad-Humildad (HEXACO H) no se persiste como rasgo pero se pasa
 *     como contexto para que aparezca en la backstory si es extrema.
 */

// ============================================================
// Schemas (zod)
// ============================================================

export const OnboardGenderSchema = z.enum(["m", "f", "nb", "prefer_not"]);
export type OnboardGender = z.infer<typeof OnboardGenderSchema>;

export const OnboardIncomeSchema = z.enum([
  "<20k",
  "20-35k",
  "35-50k",
  "50-80k",
  ">80k",
  "prefer_not",
]);
export type OnboardIncome = z.infer<typeof OnboardIncomeSchema>;

export const OnboardDemoSchema = z.object({
  age: z.number().int().min(18).max(99),
  gender: OnboardGenderSchema,
  geo: z.string().min(2).max(80),
  income: OnboardIncomeSchema,
});
export type OnboardDemo = z.infer<typeof OnboardDemoSchema>;

export const OnboardPayloadSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(60),
  demo: OnboardDemoSchema,
  answers: z.record(z.string(), z.number().int().min(1).max(5)),
  open_routine: z.string().trim().min(10, "Cuéntame un poco más").max(400),
  open_friction: z.string().trim().min(10, "Cuéntame un poco más").max(400),
  hp: z.string().max(0).optional().default(""), // honeypot: debe llegar vacío
});
export type OnboardPayload = z.infer<typeof OnboardPayloadSchema>;

// ============================================================
// Schema de salida del LLM
// ============================================================

const SynthOutputSchema = z.object({
  occupation: z
    .string()
    .min(2)
    .max(80)
    .describe(
      "Ocupación principal extraída TEXTUAL del relato del usuario. En castellano, coloquial. Máx 80 chars.",
    ),
  com_b_barriers: z.object({
    capability: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Barreras de capacidad: 1-3 frases CORTAS sacadas del relato (lo que no sabe hacer, dónde le cuesta entender). Si no aparecen, infiérelas conservadoramente desde HEXACO C bajo.",
      ),
    opportunity: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Barreras de oportunidad: 1-3 frases CORTAS sacadas del relato (contexto, tiempo, soporte social, frustraciones de UX). Cita frases del usuario si están.",
      ),
    motivation: z
      .array(z.string())
      .min(1)
      .max(3)
      .describe(
        "Barreras de motivación: 1-3 frases CORTAS sacadas del relato (miedos, escepticismos, prioridades). Refleja HEXACO H si es claramente alta o baja.",
      ),
  }),
  backstory: z
    .string()
    .min(80)
    .max(600)
    .describe(
      "120-220 caracteres. Tercera persona. INTEGRA las frases textuales del usuario sobre su rutina y sus frustraciones online. No inventes detalles que no estén en los datos. Sin meta-comentarios, sin clichés.",
    ),
});

// ============================================================
// Mappers entre OnboardPayload y el formato de profile
// ============================================================

function mapGender(g: OnboardGender): "hombre" | "mujer" | "otro" {
  if (g === "m") return "hombre";
  if (g === "f") return "mujer";
  return "otro";
}

function mapIncome(i: OnboardIncome): string | undefined {
  if (i === "prefer_not") return undefined;
  return i;
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// ============================================================
// Sintetizador
// ============================================================

export type SynthEvent =
  | { phase: "scoring" }
  | { phase: "reasoning" }
  | { phase: "composing" }
  | { phase: "saving" }
  | { done: true; profileId: string }
  | { error: true; message: string };

/**
 * Ejecuta el pipeline completo de síntesis. Es un async generator para que
 * el endpoint /api/onboard/submit pueda streamear frases narrativas mientras
 * se ejecuta (efecto guau del loading).
 */
export async function* synthesizeProfile(
  payload: OnboardPayload,
): AsyncGenerator<SynthEvent> {
  // 1) Validación + honeypot
  const data = OnboardPayloadSchema.parse(payload);
  if (data.hp && data.hp.length > 0) {
    yield { error: true, message: "Invalid submission." };
    return;
  }
  if (!isComplete(data.answers as HexacoAnswers)) {
    yield { error: true, message: "Cuestionario incompleto." };
    return;
  }

  // 2) Scoring determinista
  yield { phase: "scoring" };
  const hexaco = scoreHexaco(data.answers as HexacoAnswers);
  const ocean = mapToOcean(hexaco);

  // 3) LLM: extrae occupation, COM-B y backstory
  yield { phase: "reasoning" };
  const llmStart = Date.now();
  let synth: z.infer<typeof SynthOutputSchema>;
  try {
    const result = await generateObject({
      model: REASONER_MODEL,
      schema: SynthOutputSchema,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(data, hexaco, ocean),
    });
    synth = result.object;
    await recordUsage({
      scope: "onboard_synthesize",
      model: REASONER_MODEL,
      usage: result.usage ?? null,
      meta: {
        kind: "onboard",
        latency_ms: Date.now() - llmStart,
        name: data.name,
        hexaco,
      },
    }).catch(() => {});
  } catch (err) {
    console.error("[onboard/synthesize] LLM error", (err as Error).message);
    yield { error: true, message: "Error al procesar. Inténtalo de nuevo." };
    return;
  }

  // 4) Composición final + insert
  yield { phase: "composing" };
  const profileInput = ProfileInputSchema.parse({
    name: data.name,
    demographics: {
      age: data.demo.age,
      gender: mapGender(data.demo.gender),
      occupation: synth.occupation,
      income_band: mapIncome(data.demo.income),
      geo: data.demo.geo,
    },
    big_five: ocean,
    com_b_barriers: synth.com_b_barriers,
    backstory: synth.backstory,
    source: "self_report",
  });

  yield { phase: "saving" };
  try {
    const profile: Profile = await createProfile(profileInput);
    yield { done: true, profileId: profile.id };
  } catch (err) {
    yield { error: true, message: (err as Error).message };
  }
}

// ============================================================
// Prompt builders
// ============================================================

function buildSystemPrompt(): string {
  return [
    "Eres un investigador UX que recibe respuestas REALES de un humano contestando un cuestionario en su móvil.",
    "Tu trabajo es transformar esas respuestas en un perfil calibrado para nuestra plataforma SUAAS.",
    "",
    "## Reglas de fidelidad (críticas)",
    "- INTEGRA frases TEXTUALES del usuario en la backstory y en las barreras COM-B. No las parafrasees a no ser que sea estrictamente necesario.",
    "- NO INVENTES detalles que no estén en los datos. Si no sabes qué hace los fines de semana, no lo digas.",
    "- NO uses clichés tipo «vive con su pareja en un piso luminoso», «disfruta del cine de autor», «busca cambiar el mundo».",
    "- Los rasgos Big Five ya están CALCULADOS, no los recalcules ni los menciones numéricamente en la backstory.",
    "- Si Honestidad-Humildad (HEXACO H) es claramente alta o baja, reflejalo NARRATIVAMENTE (no técnicamente).",
    "- COM-B: máximo 3 frases cortas por categoría, ancladas en el texto del usuario.",
    "- Backstory: 120-220 caracteres, tercera persona, sin meta-comentarios.",
    "- Idioma: castellano de España, natural, sin tecnicismos LinkedIn.",
  ].join("\n");
}

function buildUserPrompt(
  data: OnboardPayload,
  hexaco: HexacoScores,
  ocean: OceanScores,
): string {
  const demoLines = [
    `Nombre: ${data.name}`,
    `Edad: ${data.demo.age}`,
    `Género: ${mapGender(data.demo.gender)}`,
    `Ubicación: ${data.demo.geo}`,
    data.demo.income === "prefer_not"
      ? "Ingresos: no quiere decirlo"
      : `Ingresos: ${data.demo.income}`,
  ];

  const hexacoLines = [
    `Honestidad-Humildad: ${fmtPct(hexaco.h)}`,
    `Emocionalidad: ${fmtPct(hexaco.e)} (a más alta, más reactivo/a emocionalmente)`,
    `eXtraversión: ${fmtPct(hexaco.x)}`,
    `Amabilidad: ${fmtPct(hexaco.a)}`,
    `Conscienciosidad: ${fmtPct(hexaco.c)}`,
    `Apertura: ${fmtPct(hexaco.o)}`,
  ];

  const oceanLines = [
    `Apertura: ${fmtPct(ocean.openness)}`,
    `Conciencia: ${fmtPct(ocean.conscientiousness)}`,
    `Extraversión: ${fmtPct(ocean.extraversion)}`,
    `Amabilidad: ${fmtPct(ocean.agreeableness)}`,
    `Neuroticismo: ${fmtPct(ocean.neuroticism)}`,
  ];

  const sampleItems = HEXACO_ITEMS.slice(0, 6).map(
    (item) => `- "${item.statement}" → respuesta ${data.answers[item.id]} / 5`,
  );

  return [
    "## Datos demográficos",
    ...demoLines,
    "",
    "## Personalidad HEXACO (calculada desde 24 ítems Likert)",
    ...hexacoLines,
    "",
    "## Big Five OCEAN (mapeo determinista desde HEXACO, NO recalcular)",
    ...oceanLines,
    "",
    "## Muestra de respuestas Likert (referencia, no es exhaustivo)",
    ...sampleItems,
    "",
    "## Respuesta abierta 1: ocupación y día típico (texto LITERAL del usuario)",
    `«${data.open_routine.trim()}»`,
    "",
    "## Respuesta abierta 2: frustraciones online (texto LITERAL del usuario)",
    `«${data.open_friction.trim()}»`,
    "",
    "## Tu tarea",
    "1) Extrae la `occupation` del primer texto, en castellano coloquial.",
    "2) Construye `com_b_barriers` integrando frases textuales del segundo texto en `opportunity` y `capability`. `motivation` puede integrar pistas del primer texto y del nivel HEXACO H.",
    "3) Escribe la `backstory` (120-220 caracteres) en tercera persona, integrando rutina + frustración + un rasgo dominante de la personalidad. Cita palabras del usuario cuando aporten autenticidad.",
  ].join("\n");
}
