"use server";

import { track } from "@vercel/analytics/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseProfileForm } from "@/lib/profile-form";
import { createProfile } from "@/lib/profiles";

export type CreateProfileState = {
  ok: boolean;
  error?: string;
};

export async function createProfileAction(
  _prev: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  let id: string;
  try {
    const created = await createProfile(parsed.input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/profiles");
  await track("profile_created", { source: "manual" });
  redirect(`/profiles/${id}`);
}
