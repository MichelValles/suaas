"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PricingOfferInputSchema, createPricingOffer } from "@/lib/pricing";

export type CreatePricingState = { ok: boolean; error?: string };

export async function createPricingAction(
  _prev: CreatePricingState,
  formData: FormData,
): Promise<CreatePricingState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const currency = (String(formData.get("currency") ?? "EUR").trim() || "EUR").toUpperCase();
  const anchorRaw = String(formData.get("anchor_price") ?? "").trim();
  const anchor = anchorRaw ? Number(anchorRaw) : null;
  let rawPrices: unknown;
  try {
    rawPrices = JSON.parse(String(formData.get("prices_json") ?? ""));
  } catch {
    return { ok: false, error: "Estructura de precios corrupta." };
  }
  if (!Array.isArray(rawPrices)) {
    return { ok: false, error: "Estructura de precios corrupta." };
  }
  const prices = (rawPrices as { label?: string; price?: number | string }[]).map((p) => ({
    label: p.label?.trim() || null,
    price: typeof p.price === "number" ? p.price : Number(p.price ?? 0),
  }));

  let id: string;
  try {
    const input = PricingOfferInputSchema.parse({
      name,
      description,
      currency,
      anchor_price: anchor ?? null,
      prices,
    });
    const created = await createPricingOffer(input);
    id = created.id;
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/pricing");
  redirect(`/pricing/${id}`);
}
