"use server";

import { revalidatePath } from "next/cache";
import { updateProfileOptimizedFor } from "@/lib/profiles";

export type OptimizedForState = { ok: boolean; error?: string };

/**
 * Actualiza el cliente para el que se ha modelado un perfil desde la ficha.
 * Se enlaza con `bind(null, profileId)` para usarse con useActionState.
 */
export async function setOptimizedForAction(
  profileId: string,
  _prev: OptimizedForState,
  formData: FormData,
): Promise<OptimizedForState> {
  try {
    const value = String(formData.get("optimized_for") ?? "");
    await updateProfileOptimizedFor(profileId, value);
    revalidatePath(`/profiles/${profileId}`);
    revalidatePath("/profiles");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
