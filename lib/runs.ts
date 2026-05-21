import { getServerClient } from "@/lib/supabase";

export type RunKind = "5s_test" | "funnel" | "pricing" | "copy_resonance" | "chat";
export type RunStatus = "queued" | "running" | "done" | "error";
export type MessageRole = "reasoner" | "talker" | "system" | "human";

export type Run = {
  id: string;
  created_at: string;
  finished_at: string | null;
  profile_id: string;
  target_id: string | null;
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
  params?: Record<string, unknown> | null;
}): Promise<Run> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("runs")
    .insert({
      profile_id: input.profile_id,
      target_id: input.target_id ?? null,
      kind: input.kind,
      params: input.params ?? null,
      status: "running",
    })
    .select("*")
    .single();
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
