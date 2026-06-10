import { z } from "zod";
import {
  getServerClient,
  isMissingColumnError,
  MigrationPendingError,
} from "@/lib/supabase";

// ============================================================
// Schemas (zod) : la fuente de verdad de la forma del dato.
// ============================================================

export const DemographicsSchema = z.object({
  age: z.number().int().min(0).max(120),
  gender: z.string().min(1),
  occupation: z.string().min(1),
  income_band: z.string().optional(),
  geo: z.string().optional(),
});

export const BigFiveSchema = z.object({
  openness: z.number().min(0).max(1),
  conscientiousness: z.number().min(0).max(1),
  extraversion: z.number().min(0).max(1),
  agreeableness: z.number().min(0).max(1),
  neuroticism: z.number().min(0).max(1),
});

export const ComBBarriersSchema = z.object({
  capability: z.array(z.string()).default([]),
  opportunity: z.array(z.string()).default([]),
  motivation: z.array(z.string()).default([]),
});

export const ProfileInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  demographics: DemographicsSchema,
  big_five: BigFiveSchema,
  com_b_barriers: ComBBarriersSchema,
  backstory: z.string().min(20, "El backstory debe tener al menos 20 caracteres."),
  source: z.string().optional(),
  intent_context: z.string().optional(),
});

export const ProfileSchema = ProfileInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Demographics = z.infer<typeof DemographicsSchema>;
export type BigFive = z.infer<typeof BigFiveSchema>;
export type ComBBarriers = z.infer<typeof ComBBarriersSchema>;
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

// ============================================================
// CRUD (server only)
// ============================================================

export async function listProfiles(): Promise<Profile[]> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/**
 * No filtra `deleted_at`: lo usan las vistas de resultados históricos
 * (runs, momentum) y deben seguir mostrando el perfil aunque esté en
 * la papelera.
 */
export async function listProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const supa = getServerClient();
  const { data, error } = await supa
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("profiles")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw new Error(error.message);
  return (data ?? null) as Profile | null;
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  const parsed = ProfileInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("profiles")
    .insert(parsed)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateProfile(id: string, input: ProfileInput): Promise<Profile> {
  const parsed = ProfileInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("profiles")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function updateProfileIntentContext(
  id: string,
  intent_context: string,
): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("profiles")
    .update({ intent_context: intent_context.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function softDeleteProfile(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError("0017_trash_geo_momentum_profiles.sql");
  }
  if (error) throw new Error(error.message);
}

export async function restoreProfile(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", id);
  if (isMissingColumnError(error, "deleted_at")) {
    throw new MigrationPendingError("0017_trash_geo_momentum_profiles.sql");
  }
  if (error) throw new Error(error.message);
}

/**
 * Borrado definitivo. Destruye en cascada los runs y respuestas del
 * perfil (on delete cascade). Solo debe invocarse desde la papelera.
 */
export async function hardDeleteProfile(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
