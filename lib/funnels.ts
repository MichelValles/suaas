import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

// ============================================================
// Schemas (zod)
// ============================================================

export const FunnelStepPayloadSchema = z.object({
  kind: z.enum(["url", "upload"]),
  image_url: z
    .string()
    .refine(
      (v) => /^https?:\/\//i.test(v) || /^data:image\//i.test(v),
      "Debe ser una URL http(s) o un data:image URL.",
    ),
  source_url: z.string().url().optional(),
});
export type FunnelStepPayload = z.infer<typeof FunnelStepPayloadSchema>;

export const FunnelStepInputSchema = z.object({
  name: z.string().min(1, "El nombre del paso es obligatorio."),
  intent: z.string().min(3, "Describe qué debería hacer el usuario en el paso."),
  payload: FunnelStepPayloadSchema,
});
export type FunnelStepInput = z.infer<typeof FunnelStepInputSchema>;

export const FunnelInputSchema = z.object({
  name: z.string().min(1, "El nombre del embudo es obligatorio."),
  description: z.string().optional().nullable(),
  steps: z
    .array(FunnelStepInputSchema)
    .min(2, "Un embudo necesita al menos 2 pasos.")
    .max(12, "Máximo 12 pasos por embudo."),
});
export type FunnelInput = z.infer<typeof FunnelInputSchema>;

export type FunnelStep = {
  id: string;
  created_at: string;
  funnel_id: string;
  position: number;
  name: string;
  intent: string;
  payload: FunnelStepPayload;
};

export type Funnel = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
};

export type FunnelWithSteps = Funnel & { steps: FunnelStep[] };

// ============================================================
// CRUD (server only)
// ============================================================

export async function listFunnels(): Promise<
  Array<Funnel & { step_count: number }>
> {
  const supa = getServerClient();
  const { data: funnels, error } = await supa
    .from("funnels")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!funnels || funnels.length === 0) return [];

  const ids = funnels.map((f) => f.id);
  const { data: steps, error: stepsErr } = await supa
    .from("funnel_steps")
    .select("funnel_id")
    .in("funnel_id", ids);
  if (stepsErr) throw new Error(stepsErr.message);

  const counts = new Map<string, number>();
  for (const row of steps ?? []) {
    counts.set(row.funnel_id, (counts.get(row.funnel_id) ?? 0) + 1);
  }
  return funnels.map((f) => ({
    ...(f as Funnel),
    step_count: counts.get(f.id) ?? 0,
  }));
}

export async function getFunnel(id: string): Promise<FunnelWithSteps | null> {
  const supa = getServerClient();
  const { data: funnel, error } = await supa
    .from("funnels")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!funnel) return null;

  const { data: steps, error: stepsErr } = await supa
    .from("funnel_steps")
    .select("*")
    .eq("funnel_id", id)
    .order("position", { ascending: true });
  if (stepsErr) throw new Error(stepsErr.message);

  return {
    ...(funnel as Funnel),
    steps: (steps ?? []) as FunnelStep[],
  };
}

export async function createFunnel(input: FunnelInput): Promise<Funnel> {
  const parsed = FunnelInputSchema.parse(input);
  const supa = getServerClient();

  const { data: funnel, error } = await supa
    .from("funnels")
    .insert({
      name: parsed.name,
      description: parsed.description ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const stepRows = parsed.steps.map((s, idx) => ({
    funnel_id: funnel.id,
    position: idx + 1,
    name: s.name,
    intent: s.intent,
    payload: s.payload,
  }));
  const { error: stepsErr } = await supa.from("funnel_steps").insert(stepRows);
  if (stepsErr) {
    await supa.from("funnels").delete().eq("id", funnel.id);
    throw new Error(stepsErr.message);
  }

  return funnel as Funnel;
}

export async function softDeleteFunnel(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("funnels")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreFunnel(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("funnels")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteFunnel(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("funnels").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** @deprecated Usa softDeleteFunnel/hardDeleteFunnel. Mantenido por compat. */
export async function deleteFunnel(id: string): Promise<void> {
  return hardDeleteFunnel(id);
}
