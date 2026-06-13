"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BrandInputSchema, createBrand } from "@/lib/cerebro";

export type CreateBrandState = { ok: boolean; error?: string };

export async function createBrandAction(
  _prev: CreateBrandState,
  formData: FormData,
): Promise<CreateBrandState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  let id: string;
  try {
    const input = BrandInputSchema.parse({ name, description });
    const created = await createBrand(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/cerebro");
  redirect(`/cerebro/${id}`);
}
