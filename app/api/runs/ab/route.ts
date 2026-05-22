import { z } from "zod";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import { runAbTest } from "@/lib/experiments/ab";
import { isGatewayConfigured } from "@/lib/gateway";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  abTestId: z.string().uuid(),
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
    const result = await runAbTest(parsed);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return internalError(500, "/api/runs/ab", err);
  }
}
