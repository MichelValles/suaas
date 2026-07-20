import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { getRunsModel } from "@/lib/chat-models";
import {
  getServerClient,
  isMissingColumnError,
  MigrationPendingError,
} from "@/lib/supabase";
import { buildBrandContextRag } from "@/lib/rag";
import { recordUsage } from "@/lib/usage";
import { chunks } from "@/lib/experiments/shared";
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
  /** Marca de Cerebro elegida en el picker: habilita el retrieval RAG por trigger. */
  brand_id?: string | null;
  profile_ids: string[];
};

export type MomentumChallenge = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  trigger_scenario: string;
  brand_context: string | null;
  /** Null en triggers históricos o escritos a mano: comportamiento legado. */
  brand_id?: string | null;
  profile_ids: string[];
  results: ProfileMomentumResult[] | null;
  status: "pending" | "running" | "done" | "error";
  deleted_at?: string | null;
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
  // Contexto de marca ya resuelto por el runner (RAG o texto del challenge):
  // esta función no decide de dónde sale, solo lo inyecta si existe.
  brandContext: string | null,
  model: string = DEFAULT_MODEL,
): Promise<{ result: ProfileMomentumResult; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();

  const { age, gender, occupation, geo } = profile.demographics;

  const systemLines = [
    `Eres ${profile.name}, un perfil calibrado de usuario.`,
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
  if (brandContext) {
    promptLines.push("", "## Contexto de marca", brandContext);
  }
  promptLines.push("", "Describe cómo asumirías este Trigger en tu vida.");
  const prompt = promptLines.join("\n");

  const res = await generateObject({
    model,
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
      brand_id: input.brand_id ?? null,
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
  let { data, error } = await supa
    .from("momentum_challenges")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("momentum_challenges")
      .select("*")
      .order("created_at", { ascending: false }));
  }
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

export async function softDeleteMomentumChallenge(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("momentum_challenges")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError("0017_trash_geo_momentum_profiles.sql");
  }
  if (error) throw new Error(error.message);
}

export async function restoreMomentumChallenge(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("momentum_challenges")
    .update({ deleted_at: null })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError("0017_trash_geo_momentum_profiles.sql");
  }
  if (error) throw new Error(error.message);
}

export async function hardDeleteMomentumChallenge(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("momentum_challenges").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const STALE_RUNNING_MS = 10 * 60 * 1000;

export async function runMomentumChallenge(
  id: string,
): Promise<MomentumChallenge> {
  const supa = getServerClient();

  const challenge = await getMomentumChallenge(id);
  if (!challenge) throw new Error("Trigger de Momentum no encontrado.");
  if (challenge.deleted_at) {
    throw new Error("El Trigger está en la papelera: restáuralo antes de lanzarlo.");
  }
  if (challenge.status === "running") {
    // Un run muerto por timeout deja 'running' para siempre. Si lleva más
    // de 10 min sin actualizarse se considera zombi y se permite relanzar.
    const updatedAt = new Date(challenge.updated_at).getTime();
    if (!Number.isFinite(updatedAt) || Date.now() - updatedAt < STALE_RUNNING_MS) {
      throw new Error("El análisis ya está en marcha.");
    }
  }
  if (challenge.profile_ids.length === 0)
    throw new Error("El Trigger no tiene perfiles asignados.");
  if (challenge.profile_ids.length > 20)
    throw new Error("Máximo 20 perfiles por Trigger.");

  const runsModel = await getRunsModel();

  await supa
    .from("momentum_challenges")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id);

  try {
    const profiles = await listProfilesByIds(challenge.profile_ids);

    // RAG por trigger: el escenario de activación es común a todos los
    // perfiles, así que una sola recuperación por run. Si no devuelve nada
    // (marca sin indexar, gateway caído) se usa el texto guardado en el
    // challenge, como hasta ahora.
    let brandContext = challenge.brand_context;
    if (challenge.brand_id) {
      const ragCtx = await buildBrandContextRag(
        challenge.brand_id,
        challenge.trigger_scenario,
      );
      if (ragCtx) brandContext = ragCtx;
    }

    const results: ProfileMomentumResult[] = [];
    for (const chunk of chunks(profiles, 5)) {
      const chunkResults = await Promise.all(
        chunk.map(async (profile) => {
          const { result, latencyMs, usage } = await analyzeProfileMomentum(
            challenge,
            profile,
            brandContext,
            runsModel,
          );
          await recordUsage({
            scope: "momentum_probe",
            model: runsModel,
            usage,
            meta: { challenge_id: id, profile_id: profile.id, latency_ms: latencyMs },
          });
          return result;
        }),
      );
      results.push(...chunkResults);
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
