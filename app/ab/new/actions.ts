"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AbTestInputSchema, createAbTest } from "@/lib/ab";

export type CreateAbState = { ok: boolean; error?: string };

export async function createAbAction(
  _prev: CreateAbState,
  formData: FormData,
): Promise<CreateAbState> {
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    hypothesis: String(formData.get("hypothesis") ?? "").trim() || null,
    target_a_id: String(formData.get("target_a_id") ?? ""),
    target_b_id: String(formData.get("target_b_id") ?? ""),
  };
  let id: string;
  try {
    const input = AbTestInputSchema.parse(raw);
    const created = await createAbTest(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/ab");
  redirect(`/ab/${id}`);
}
