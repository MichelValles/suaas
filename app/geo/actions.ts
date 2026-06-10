"use server";

import { redirect } from "next/navigation";
import { softDeleteGeoAnalysis } from "@/lib/geo";

export async function deleteGeoAnalysisAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID requerido.");
  await softDeleteGeoAnalysis(id);
  redirect("/geo");
}
