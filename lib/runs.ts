import { getServerClient, isMissingColumnError } from "@/lib/supabase";

export type RunKind = "5s_test" | "funnel" | "pricing" | "copy_resonance" | "ab_test" | "chat";
export type RunStatus = "queued" | "running" | "done" | "error";
export type MessageRole = "reasoner" | "talker" | "system" | "human";

export type Run = {
  id: string;
  created_at: string;
  finished_at: string | null;
  profile_id: string;
  target_id: string | null;
  funnel_id: string | null;
  ab_test_id: string | null;
  copy_deck_id: string | null;
  pricing_offer_id: string | null;
  kind: RunKind;
  status: RunStatus;
  params: Record<string, unknown> | null;
};

export type Message = {
  id: string;
  created_at: string;
  run_id: string;
  turn: number;
  role: MessageRole;
  content: string;
  meta: Record<string, unknown> | null;
};

export async function createRun(input: {
  profile_id: string;
  kind: RunKind;
  target_id?: string | null;
  funnel_id?: string | null;
  ab_test_id?: string | null;
  copy_deck_id?: string | null;
  pricing_offer_id?: string | null;
  params?: Record<string, unknown> | null;
}): Promise<Run> {
  // Sólo incluimos en el INSERT las columnas con valor real. Si PostgREST
  // tiene un schema cache desactualizado (caso clásico justo después de
  // aplicar una migración) y enviamos todas las columnas con null,
  // cualquier columna que aún no esté en su cache hace fallar el INSERT
  // entero, incluso cuando la columna SÍ existe en la base. Omitiendo
  // los null evitamos arrastrar a unos módulos por un cache parcial.
  const supa = getServerClient();
  const row: Record<string, unknown> = {
    profile_id: input.profile_id,
    kind: input.kind,
    status: "running",
    params: input.params ?? null,
  };
  if (input.target_id) row.target_id = input.target_id;
  if (input.funnel_id) row.funnel_id = input.funnel_id;
  if (input.ab_test_id) row.ab_test_id = input.ab_test_id;
  if (input.copy_deck_id) row.copy_deck_id = input.copy_deck_id;
  if (input.pricing_offer_id) row.pricing_offer_id = input.pricing_offer_id;

  const { data, error } = await supa.from("runs").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data as Run;
}

export async function listRunsByProfile(profileId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function listRunsByTarget(targetId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function listRunsByFunnel(funnelId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("funnel_id", funnelId)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "funnel_id")) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function listRunsByAbTest(abTestId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("ab_test_id", abTestId)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "ab_test_id")) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function listRunsByCopyDeck(deckId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("copy_deck_id", deckId)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "copy_deck_id")) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function listRunsByPricingOffer(offerId: string): Promise<Run[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("pricing_offer_id", offerId)
    .order("created_at", { ascending: false });
  if (isMissingColumnError(error, "pricing_offer_id")) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as Run[];
}

export async function getRun(runId: string): Promise<Run | null> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Run | null;
}

export async function getMetricsForRun(
  runId: string,
): Promise<Record<string, number>> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("metrics")
    .select("key, value")
    .eq("run_id", runId);
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    out[row.key as string] = row.value as number;
  }
  return out;
}

export async function listMessages(runId: string): Promise<Message[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("messages")
    .select("*")
    .eq("run_id", runId)
    .order("turn", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function appendMessage(input: {
  run_id: string;
  turn: number;
  role: MessageRole;
  content: string;
  meta?: Record<string, unknown> | null;
}): Promise<Message> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("messages")
    .insert({
      run_id: input.run_id,
      turn: input.turn,
      role: input.role,
      content: input.content,
      meta: input.meta ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Message;
}

export async function nextTurn(runId: string): Promise<number> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("messages")
    .select("turn")
    .eq("run_id", runId)
    .order("turn", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const last = (data?.[0]?.turn as number | undefined) ?? -1;
  return last + 1;
}

export async function markRunFinished(runId: string, status: RunStatus = "done") {
  const supa = getServerClient();
  const { error } = await supa
    .from("runs")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

export async function upsertMetric(input: {
  run_id: string;
  key: string;
  value: number;
  unit?: string | null;
}) {
  const supa = getServerClient();
  await supa.from("metrics").delete().eq("run_id", input.run_id).eq("key", input.key);
  const { error } = await supa.from("metrics").insert({
    run_id: input.run_id,
    key: input.key,
    value: input.value,
    unit: input.unit ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listEffortValues(runId: string): Promise<number[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("messages")
    .select("meta")
    .eq("run_id", runId)
    .eq("role", "reasoner");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => {
      const meta = row.meta as { plan?: { effort?: number } } | null;
      return meta?.plan?.effort;
    })
    .filter((v): v is number => typeof v === "number");
}
