import { internalError, validationError } from "@/lib/error-response";
import { softDeleteProfile } from "@/lib/profiles";

export const runtime = "nodejs";

/**
 * DELETE · envía el perfil a la papelera (soft delete). El borrado
 * definitivo (que destruye runs y respuestas en cascada) solo es
 * posible desde /trash vía DELETE /api/trash/profiles/[id].
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return validationError("Falta id");
  }
  try {
    await softDeleteProfile(id);
    return Response.json({ ok: true });
  } catch (err) {
    return internalError(500, "/api/profiles/[id]:DELETE", err);
  }
}
