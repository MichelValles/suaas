/**
 * Prueba de trazabilidad de un perfil calibrado: atributos -> plan del
 * Reasoner (con vector Intent Momentum) -> respuesta del Talker.
 * Llama a las funciones reales del producto contra el AI Gateway.
 *
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/prueba-perfil-trace.ts
 */
import { writeFileSync } from "node:fs";
import { reason, talkStream } from "@/lib/agents";
import { buildSystemPrompt } from "@/lib/prompts";
import type { Profile } from "@/lib/profiles";

const lucia: Profile = {
  id: "590840d0-db38-4a58-b462-277eb7734635",
  name: "Lucía Sáez",
  demographics: {
    age: 34,
    gender: "mujer",
    occupation: "arquitecta técnica en estudio",
    income_band: "media-alta",
    geo: "Madrid",
  },
  big_five: {
    openness: 0.68,
    conscientiousness: 0.8,
    extraversion: 0.45,
    agreeableness: 0.62,
    neuroticism: 0.58,
  },
  com_b_barriers: {
    capability: [
      "no distingue la tasa de éxito acumulada de la tasa por transferencia",
      "no sabe cuántos ciclos necesitará",
      "desconoce qué incluye el precio base de una FIV",
    ],
    opportunity: [
      "las grandes clínicas no publican precios y piden el teléfono para enviar el dossier",
      "agenda laboral apretada para encajar las citas",
      "está comparando tres clínicas a la vez",
    ],
    motivation: [
      "miedo a empezar demasiado tarde",
      "recelo a la sensación de «fábrica» de una marca grande",
      "necesita sentir que el equipo médico la conoce",
    ],
  },
  backstory:
    "Lleva quince meses buscando embarazo con su pareja sin resultado y acaba de recibir una cita de la sanidad pública para dentro de ocho meses. Es metódica: ha leído foros, comparado tres clínicas y anotado preguntas, pero le frustra que ninguna web le dé un precio cerrado. Confía en la ciencia de las grandes redes de clínicas pero teme ser un número más.",
  intent_context:
    "Cuando llevamos más de un año intentándolo sin éxito y la pública nos da cita lejana, quiero entender qué nos pasa y cuánto costará de verdad para poder decidir con cabeza en qué clínica ponemos nuestro dinero y nuestra esperanza.",
  source: "investigacion-publico-ivi-2026-06",
  created_at: "2026-06-12T23:43:01Z",
  updated_at: "2026-06-13T00:07:41Z",
  avatar_url: null,
};

const message =
  "Hola, he visto que ofrecéis un 'estudio completo de fertilidad'. La verdad es que llevamos año y medio intentándolo. ¿Qué incluye y cuánto cuesta?";

async function main() {
  const systemPrompt = buildSystemPrompt(lucia);

  const { plan, latencyMs, model } = await reason({
    profile: lucia,
    history: [],
    message,
  });

  const talker = talkStream({ profile: lucia, plan, history: [], message });
  let response = "";
  for await (const chunk of talker.textStream) response += chunk;

  const out = {
    perfil: lucia.name,
    mensaje_usuario: message,
    system_prompt: systemPrompt,
    reasoner: { model, latencyMs, plan },
    talker_respuesta: response,
  };
  writeFileSync(
    "scripts/.out-perfil-trace.json",
    JSON.stringify(out, null, 2),
    "utf8",
  );
  console.log("=== SYSTEM PROMPT (buildSystemPrompt) ===");
  console.log(systemPrompt);
  console.log("\n=== MENSAJE DEL USUARIO ===\n" + message);
  console.log("\n=== PLAN DEL REASONER (Opus) ===");
  console.log(JSON.stringify(plan, null, 2));
  console.log("\n=== RESPUESTA DEL TALKER (Sonnet) ===\n" + response);
  console.log("\nGuardado en scripts/.out-perfil-trace.json");
}

main().catch((e) => {
  console.error("ERROR:", (e as Error).message);
  process.exit(1);
});
