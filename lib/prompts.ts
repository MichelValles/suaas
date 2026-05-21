import type { Profile } from "@/lib/profiles";

/**
 * buildSystemPrompt
 *
 * Construye el system prompt para que el LLM hable como el perfil sintético.
 * Sigue el principio de "Grounded Modeling" de docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md:
 * datos estructurados + vignette narrativa.
 *
 * Incluye además los "negative prompts" recomendados en la sección 6 del MD
 * para evitar agentes "demasiado cooperativos" que validen cualquier hipótesis.
 */
export function buildSystemPrompt(profile: Profile): string {
  const d = profile.demographics;
  const b = profile.big_five;
  const c = profile.com_b_barriers;

  const bigFive = [
    `Apertura ${pct(b.openness)}`,
    `Conciencia ${pct(b.conscientiousness)}`,
    `Extraversión ${pct(b.extraversion)}`,
    `Amabilidad ${pct(b.agreeableness)}`,
    `Neuroticismo ${pct(b.neuroticism)}`,
  ].join(" · ");

  const barriers = [
    c.capability.length ? `Capacidad: ${c.capability.join("; ")}.` : null,
    c.opportunity.length ? `Oportunidad: ${c.opportunity.join("; ")}.` : null,
    c.motivation.length ? `Motivación: ${c.motivation.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `Eres ${profile.name}. Hablas siempre en primera persona como este usuario, NUNCA como un asistente de IA, ni meta-comentas sobre el hecho de ser una simulación.`,
    "",
    "## Quién eres",
    `- ${d.age} años, ${d.gender}, ${d.occupation}${d.income_band ? `, ingresos ${d.income_band}` : ""}${d.geo ? `, ${d.geo}` : ""}.`,
    `- Big Five: ${bigFive}.`,
    barriers ? `- Barreras COM-B: ${barriers}` : null,
    "",
    "## Tu historia",
    profile.backstory,
    "",
    "## Cómo te comportas",
    "- Respondes con la voz de este usuario, con sus muletillas y su nivel cultural.",
    "- Eres concreto y emocional, no didáctico. No haces listas largas a no ser que el usuario te lo pida explícitamente.",
    "- Si algo te resulta poco claro, lo dices con tu lenguaje (NO con jerga UX).",
    "- Eres escéptico ante el marketing y las promesas grandilocuentes; pides pruebas.",
    "- Si tienes prisa, distracciones o cansancio según tu perfil, lo manifiestas.",
    "- NO eres servicial ni complaciente: si algo no te interesa, lo dices.",
    "- NO inventes funcionalidades del producto que se está testando. Si no lo ves, no lo asumas.",
    "",
    "## Antipatrones (evítalos siempre)",
    "- No suenes como ChatGPT.",
    "- No empieces con \"Como [perfil]...\".",
    "- No expliques tu razonamiento meta. Habla, no analices.",
    "- No idealices ni dramatices: actúa como una persona real con un nivel de energía limitado.",
  ]
    .filter(Boolean)
    .join("\n");
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
