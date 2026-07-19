import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Un run legítimo nunca supera los 300 s de maxDuration: 1 hora da margen. */
const STALE_MS = 60 * 60 * 1000;

/**
 * Reaper diario anti-zombi (hallazgos B-01/B-03): si una función muere por
 * timeout, GEO y Momentum dejan la fila en status='running' para siempre y el
 * lock optimista impide relanzar. Este cron marca 'error' todo running con
 * más de 1 hora sin actualizarse. Los runs de campaña quedan reanudables
 * (prepareCampaignResume acepta zombis en running o error parcial).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase no configurado." },
      { status: 503 },
    );
  }
  try {
    const supa = getServerClient();
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const now = new Date().toISOString();

    const { data: geo, error: geoError } = await supa
      .from("geo_analyses")
      .update({ status: "error", updated_at: now })
      .eq("status", "running")
      .lt("updated_at", cutoff)
      .select("id");
    if (geoError) throw new Error(geoError.message);

    const { data: momentum, error: momentumError } = await supa
      .from("momentum_challenges")
      .update({ status: "error", updated_at: now })
      .eq("status", "running")
      .lt("updated_at", cutoff)
      .select("id");
    if (momentumError) throw new Error(momentumError.message);

    const { data: runs, error: runsError } = await supa
      .from("runs")
      .update({ status: "error" })
      .eq("status", "running")
      .lt("created_at", cutoff)
      .select("id");
    if (runsError) throw new Error(runsError.message);

    return NextResponse.json({
      ok: true,
      reaped: {
        geo_analyses: geo?.length ?? 0,
        momentum_challenges: momentum?.length ?? 0,
        runs: runs?.length ?? 0,
      },
    });
  } catch (err) {
    console.error("[cron/reaper]", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Fallo del reaper." },
      { status: 500 },
    );
  }
}
