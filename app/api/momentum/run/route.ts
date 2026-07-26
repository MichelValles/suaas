import { NextResponse } from "next/server";
import { track } from "@vercel/analytics/server";
import { budgetGate } from "@/lib/budget";
import { getRunsModel } from "@/lib/chat-models";
import { internalError, serviceUnavailable, validationError } from "@/lib/error-response";
import { runMomentumChallenge } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Errores de negocio de runMomentumChallenge: mensajes nuestros, seguros
 * para el cliente. Cualquier otro error (Supabase, gateway) se higieniza.
 */
const BUSINESS_ERRORS = new Set([
  "Trigger de Momentum no encontrado.",
  "El análisis ya está en marcha.",
  "El Trigger no tiene perfiles asignados.",
  "Máximo 20 perfiles por Trigger.",
  "El Trigger está en la papelera: restáuralo antes de lanzarlo.",
]);

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return serviceUnavailable("Supabase no configurado.");
  }
  const gate = await budgetGate();
  if (gate) return gate;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("JSON inválido.");
  }
  const challengeId = (body as Record<string, unknown>)?.challengeId;
  if (typeof challengeId !== "string" || !challengeId) {
    return validationError("challengeId requerido.");
  }
  try {
    const challenge = await runMomentumChallenge(challengeId);
    // Telemetría de producto (best-effort): kind + nº de perfiles + modelo.
    await track("run_launched", {
      kind: "momentum",
      profiles: challenge.profile_ids.length,
      model: await getRunsModel().catch(() => "unknown"),
      source: "ui",
    }).catch(() => {});
    return NextResponse.json({ ok: true, challenge });
  } catch (err) {
    const message = (err as Error).message;
    if (BUSINESS_ERRORS.has(message)) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    return internalError(500, "/api/momentum/run:POST", err);
  }
}
