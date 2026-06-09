import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";
import { listProfilesByIds, type Profile } from "@/lib/profiles";

// ============================================================
// Tipos y schemas
// ============================================================

export type MomentumDirection = "approaching" | "stable" | "drifting";
export type MomentumVelocity = "accelerating" | "steady" | "decelerating";

export const ProfileMomentumResultSchema = z.object({
  profile_id: z.string(),
  profile_name: z.string(),
  intent_narrative: z.string(),
  intensity: z.number().min(0).max(1),
  direction: z.enum(["approaching", "stable", "drifting"]),
  velocity: z.enum(["accelerating", "steady", "decelerating"]),
  first_steps: z.array(z.string()),
  channels: z.array(z.string()),
  barriers: z.array(z.string()),
  jtbd_expressed: z.string(),
});
export type ProfileMomentumResult = z.infer<typeof ProfileMomentumResultSchema>;

export type MomentumChallengeInput = {
  name: string;
  trigger_scenario: string;
  brand_context?: string;
  profile_ids: string[];
};

export type MomentumChallenge = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  trigger_scenario: string;
  brand_context: string | null;
  profile_ids: string[];
  results: ProfileMomentumResult[] | null;
  status: "pending" | "running" | "done" | "error";
};

// ============================================================
// LLM: análisis de intent momentum para un perfil
// ============================================================

const MomentumOutputSchema = z.object({
  intent_narrative: z
    .string()
    .describe(
      "Cómo el perfil describiría en primera persona cómo asumiría este Trigger en su vida real. 3-5 frases concretas y naturales.",
    ),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0 = sin motivación para actuar ahora, 1 = urgencia máxima, lo haría hoy. Usa decimales.",
    ),
  direction: z
    .enum(["approaching", "stable", "drifting"])
    .describe(
      "'approaching' = se mueve activamente hacia buscar una solución; 'stable' = consciente pero sin moverse; 'drifting' = lo pospone indefinidamente o lo descarta.",
    ),
  velocity: z
    .enum(["accelerating", "steady", "decelerating"])
    .describe(
      "'accelerating' = cada semana más urgente; 'steady' = ritmo constante; 'decelerating' = la urgencia se disipa con el tiempo.",
    ),
  first_steps: z
    .array(z.string())
    .describe(
      "Primeras 3-5 acciones concretas que el perfil daría, en orden. Específicas y realistas para este perfil.",
    ),
  channels: z
    .array(z.string())
    .describe(
      "Canales que usaría: 'Google', 'Instagram', 'médico de cabecera', 'amigos y familia', 'YouTube', 'foros especializados', etc.",
    ),
  barriers: z
    .array(z.string())
    .describe(
      "Frenos reales para no actuar o posponer. Específicos al perfil. Lista vacía si no hay barreras.",
    ),
  jtbd_expressed: z
    .string()
    .describe(
      "El Job-To-Be-Done tal como lo expresaría este perfil en sus propias palabras, no en lenguaje académico. 1-2 frases naturales.",
    ),
});

export async function analyzeProfileMomentum(
  challenge: MomentumChallenge,
  profile: Profile,
): Promise<{ result: ProfileMomentumResult; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const { age, gender, occupation, geo } = profile.demographics;

  const systemLines = [
    `Eres ${profile.name}, un perfil sintético de usuario.`,
    "",
    "Tu perfil:",
    `- Edad: ${age} años. Género: ${gender}. Ocupación: ${occupation}. Ubicación: ${geo ?? "España"}.`,
    `- Historia: ${profile.backstory}`,
    profile.intent_context
      ? `- Contexto de intención (JTBD): ${profile.intent_context}`
      : "",
    "",
    "Se te presenta un escenario de activación. Simula cómo TÚ, como este perfil, responderías naturalmente en tu vida real:",
    "- Qué pensarías al enfrentarte a ese Trigger",
    "- Qué primeros pasos concretos darías (buscar en Google, preguntar a alguien, ir al médico, ignorarlo, etc.)",
    "- Qué canales usarías y en qué orden",
    "- Qué barreras o fricciones sentirías para actuar",
    "- Con qué urgencia o intensidad lo abordarías",
    "",
    "En 'intent_narrative' habla en primera persona, de forma concreta y realista.",
    "En 'jtbd_expressed' exprésalo como lo dirías tú, no en lenguaje de negocio.",
    "Sé fiel al perfil: una persona mayor con barreras tecnológicas se comporta diferente a un nativo digital.",
  ].filter(Boolean);

  const system = systemLines.join("\n");

  const promptLines = [
    "## Escenario de activación",
    challenge.trigger_scenario,
  ];
  if (challenge.brand_context) {
    promptLines.push("", "## Contexto de marca", challenge.brand_context);
  }
  promptLines.push("", "Describe cómo asumirías este Trigger en tu vida.");
  const prompt = promptLines.join("\n");

  const res = await generateObject({
    model: DEFAULT_MODEL,
    schema: MomentumOutputSchema,
    system,
    prompt,
  });

  return {
    result: {
      profile_id: profile.id,
      profile_name: profile.name,
      ...res.object,
    },
    latencyMs: Date.now() - startedAt,
    usage: res.usage ?? null,
  };
}

// ============================================================
// CRUD
// ============================================================

export async function createMomentumChallenge(
  input: MomentumChallengeInput,
): Promise<MomentumChallenge> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("momentum_challenges")
    .insert({
      name: input.name,
      trigger_scenario: input.trigger_scenario,
      brand_context: input.brand_context ?? null,
      profile_ids: input.profile_ids,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as MomentumChallenge;
}

export async function listMomentumChallenges(): Promise<MomentumChallenge[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("momentum_challenges")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MomentumChallenge[];
}

export async function getMomentumChallenge(
  id: string,
): Promise<MomentumChallenge | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("momentum_challenges")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as MomentumChallenge | null;
}

export async function deleteMomentumChallenge(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("momentum_challenges").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function runMomentumChallenge(
  id: string,
): Promise<MomentumChallenge> {
  const supa = getServerClient();

  const challenge = await getMomentumChallenge(id);
  if (!challenge) throw new Error("Trigger de Momentum no encontrado.");
  if (challenge.status === "running") throw new Error("El análisis ya está en marcha.");
  if (challenge.profile_ids.length === 0)
    throw new Error("El Trigger no tiene perfiles asignados.");

  await supa.from("momentum_challenges").update({ status: "running" }).eq("id", id);

  try {
    const profiles = await listProfilesByIds(challenge.profile_ids);

    const results: ProfileMomentumResult[] = [];
    for (const profile of profiles) {
      const { result, latencyMs, usage } = await analyzeProfileMomentum(
        challenge,
        profile,
      );
      await recordUsage({
        scope: "momentum_probe",
        model: DEFAULT_MODEL,
        usage,
        meta: { challenge_id: id, profile_id: profile.id, latency_ms: latencyMs },
      });
      results.push(result);
    }

    const { data, error } = await supa
      .from("momentum_challenges")
      .update({ status: "done", results, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as MomentumChallenge;
  } catch (err) {
    try {
      await supa
        .from("momentum_challenges")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch {
      /* silently ignore */
    }
    throw err;
  }
}
