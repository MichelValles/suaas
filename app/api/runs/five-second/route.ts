import { z } from "zod";
import { isGatewayConfigured } from "@/lib/gateway";
import { runFiveSecondTest } from "@/lib/experiments/five-second";

export const runtime = "nodejs";
// 5 perfiles en paralelo · ~25 s por chunk · permite hasta 4 chunks (20 perfiles).
export const maxDuration = 300;

const BodySchema = z.object({
  targetId: z.string().uuid(),
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
    const { runId, summary } = await runFiveSecondTest(parsed);
    return Response.json({ ok: true, runId, summary });
  } catch (err) {
    const e = err as Error;
    console.error("[/api/runs/five-second] error", {
      message: e.message,
      stack: e.stack,
      cause: (e as { cause?: unknown }).cause,
    });
    return jsonError(500, e.message);
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
