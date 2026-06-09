import { NextResponse } from "next/server";
import { runGeoAnalysis } from "@/lib/geo";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const geoId = (body as Record<string, unknown>)?.geoId;
  if (typeof geoId !== "string" || !geoId) {
    return NextResponse.json({ error: "geoId requerido." }, { status: 400 });
  }
  try {
    const analysis = await runGeoAnalysis(geoId);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
