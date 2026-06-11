import { type NextRequest } from "next/server";
import { BudgetExceededError, assertBudget } from "@/lib/budget";
import {
  OnboardPayloadSchema,
  synthesizeProfile,
  type SynthEvent,
} from "@/lib/onboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================
// Rate limit en memoria (best effort, no cross-instance).
// 5 submits por IP / hora. Tope global 50/día como circuit breaker.
// ============================================================
const RATE: Map<string, number[]> = new Map();
const GLOBAL: number[] = [];
const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 50;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function checkRateLimit(ip: string): { ok: true } | { ok: false; reason: string } {
  const now = Date.now();
  // Limpia global
  while (GLOBAL.length && GLOBAL[0] < now - DAY) GLOBAL.shift();
  if (GLOBAL.length >= GLOBAL_LIMIT) {
    return {
      ok: false,
      reason: "Demasiados onboardings hoy. Vuelve a probar mañana o avisa al admin.",
    };
  }
  // Limpia por IP
  const arr = RATE.get(ip) ?? [];
  const recent = arr.filter((t) => t > now - HOUR);
  if (recent.length >= PER_IP_LIMIT) {
    return {
      ok: false,
      reason: "Has enviado varios formularios en poco rato. Espera una hora.",
    };
  }
  recent.push(now);
  RATE.set(ip, recent);
  GLOBAL.push(now);
  return { ok: true };
}

// ============================================================
// POST /api/onboard/submit
// Stream NDJSON con frames de fase + done/error.
// ============================================================
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Validación temprana antes de abrir el stream.
  const parsed = OnboardPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Rate limit.
  const ip = clientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: rate.reason }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  // Presupuesto diario: única ruta pública que dispara LLM (y con Opus).
  // Mensaje genérico a propósito: no filtrar nombres de env vars ni detalles
  // internos a visitantes anónimos (regla A-02 de la auditoría).
  try {
    await assertBudget();
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return new Response(
        JSON.stringify({
          error: "El servicio está saturado ahora mismo. Vuelve a intentarlo en unas horas.",
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }
    // Fallo leyendo el consumo: no bloquea (la telemetría no tumba el flujo).
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function write(event: SynthEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }
      try {
        for await (const ev of synthesizeProfile(parsed.data)) {
          write(ev);
          if ("done" in ev || "error" in ev) break;
        }
      } catch (err) {
        console.error("[onboard/submit] stream failed", err);
        write({ error: true, message: "Error interno." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-store",
    },
  });
}

