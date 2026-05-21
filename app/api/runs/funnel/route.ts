import { z } from "zod";
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
    return jsonError(503, "AI Gateway no configurado.");
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return jsonError(400, (err as Error).message);
  }

  try {
    const { runId, summary } = await runFunnelTest(parsed);
    return Response.json({ ok: true, runId, summary });
  } catch (err) {
    const e = err as Error;
    console.error("[/api/runs/funnel] error", {
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
