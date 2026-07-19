/**
 * HEXACO-24 simplificado para el onboard público de SUAAS.
 *
 * 24 ítems Likert 1..5 (4 por cada una de las 6 dimensiones del modelo HEXACO):
 *   H · Honestidad-Humildad
 *   E · Emocionalidad
 *   X · eXtraversión
 *   A · Amabilidad
 *   C · Conscienciosidad
 *   O · Apertura a la experiencia
 *
 * El cuestionario se contesta en /onboard y los resultados se mapean a Big Five
 * de forma determinista (sin LLM) para evitar variabilidad. El LLM solo se usa
 * para extraer barreras COM-B y componer la backstory a partir de las dos
 * preguntas abiertas del wizard.
 *
 * Mapeo HEXACO -> OCEAN:
 *   O = O_hex
 *   C = C_hex
 *   E = X_hex
 *   A = A_hex
 *   N = E_hex, sin invertir (emocionalidad alta = neuroticismo alto;
 *       decisión ratificada en docs/ROADMAP.md, v0.31)
 *
 * Honestidad-Humildad NO se persiste como rasgo (Big Five solo tiene cinco),
 * pero el score H se pasa al LLM como contexto para que se refleje en la
 * backstory cuando es claramente alta o baja.
 */

export type HexacoDim = "H" | "E" | "X" | "A" | "C" | "O";

export type HexacoItem = {
  id: string;
  dim: HexacoDim;
  reversed: boolean;
  statement: string;
};

export type HexacoAnswers = Record<string, number>; // id -> 1..5

export type HexacoScores = {
  h: number; // 0..1
  e: number; // 0..1
  x: number; // 0..1
  a: number; // 0..1
  c: number; // 0..1
  o: number; // 0..1
};

export type OceanScores = {
  openness: number; // 0..1
  conscientiousness: number; // 0..1
  extraversion: number; // 0..1
  agreeableness: number; // 0..1
  neuroticism: number; // 0..1
};

export const HEXACO_ITEMS: HexacoItem[] = [
  // H · Honestidad-Humildad
  { id: "h1", dim: "H", reversed: false, statement: "Tener mucho dinero no es especialmente importante para mí." },
  { id: "h2", dim: "H", reversed: true, statement: "Si supiera que nunca me iban a pillar, estaría dispuesto/a a robar millones." },
  { id: "h3", dim: "H", reversed: true, statement: "Pienso que tengo derecho a más respeto que la gente media." },
  { id: "h4", dim: "H", reversed: true, statement: "Me sentiría tentado/a a usar dinero falsificado si pudiera salirme con la mía." },

  // E · Emocionalidad
  { id: "e1", dim: "E", reversed: false, statement: "A veces no puedo evitar preocuparme por cosas pequeñas." },
  { id: "e2", dim: "E", reversed: false, statement: "Cuando vivo una experiencia peligrosa, me da mucho miedo." },
  { id: "e3", dim: "E", reversed: true, statement: "Casi nunca lloro, ni siquiera viendo películas tristes." },
  { id: "e4", dim: "E", reversed: false, statement: "Cuando estoy con seres queridos, me siento muy unido/a a ellos." },

  // X · eXtraversión
  { id: "x1", dim: "X", reversed: false, statement: "Disfruto teniendo mucha gente alrededor con la que hablar." },
  { id: "x2", dim: "X", reversed: false, statement: "En situaciones sociales, suelo ser yo quien da el primer paso." },
  { id: "x3", dim: "X", reversed: false, statement: "Me siento razonablemente satisfecho/a conmigo mismo/a en general." },
  { id: "x4", dim: "X", reversed: true, statement: "La mayoría de la gente parece más alegre y dinámica que yo." },

  // A · Amabilidad
  { id: "a1", dim: "A", reversed: false, statement: "Rara vez guardo rencor, incluso con gente que me ha hecho daño." },
  { id: "a2", dim: "A", reversed: false, statement: "Tiendo a ser indulgente al juzgar a los demás." },
  { id: "a3", dim: "A", reversed: true, statement: "La gente a veces me dice que tengo mal carácter." },
  { id: "a4", dim: "A", reversed: true, statement: "Cuando alguien me lleva la contraria, suelo discutir hasta el final." },

  // C · Conscienciosidad
  { id: "c1", dim: "C", reversed: false, statement: "Planifico cuidadosamente antes de actuar." },
  { id: "c2", dim: "C", reversed: false, statement: "Cuando trabajo en algo, presto atención a los pequeños detalles." },
  { id: "c3", dim: "C", reversed: false, statement: "Termino las tareas que empiezo, aunque sean difíciles." },
  { id: "c4", dim: "C", reversed: true, statement: "A menudo dejo decisiones importantes al azar." },

  // O · Apertura a la experiencia
  { id: "o1", dim: "O", reversed: false, statement: "Me intereso por aprender sobre la historia y la política de otros países." },
  { id: "o2", dim: "O", reversed: false, statement: "Disfruto viendo arte o ideas que rompen lo convencional." },
  { id: "o3", dim: "O", reversed: false, statement: "Si tuviera la oportunidad, iría a ver una obra de teatro experimental." },
  { id: "o4", dim: "O", reversed: false, statement: "La gente me describe a veces como una persona muy imaginativa." },
];

export const LIKERT_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Totalmente en desacuerdo" },
  { value: 2, label: "En desacuerdo" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "De acuerdo" },
  { value: 5, label: "Totalmente de acuerdo" },
];

const DIM_KEYS: Record<HexacoDim, keyof HexacoScores> = {
  H: "h",
  E: "e",
  X: "x",
  A: "a",
  C: "c",
  O: "o",
};

/**
 * Convierte respuestas Likert 1..5 (con inversión de ítems reverse-keyed)
 * en scores 0..1 por dimensión.
 */
export function scoreHexaco(answers: HexacoAnswers): HexacoScores {
  const sums: Record<HexacoDim, number> = { H: 0, E: 0, X: 0, A: 0, C: 0, O: 0 };
  const counts: Record<HexacoDim, number> = { H: 0, E: 0, X: 0, A: 0, C: 0, O: 0 };

  for (const item of HEXACO_ITEMS) {
    const raw = answers[item.id];
    if (typeof raw !== "number" || raw < 1 || raw > 5) continue;
    const value = item.reversed ? 6 - raw : raw;
    sums[item.dim] += value;
    counts[item.dim] += 1;
  }

  const scores = { h: 0, e: 0, x: 0, a: 0, c: 0, o: 0 } as HexacoScores;
  for (const dim of Object.keys(sums) as HexacoDim[]) {
    const count = counts[dim];
    const avg = count > 0 ? sums[dim] / count : 3;
    scores[DIM_KEYS[dim]] = round2((avg - 1) / 4);
  }
  return scores;
}

/**
 * Mapeo determinista HEXACO -> Big Five (OCEAN). Las 5 dimensiones compartidas
 * van directas. Neuroticismo toma Emocionalidad sin invertir: E_hex alto
 * significa baja estabilidad emocional, equivalente a N alto en el modelo Big
 * Five tradicional.
 */
export function mapToOcean(scores: HexacoScores): OceanScores {
  return {
    openness: scores.o,
    conscientiousness: scores.c,
    extraversion: scores.x,
    agreeableness: scores.a,
    neuroticism: round2(scores.e),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Devuelve true cuando el cuestionario está completo (las 24 respuestas son
 * enteros 1..5 válidos). Permite que el wizard rechace submits parciales.
 */
export function isComplete(answers: HexacoAnswers): boolean {
  return HEXACO_ITEMS.every((item) => {
    const v = answers[item.id];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
  });
}
