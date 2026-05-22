import { z } from "zod";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import { runCampaignTest } from "@/lib/experiments/campaign";
import { isGatewayConfigured } from "@/lib/gateway";

export const runtime = "nodejs";
// 5 queries × 20 perfiles = 100 evals snippet + ~60 landing + 100 ideal.
// En el peor caso son ~260 calls; con chunks de 4 perfiles y paralelismo intra-perfil
// secuencial por queries, el techo razonable es 300s.
export const maxDuration = 300;

const BodySchema = z.object({
  campaignId: z.string().uuid(),
  profileIds: z.array(z.string().uuid()).min(1).max(20),
});

export async function POST(request: Request) {
  if (!isGatewayConfigured()) {
    return serviceUnavailable("AI Gateway no configurado.");
  }
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return validationError((err as Error).message);
  }
  try {
    const { runId, summary } = await runCampaignTest(parsed);
    return Response.json({ ok: true, runId, summary });
  } catch (err) {
    return internalError(500, "/api/runs/campaign", err);
  }
}
