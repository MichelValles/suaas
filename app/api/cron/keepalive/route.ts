import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Latido diario contra Supabase (plan Free: pausa el proyecto tras ~1 semana
 * sin actividad de API; incidente del 19-jul-2026). Lectura mínima más
 * registro del pulso en app_settings para poder auditar el último latido.
 * Vercel añade automáticamente `Authorization: Bearer <CRON_SECRET>` a las
 * invocaciones de cron cuando la env var CRON_SECRET existe en el proyecto.
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
  const startedAt = Date.now();
  try {
    const supa = getServerClient();
    const { error: readError } = await supa
      .from("app_settings")
      .select("key", { count: "exact", head: true });
    if (readError) throw new Error(readError.message);
    const { error: writeError } = await supa.from("app_settings").upsert({
      key: "keepalive",
      value: { at: new Date().toISOString(), latency_ms: Date.now() - startedAt },
      updated_at: new Date().toISOString(),
    });
    if (writeError) throw new Error(writeError.message);
    return NextResponse.json({ ok: true, latency_ms: Date.now() - startedAt });
  } catch (err) {
    console.error("[cron/keepalive]", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: "Fallo del latido." },
      { status: 500 },
    );
  }
}
