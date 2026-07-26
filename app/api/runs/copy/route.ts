import { z } from "zod";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import { track } from "@vercel/analytics/server";
import { budgetGate } from "@/lib/budget";
import { getRunsModel } from "@/lib/chat-models";
import { runCopyTest } from "@/lib/experiments/copy";
import { isGatewayConfigured } from "@/lib/gateway";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  deckId: z.string().uuid(),
  profileIds: z.array(z.string().uuid()).min(1).max(20),
});

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
    const { runId, summary } = await runCopyTest(parsed);
    // Telemetría de producto (best-effort): kind + nº de perfiles + modelo.
    await track("run_launched", {
      kind: "copy",
      profiles: parsed.profileIds.length,
      model: await getRunsModel().catch(() => "unknown"),
      source: "ui",
    }).catch(() => {});
    return Response.json({ ok: true, runId, summary });
  } catch (err) {
    return internalError(500, "/api/runs/copy", err);
  }
}
