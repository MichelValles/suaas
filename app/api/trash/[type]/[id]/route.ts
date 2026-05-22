import { internalError, validationError } from "@/lib/error-response";
import {
  hardDelete,
  isTrashType,
  restoreFromTrash,
  sendToTrash,
} from "@/lib/trash";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ type: string; id: string }> };

/** POST · enviar a papelera (soft delete). */
export async function POST(_req: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isTrashType(type)) return validationError("Tipo inválido");
  if (!id) return validationError("Falta id");
  try {
    await sendToTrash(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return internalError(500, "/api/trash:POST", err);
  }
}

/** DELETE · borrado definitivo desde la papelera. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isTrashType(type)) return validationError("Tipo inválido");
  if (!id) return validationError("Falta id");
  try {
    await hardDelete(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return internalError(500, "/api/trash:DELETE", err);
  }
}

/** PATCH · restaurar desde la papelera. */
export async function PATCH(_req: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isTrashType(type)) return validationError("Tipo inválido");
  if (!id) return validationError("Falta id");
  try {
    await restoreFromTrash(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return internalError(500, "/api/trash:PATCH", err);
  }
}
