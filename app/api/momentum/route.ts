import { NextResponse } from "next/server";
import { internalError, serviceUnavailable, validationError } from "@/lib/error-response";
import { createMomentumChallenge } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateMomentumSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  trigger_scenario: z.string().min(1, "El escenario de activación es obligatorio."),
  brand_context: z.string().optional(),
  profile_ids: z
    .array(z.string().uuid())
    .min(1, "Selecciona al menos un perfil."),
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
  const parsed = CreateMomentumSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map((i) => i.message).join("; "),
    );
  }
  try {
    const challenge = await createMomentumChallenge(parsed.data);
    return NextResponse.json({ ok: true, challenge });
  } catch (err) {
    return internalError(500, "/api/momentum:POST", err);
  }
}
