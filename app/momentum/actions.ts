"use server";

import { redirect } from "next/navigation";
import { deleteMomentumChallenge } from "@/lib/momentum";

export async function deleteMomentumChallengeAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID requerido.");
  await deleteMomentumChallenge(id);
  redirect("/momentum");
}
