import { NextResponse } from "next/server";
import { runMomentumChallenge } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const challengeId = (body as Record<string, unknown>)?.challengeId;
  if (typeof challengeId !== "string" || !challengeId) {
    return NextResponse.json({ error: "challengeId requerido." }, { status: 400 });
  }
  try {
    const challenge = await runMomentumChallenge(challengeId);
    return NextResponse.json({ ok: true, challenge });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
