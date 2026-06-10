import { NextResponse } from "next/server";
import { budgetGate } from "@/lib/budget";
import { internalError, serviceUnavailable, validationError } from "@/lib/error-response";
import { runGeoAnalysis } from "@/lib/geo";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Errores de negocio de runGeoAnalysis: mensajes nuestros, seguros para
 * el cliente. Cualquier otro error (Supabase, gateway) se higieniza.
 */
const BUSINESS_ERRORS = new Set([
  "Análisis GEO no encontrado.",
  "El análisis ya está en marcha.",
  "El análisis está en la papelera: restáuralo antes de lanzarlo.",
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
  const geoId = (body as Record<string, unknown>)?.geoId;
  if (typeof geoId !== "string" || !geoId) {
    return validationError("geoId requerido.");
  }
  try {
    const analysis = await runGeoAnalysis(geoId);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    const message = (err as Error).message;
    if (BUSINESS_ERRORS.has(message)) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    return internalError(500, "/api/geo/run:POST", err);
  }
}
