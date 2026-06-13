import { NextResponse } from "next/server";
import { generateProfileAvatar } from "@/lib/avatar";
import { internalError, serviceUnavailable, validationError } from "@/lib/error-response";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// La generación de imagen tarda 10-30 s; margen holgado.
export const maxDuration = 120;

/** Mensajes de negocio nuestros, seguros para el cliente. */
const BUSINESS_ERRORS = new Set([
  "Perfil no encontrado.",
  "Vercel Blob no está configurado (falta BLOB_READ_WRITE_TOKEN): no hay dónde guardar el retrato.",
]);

/** POST · genera (o regenera) el retrato fotorrealista del perfil. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return serviceUnavailable("Supabase no configurado.");
  }
  const { id } = await context.params;
  if (!id) return validationError("Falta id");

  try {
    const result = await generateProfileAvatar(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (BUSINESS_ERRORS.has(message)) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    // Sin créditos en el gateway: 402 con mensaje accionable.
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 402 || /credit|insufficient.*funds|payment/i.test(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sin créditos en el AI Gateway. Recarga créditos en Vercel (AI Gateway → Billing) y vuelve a intentarlo.",
        },
        { status: 402 },
      );
    }
    return internalError(500, "/api/profiles/[id]/avatar:POST", err);
  }
}
