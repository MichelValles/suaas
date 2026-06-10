"use server";

import { redirect } from "next/navigation";
import { softDeleteMomentumChallenge } from "@/lib/momentum";

export async function deleteMomentumChallengeAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID requerido.");
  await softDeleteMomentumChallenge(id);
  redirect("/momentum");
}
