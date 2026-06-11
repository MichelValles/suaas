import {
  ESTIMATE_KINDS,
  type EstimateKind,
  estimateAction,
  partsForKind,
} from "@/lib/estimate";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estimación de coste previa al lanzamiento de cualquier run, en tokens,
 * segundos y dólares, con las medias empíricas de gateway_usage.
 *
 * GET /api/estimate/run?kind=<kind>&profiles=<n>&perProfile=<k>&judge=1
 *
 * `perProfile` es el multiplicador que la página de detalle conoce: bloques
 * del deck (copy), precios (pricing), pasos (funnel), canales × queries
 * (campaign) o segmentos (geo). `judge=1` si la campaña define
 * intended_message. Sustituye al antiguo /api/estimate/campaign (v0.38.1).
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { ok: false, error: "Supabase no configurado." },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as EstimateKind | null;
  const profiles = Number(url.searchParams.get("profiles") ?? "1");
  const perProfile = Number(url.searchParams.get("perProfile") ?? "1");
  const judge = url.searchParams.get("judge") === "1";

  if (!kind || !ESTIMATE_KINDS.includes(kind)) {
    return Response.json(
      { ok: false, error: `kind requerido: ${ESTIMATE_KINDS.join(", ")}.` },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(profiles) ||
    profiles < 1 ||
    !Number.isInteger(perProfile) ||
    perProfile < 1
  ) {
    return Response.json(
      { ok: false, error: "profiles y perProfile deben ser enteros >= 1." },
      { status: 400 },
    );
  }

  const estimate = await estimateAction(
    partsForKind(kind, { profiles, perProfile, judge }),
  );
  return Response.json({ ok: true, ...estimate });
}
