import { internalError, validationError } from "@/lib/error-response";
import { deleteProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return validationError("Falta id");
  }
  try {
    await deleteProfile(id);
    return Response.json({ ok: true });
  } catch (err) {
    return internalError(500, "/api/profiles/[id]:DELETE", err);
  }
}
