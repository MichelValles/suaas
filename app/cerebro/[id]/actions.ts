"use server";

import { revalidatePath } from "next/cache";
import {
  addBrandDocument,
  BrandDocumentInputSchema,
  BrandDocumentUpdateSchema,
  BrandInputSchema,
  deleteBrandDocument,
  updateBrand,
  updateBrandDocument,
} from "@/lib/cerebro";

export type DetailState = { ok: boolean; error?: string; doneAt?: number };

export async function updateBrandAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  try {
    if (!id) throw new Error("Falta el identificador de la marca.");
    const input = BrandInputSchema.parse({ name, description });
    await updateBrand(id, input);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath(`/cerebro/${id}`);
  revalidatePath("/cerebro");
  return { ok: true, doneAt: Date.now() };
}

export async function addBrandDocumentAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const brand_id = String(formData.get("brand_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "nota").trim() || "nota";
  const content = String(formData.get("content") ?? "").trim();
  const sensitive = formData.get("sensitive") === "on";
  try {
    const input = BrandDocumentInputSchema.parse({
      brand_id,
      title,
      kind,
      content,
      sensitive,
    });
    await addBrandDocument(input);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath(`/cerebro/${brand_id}`);
  return { ok: true, doneAt: Date.now() };
}

export async function updateBrandDocumentAction(
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const id = String(formData.get("id") ?? "");
  const brand_id = String(formData.get("brand_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "nota").trim() || "nota";
  const content = String(formData.get("content") ?? "").trim();
  const sensitive = formData.get("sensitive") === "on";
  try {
    if (!id) throw new Error("Falta el identificador del documento.");
    const input = BrandDocumentUpdateSchema.parse({ title, kind, content, sensitive });
    await updateBrandDocument(id, input);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath(`/cerebro/${brand_id}`);
  return { ok: true, doneAt: Date.now() };
}

export async function deleteBrandDocumentAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const brand_id = String(formData.get("brand_id") ?? "");
  if (!id) return;
  await deleteBrandDocument(id);
  revalidatePath(`/cerebro/${brand_id}`);
}
