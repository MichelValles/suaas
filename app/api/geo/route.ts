import { NextResponse } from "next/server";
import { internalError, serviceUnavailable, validationError } from "@/lib/error-response";
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
    return serviceUnavailable("Supabase no configurado.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("JSON inválido.");
  }
  const parsed = CreateGeoSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  try {
    const analysis = await createGeoAnalysis(parsed.data);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return internalError(500, "/api/geo:POST", err);
  }
}
