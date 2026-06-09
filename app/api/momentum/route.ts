import { NextResponse } from "next/server";
import { createMomentumChallenge } from "@/lib/momentum";
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
  const b = body as Record<string, unknown>;
  if (!b.name || !b.trigger_scenario || !Array.isArray(b.profile_ids)) {
    return NextResponse.json(
      { error: "name, trigger_scenario y profile_ids son requeridos." },
      { status: 400 },
    );
  }
  try {
    const challenge = await createMomentumChallenge({
      name: b.name as string,
      trigger_scenario: b.trigger_scenario as string,
      brand_context: typeof b.brand_context === "string" ? b.brand_context : undefined,
      profile_ids: b.profile_ids as string[],
    });
    return NextResponse.json({ ok: true, challenge });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
