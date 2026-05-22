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
  if (!isTrashType(type)) {
    return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!id) {
    return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
  }
  try {
    await sendToTrash(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** DELETE · borrado definitivo desde la papelera. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isTrashType(type)) {
    return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!id) {
    return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
  }
  try {
    await hardDelete(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** PATCH · restaurar desde la papelera. */
export async function PATCH(_req: Request, ctx: Ctx) {
  const { type, id } = await ctx.params;
  if (!isTrashType(type)) {
    return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }
  if (!id) {
    return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
  }
  try {
    await restoreFromTrash(type, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
