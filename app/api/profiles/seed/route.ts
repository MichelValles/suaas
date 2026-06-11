import { cookies } from "next/headers";
import { z } from "zod";
import { budgetGate } from "@/lib/budget";
import { isGatewayConfigured } from "@/lib/gateway";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import { PROFILE_SEEDS, streamSeededProfiles, type ProfileSeedEvent } from "@/lib/seed-profiles";

export const runtime = "nodejs";
// 48 perfiles · chunks de 4 · ~12 chunks · ~6-10 s por chunk con Opus ⇒ <120 s.
// Margen generoso.
export const maxDuration = 300;

const BodySchema = z.object({
  n: z.number().int().min(1).max(PROFILE_SEEDS.length).default(48),
});

function frame(obj: ProfileSeedEvent | { type: "fatal"; message: string }): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

export async function POST(request: Request) {
  // Mismo gate que /api/seed/examples: la siembra consume tokens de Opus.
  const jar = await cookies();
  if (jar.get(SEED_COOKIE)?.value !== SEED_VALUE) {
    return new Response(
      JSON.stringify({ ok: false, error: "Acceso a la siembra de perfiles no autorizado." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isGatewayConfigured()) {
    return new Response(
      JSON.stringify({ ok: false, error: "AI Gateway no configurado." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  // La siembra usa Opus (el modelo caro): mismo gate de presupuesto diario
  // que los runs.
  const gate = await budgetGate();
  if (gate) return gate;

  let n: number;
  try {
    const parsed = BodySchema.parse(await request.json().catch(() => ({})));
    n = parsed.n;
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamSeededProfiles(n)) {
          controller.enqueue(frame(event));
        }
      } catch (err) {
        controller.enqueue(frame({ type: "fatal", message: (err as Error).message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
