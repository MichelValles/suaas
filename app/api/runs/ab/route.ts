import { z } from "zod";
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
    return jsonError(503, "AI Gateway no configurado.");
  }
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return jsonError(400, (err as Error).message);
  }
  try {
    const result = await runAbTest(parsed);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const e = err as Error;
    console.error("[/api/runs/ab] error", { message: e.message, stack: e.stack });
    return jsonError(500, e.message);
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
