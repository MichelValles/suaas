"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseProfileForm } from "@/lib/profile-form";
import { updateProfile } from "@/lib/profiles";

export type EditProfileState = { ok: boolean; error?: string };

export async function updateProfileAction(
  _prev: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return { ok: false, error: "Falta el id del perfil." };
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  try {
    await updateProfile(id, parsed.input);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/profiles");
  revalidatePath(`/profiles/${id}`);
  redirect(`/profiles/${id}`);
}
