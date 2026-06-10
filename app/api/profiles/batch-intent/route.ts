import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listProfiles, updateProfileIntentContext, type Profile } from "@/lib/profiles";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const IntentSchema = z.object({
  intent_context: z
    .string()
    .describe(
      "JTBD realista para este perfil. Formato exacto: 'Cuando [situación concreta y específica], quiero [motivación genuina] para poder [resultado esperado].' Una sola frase, máximo 220 caracteres.",
    ),
});

async function generateIntentForProfile(profile: Profile): Promise<{ intent: string; usage: unknown }> {
  const d = profile.demographics;
  const b = profile.big_five;
  const c = profile.com_b_barriers;

  const profileLines = [
    `Nombre: ${profile.name}`,
    `Edad: ${d.age} años. Género: ${d.gender}. Ocupación: ${d.occupation}.`,
    d.income_band ? `Nivel económico: ${d.income_band}.` : "",
    d.geo ? `Ubicación: ${d.geo}.` : "",
    `Backstory: ${profile.backstory}`,
    "",
    `Big Five: apertura ${b.openness.toFixed(2)}, conciencia ${b.conscientiousness.toFixed(2)}, extraversión ${b.extraversion.toFixed(2)}, amabilidad ${b.agreeableness.toFixed(2)}, neuroticismo ${b.neuroticism.toFixed(2)}.`,
    c.capability.length > 0 ? `Barreras de capacidad: ${c.capability.join(", ")}.` : "",
    c.opportunity.length > 0 ? `Barreras de oportunidad: ${c.opportunity.join(", ")}.` : "",
    c.motivation.length > 0 ? `Barreras de motivación: ${c.motivation.join(", ")}.` : "",
  ].filter(Boolean);

  const res = await generateObject({
    model: DEFAULT_MODEL,
    schema: IntentSchema,
    system: [
      "Eres un experto en Jobs To Be Done (JTBD).",
      "Genera un JTBD realista para el perfil de usuario que se te presenta.",
      "",
      "Reglas:",
      "- Sé específico: usa el contexto de vida de ESTE perfil, no uno genérico.",
      "- El trigger (Cuando...) debe ser una situación concreta y verosímil para su edad y ocupación.",
      "- La motivación (quiero...) debe reflejar su personalidad y barreras reales.",
      "- El resultado (para poder...) debe ser tangible y significativo para esta persona.",
      "- Usa lenguaje natural, como lo expresaría esa persona en su día a día.",
      "- No uses lenguaje corporativo ni académico.",
    ].join("\n"),
    prompt: profileLines.join("\n"),
  });

  return { intent: res.object.intent_context, usage: res.usage ?? null };
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = !!(body as Record<string, unknown>)?.force;
  } catch {
    /* force remains false */
  }

  // listProfiles ya filtra la papelera (deleted_at) y ordena por fecha desc.
  let profiles: Profile[];
  try {
    profiles = (await listProfiles()).slice(0, 10);
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
  const results: {
    id: string;
    name: string;
    intent: string;
    status: "generated" | "skipped" | "error";
    error?: string;
  }[] = [];

  for (const profile of profiles) {
    if (!force && profile.intent_context) {
      results.push({ id: profile.id, name: profile.name, intent: profile.intent_context, status: "skipped" });
      continue;
    }
    try {
      const { intent } = await generateIntentForProfile(profile);
      await updateProfileIntentContext(profile.id, intent);
      results.push({ id: profile.id, name: profile.name, intent, status: "generated" });
    } catch (err) {
      results.push({ id: profile.id, name: profile.name, intent: "", status: "error", error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    generated: results.filter((r) => r.status === "generated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    results,
  });
}
