import { deleteProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return Response.json({ ok: false, error: "Falta id" }, { status: 400 });
  }
  try {
    await deleteProfile(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
