"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteProfile } from "@/lib/profiles";

export type DeleteProfileState = { ok: boolean; error?: string };

export async function deleteProfileAction(
  _prev: DeleteProfileState,
  formData: FormData,
): Promise<DeleteProfileState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Falta el id del perfil." };
  try {
    await deleteProfile(id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/profiles");
  return { ok: true };
}

export async function deleteProfileAndRedirect(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await deleteProfile(id);
  revalidatePath("/profiles");
  redirect("/profiles");
}
