import { NextResponse } from "next/server";
import { createGeoAnalysis, SegmentInputSchema } from "@/lib/geo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateGeoSchema = z.object({
  name: z.string().min(1),
  brand_name: z.string().min(1),
  brand_description: z.string().min(1),
  segments: z.array(SegmentInputSchema).min(1).max(10),
});

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
  const parsed = CreateGeoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  try {
    const analysis = await createGeoAnalysis(parsed.data);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
