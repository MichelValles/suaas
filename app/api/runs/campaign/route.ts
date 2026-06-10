import { after } from "next/server";
import { z } from "zod";
import { budgetGate } from "@/lib/budget";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import {
  executeCampaignRun,
  prepareCampaignResume,
  prepareCampaignRun,
} from "@/lib/experiments/campaign";
import { isGatewayConfigured } from "@/lib/gateway";
import { getRun } from "@/lib/runs";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
// El POST responde al instante y el procesado corre en after(), que vive
// hasta maxDuration. El runner corta a los ~270s (deadline interno) para
// que el cierre (summarize + estado) siempre quepa; lo que no llegue se
// retoma con resumeRunId.
export const maxDuration = 300;

const BodySchema = z.union([
  z.object({
    campaignId: z.string().uuid(),
    profileIds: z.array(z.string().uuid()).min(1).max(20),
  }),
  z.object({
    resumeRunId: z.string().uuid(),
  }),
]);

export async function POST(request: Request) {
  if (!isGatewayConfigured()) {
    return serviceUnavailable("AI Gateway no configurado.");
  }
  const gate = await budgetGate();
  if (gate) return gate;
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return validationError((err as Error).message);
  }
  try {
    const prep =
      "resumeRunId" in parsed
        ? await prepareCampaignResume(parsed.resumeRunId)
        : await prepareCampaignRun(parsed);
    // Procesado tras la respuesta: la UI navega ya a la página de resultados,
    // que muestra el progreso con polling.
    after(() => executeCampaignRun(prep));
    return Response.json({
      ok: true,
      runId: prep.runId,
      expected: prep.expected,
      async: true,
    });
  } catch (err) {
    return internalError(500, "/api/runs/campaign", err);
  }
}

/** Progreso de un run: status, respuestas persistidas y total esperado. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return serviceUnavailable("Supabase no configurado.");
  }
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId) return validationError("runId requerido.");
  try {
    const run = await getRun(runId);
    if (!run || run.kind !== "campaign") {
      return Response.json({ ok: false, error: "Run no encontrado." }, { status: 404 });
    }
    const supa = getServerClient();
    const { count, error } = await supa
      .from("campaign_responses")
      .select("*", { count: "exact", head: true })
      .eq("run_id", runId);
    if (error) throw new Error(error.message);
    const params = (run.params ?? {}) as Record<string, unknown>;
    const expected =
      ((params.profileIds as string[] | undefined)?.length ?? 0) *
      ((params.channels as string[] | undefined)?.length ?? 1) *
      ((params.queries as string[] | undefined)?.length ?? 1);
    return Response.json({
      ok: true,
      status: run.status,
      done: count ?? 0,
      expected,
      started_at: run.created_at,
    });
  } catch (err) {
    return internalError(500, "/api/runs/campaign:GET", err);
  }
}
