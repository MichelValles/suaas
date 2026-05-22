import { z } from "zod";
import { getServerClient, isMissingColumnError } from "@/lib/supabase";

export const AbTestInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  hypothesis: z.string().optional().nullable(),
  target_a_id: z.string().uuid(),
  target_b_id: z.string().uuid(),
}).refine((v) => v.target_a_id !== v.target_b_id, {
  message: "Las variantes A y B no pueden ser el mismo target.",
  path: ["target_b_id"],
});
export type AbTestInput = z.infer<typeof AbTestInputSchema>;

export type AbTest = {
  id: string;
  created_at: string;
  name: string;
  hypothesis: string | null;
  target_a_id: string;
  target_b_id: string;
};

export type AbTestRun = {
  id: string;
  created_at: string;
  ab_test_id: string;
  run_id: string;
  variant: "A" | "B";
};

export async function listAbTests(): Promise<AbTest[]> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("ab_tests")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("ab_tests")
      .select("*")
      .order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as AbTest[];
}

export async function getAbTest(id: string): Promise<AbTest | null> {
  const supa = getServerClient();
  let { data, error } = await supa
    .from("ab_tests")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (isMissingColumnError(error, "deleted_at")) {
    ({ data, error } = await supa
      .from("ab_tests")
      .select("*")
      .eq("id", id)
      .maybeSingle());
  }
  if (error) throw new Error(error.message);
  return (data ?? null) as AbTest | null;
}

export async function softDeleteAbTest(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("ab_tests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreAbTest(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("ab_tests")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function hardDeleteAbTest(id: string): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("ab_tests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createAbTest(input: AbTestInput): Promise<AbTest> {
  const parsed = AbTestInputSchema.parse(input);
  const supa = getServerClient();
  const { data, error } = await supa
    .from("ab_tests")
    .insert({
      name: parsed.name,
      hypothesis: parsed.hypothesis ?? null,
      target_a_id: parsed.target_a_id,
      target_b_id: parsed.target_b_id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AbTest;
}

export async function linkAbTestRun(input: {
  ab_test_id: string;
  run_id: string;
  variant: "A" | "B";
}): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa.from("ab_test_runs").insert(input);
  if (error) throw new Error(error.message);
}

export async function listAbTestRuns(abTestId: string): Promise<AbTestRun[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("ab_test_runs")
    .select("*")
    .eq("ab_test_id", abTestId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AbTestRun[];
}
