"use server";

import { redirect } from "next/navigation";
import { deleteGeoAnalysis } from "@/lib/geo";

export async function deleteGeoAnalysisAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) throw new Error("ID requerido.");
  await deleteGeoAnalysis(id);
  redirect("/geo");
}
