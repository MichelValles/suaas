import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, isGatewayConfigured } from "@/lib/gateway";
import { getProfile } from "@/lib/profiles";
import {
  appendMessage,
  createRun,
  listMessages,
  nextTurn,
} from "@/lib/runs";
import { buildSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  profileId: z.string().uuid(),
  message: z.string().min(1).max(8000),
  runId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  if (!isGatewayConfigured()) {
    return Response.json(
      { ok: false, error: "AI Gateway no configurado." },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }

  const profile = await getProfile(parsed.profileId);
  if (!profile) {
    return Response.json({ ok: false, error: "Perfil no encontrado." }, { status: 404 });
  }

  const runId =
    parsed.runId ??
    (await createRun({ profile_id: profile.id, kind: "chat" })).id;

  const previous = parsed.runId ? await listMessages(runId) : [];

  const history: ModelMessage[] = previous
    .filter((m) => m.role === "human" || m.role === "talker")
    .map((m) => ({
      role: m.role === "human" ? "user" : "assistant",
      content: m.content,
    }));

  const systemPrompt = buildSystemPrompt(profile);

  const humanTurn = await nextTurn(runId);
  await appendMessage({
    run_id: runId,
    turn: humanTurn,
    role: "human",
    content: parsed.message,
    meta: null,
  });

  const startedAt = Date.now();
  const result = await generateText({
    model: DEFAULT_MODEL,
    system: systemPrompt,
    messages: [...history, { role: "user", content: parsed.message }],
  });
  const latencyMs = Date.now() - startedAt;

  const text = result.text ?? "";

  const talkerTurn = humanTurn + 1;
  await appendMessage({
    run_id: runId,
    turn: talkerTurn,
    role: "talker",
    content: text,
    meta: {
      model: DEFAULT_MODEL,
      latency_ms: latencyMs,
      usage: result.usage ?? null,
    },
  });

  return Response.json({ ok: true, runId, turn: talkerTurn, text });
}
