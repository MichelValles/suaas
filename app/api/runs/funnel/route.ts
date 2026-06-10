import { z } from "zod";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import { budgetGate } from "@/lib/budget";
import { isGatewayConfigured } from "@/lib/gateway";
import { runFunnelTest } from "@/lib/experiments/funnel";

export const runtime = "nodejs";
// 5 perfiles en paralelo, hasta 12 pasos cada uno => 60 calls/chunk en peor caso.
// Subimos el techo a la duración máxima de la plataforma.
export const maxDuration = 300;

const BodySchema = z.object({
  funnelId: z.string().uuid(),
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
    const { runId, summary } = await runFunnelTest(parsed);
    return Response.json({ ok: true, runId, summary });
  } catch (err) {
    return internalError(500, "/api/runs/funnel", err);
  }
}
