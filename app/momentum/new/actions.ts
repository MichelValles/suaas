"use server";

import { redirect } from "next/navigation";
import { createMomentumChallenge } from "@/lib/momentum";
import { updateProfileIntentContext } from "@/lib/profiles";

export async function createMomentumChallengeAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const trigger_scenario = (formData.get("trigger_scenario") as string)?.trim();
  const brand_context = (formData.get("brand_context") as string)?.trim() || undefined;
  const profile_ids_raw = formData.get("profile_ids") as string;

  if (!name || !trigger_scenario) throw new Error("Nombre y escenario son obligatorios.");

  let profile_ids: string[] = [];
  try {
    profile_ids = JSON.parse(profile_ids_raw || "[]");
  } catch {
    throw new Error("profile_ids inválido.");
  }

  if (profile_ids.length === 0) throw new Error("Selecciona al menos un perfil.");

  const challenge = await createMomentumChallenge({
    name,
    trigger_scenario,
    brand_context,
    profile_ids,
  });

  redirect(`/momentum/${challenge.id}`);
}

export async function saveProfileIntentAction(
  profileId: string,
  intent: string,
): Promise<void> {
  if (!profileId) throw new Error("Profile ID requerido.");
  await updateProfileIntentContext(profileId, intent);
}
