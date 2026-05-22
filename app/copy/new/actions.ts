"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CopyDeckInputSchema, createCopyDeck } from "@/lib/copy";

export type CreateCopyState = { ok: boolean; error?: string };

export async function createCopyAction(
  _prev: CreateCopyState,
  formData: FormData,
): Promise<CreateCopyState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const context = String(formData.get("context") ?? "").trim() || null;
  let rawBlocks: unknown;
  try {
    rawBlocks = JSON.parse(String(formData.get("blocks_json") ?? ""));
  } catch {
    return { ok: false, error: "Estructura de bloques corrupta." };
  }
  let id: string;
  try {
    const input = CopyDeckInputSchema.parse({
      name,
      description,
      context,
      blocks: rawBlocks,
    });
    const created = await createCopyDeck(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/copy");
  redirect(`/copy/${id}`);
}
