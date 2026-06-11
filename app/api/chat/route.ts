import { z } from "zod";
import type { ModelMessage } from "ai";
import { budgetGate } from "@/lib/budget";
import {
  internalError,
  serviceUnavailable,
  validationError,
} from "@/lib/error-response";
import { isGatewayConfigured } from "@/lib/gateway";
import { getProfile } from "@/lib/profiles";
import {
  appendMessage,
  createRun,
  listEffortValues,
  listMessages,
  markRunFinished,
  nextTurn,
  upsertMetric,
} from "@/lib/runs";
import { reason, talkStream } from "@/lib/agents";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";
import { recordUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  profileId: z.string().uuid(),
  message: z.string().min(1).max(8000),
  // Acepta string UUID, undefined o null. El cliente envía null antes de
  // que exista el primer run; convertirlo aquí evita un 400 innecesario.
  runId: z.string().uuid().nullish(),
});

type Frame =
  | { type: "meta"; runId: string; humanTurn: number; reasonerTurn: number; talkerTurn: number; plan: unknown }
  | { type: "delta"; text: string }
  | { type: "done"; latencyMs: number; effortRatio: number | null }
  | { type: "error"; message: string };

function frame(obj: Frame): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

export async function POST(request: Request) {
  if (!isGatewayConfigured()) {
    return serviceUnavailable("AI Gateway no configurado.");
  }
  // Cada turno son 2 llamadas (reasoner Opus + talker Sonnet): mismo gate
  // de presupuesto diario que los runs.
  const gate = await budgetGate();
  if (gate) return gate;

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return validationError((err as Error).message);
  }

  let profile;
  try {
    profile = await getProfile(parsed.profileId);
  } catch (err) {
    return internalError(500, "/api/chat:getProfile", err);
  }
  if (!profile) {
    return new Response(
      JSON.stringify({ ok: false, error: "Perfil no encontrado." }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Run: nuevo o existente.
  const runId =
    parsed.runId ??
    (await createRun({ profile_id: profile.id, kind: "chat" })).id;

  // Historial conversacional para el modelo (sólo human + talker).
  const previous = parsed.runId ? await listMessages(runId) : [];
  const history: ModelMessage[] = previous
    .filter((m) => m.role === "human" || m.role === "talker")
    .map((m) => ({
      role: m.role === "human" ? "user" : "assistant",
      content: m.content,
    }));

  // Persistir turno humano antes de razonar.
  const humanTurn = await nextTurn(runId);
  await appendMessage({
    run_id: runId,
    turn: humanTurn,
    role: "human",
    content: parsed.message,
    meta: null,
  });

  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1) Reasoner
        const reasonerResult = await reason({
          profile,
          history,
          message: parsed.message,
        });

        await recordUsage({
          runId,
          scope: "reasoner_chat",
          model: REASONER_MODEL,
          usage: reasonerResult.usage,
          meta: { latency_ms: reasonerResult.latencyMs },
        });

        const reasonerTurn = humanTurn + 1;
        await appendMessage({
          run_id: runId,
          turn: reasonerTurn,
          role: "reasoner",
          content: reasonerResult.plan.plan,
          meta: {
            model: reasonerResult.model,
            latency_ms: reasonerResult.latencyMs,
            usage: reasonerResult.usage,
            plan: reasonerResult.plan,
            cot: true,
          },
        });

        const talkerTurn = reasonerTurn + 1;

        controller.enqueue(
          frame({
            type: "meta",
            runId,
            humanTurn,
            reasonerTurn,
            talkerTurn,
            plan: reasonerResult.plan,
          }),
        );

        // 2) Talker (streaming)
        const talker = talkStream({
          profile,
          plan: reasonerResult.plan,
          history,
          message: parsed.message,
        });

        let fullText = "";
        for await (const delta of talker.textStream) {
          fullText += delta;
          controller.enqueue(frame({ type: "delta", text: delta }));
        }

        const talkerUsage = await talker.usage;
        await appendMessage({
          run_id: runId,
          turn: talkerTurn,
          role: "talker",
          content: fullText,
          meta: {
            model: (await talker.providerMetadata) ?? null,
            latency_ms: Date.now() - startedAt,
            usage: talkerUsage ?? null,
          },
        });

        await recordUsage({
          runId,
          scope: "talker_chat",
          model: DEFAULT_MODEL,
          usage: talkerUsage ?? null,
          meta: { latency_ms: Date.now() - startedAt },
        });

        // 3) Metric: effort_ratio = media de effort sobre los turnos reasoner.
        const efforts = await listEffortValues(runId);
        const effortRatio =
          efforts.length === 0
            ? null
            : efforts.reduce((a, b) => a + b, 0) / efforts.length;
        if (effortRatio !== null) {
          await upsertMetric({
            run_id: runId,
            key: "effort_ratio",
            value: effortRatio,
            unit: "0..1",
          });
        }

        await markRunFinished(runId, "done");

        controller.enqueue(
          frame({
            type: "done",
            latencyMs: Date.now() - startedAt,
            effortRatio,
          }),
        );
      } catch (err) {
        const e = err as Error & { cause?: unknown };
        console.error("[/api/chat] stream error", {
          message: e.message,
          stack: e.stack,
          cause: e.cause,
        });
        await markRunFinished(runId, "error").catch(() => {});
        controller.enqueue(frame({ type: "error", message: "Error interno." }));
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

