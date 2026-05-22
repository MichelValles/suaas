import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export const PricingLevelInputSchema = z.object({
  label: z.string().optional().nullable(),
  price: z.number().positive("El precio debe ser positivo."),
});
export type PricingLevelInput = z.infer<typeof PricingLevelInputSchema>;

export const PricingOfferInputSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().min(10, "Describe la oferta (al menos 10 caracteres)."),
  currency: z.string().min(1).default("EUR"),
  anchor_price: z.number().positive().optional().nullable(),
  prices: z
    .array(PricingLevelInputSchema)
    .min(2, "La oferta necesita al menos 2 niveles de precio.")
    .max(8, "Máximo 8 niveles de precio."),
});
export type PricingOfferInput = z.infer<typeof PricingOfferInputSchema>;

export type PricingPrice = {
  id: string;
  created_at: string;
  offer_id: string;
  position: number;
  label: string | null;
  price: number;
};

export type PricingOffer = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  currency: string;
  anchor_price: number | null;
};

export type PricingOfferWithPrices = PricingOffer & { prices: PricingPrice[] };

export async function listPricingOffers(): Promise<
  Array<PricingOffer & { price_count: number }>
> {
  const supa = getServerClient();
  const { data: offers, error } = await supa
    .from("pricing_offers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!offers || offers.length === 0) return [];
  const ids = offers.map((o) => o.id);
  const { data: prices, error: pErr } = await supa
    .from("pricing_prices")
    .select("offer_id")
    .in("offer_id", ids);
  if (pErr) throw new Error(pErr.message);
  const counts = new Map<string, number>();
  for (const row of prices ?? []) {
    counts.set(row.offer_id, (counts.get(row.offer_id) ?? 0) + 1);
  }
  return offers.map((o) => ({
    ...(o as PricingOffer),
    price_count: counts.get(o.id) ?? 0,
  }));
}

export async function getPricingOffer(
  id: string,
): Promise<PricingOfferWithPrices | null> {
  const supa = getServerClient();
  const { data: offer, error } = await supa
    .from("pricing_offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!offer) return null;
  const { data: prices, error: pErr } = await supa
    .from("pricing_prices")
    .select("*")
    .eq("offer_id", id)
    .order("position", { ascending: true });
  if (pErr) throw new Error(pErr.message);
  return {
    ...(offer as PricingOffer),
    prices: (prices ?? []) as PricingPrice[],
  };
}

export async function createPricingOffer(
  input: PricingOfferInput,
): Promise<PricingOffer> {
  const parsed = PricingOfferInputSchema.parse(input);
  const supa = getServerClient();
  const { data: offer, error } = await supa
    .from("pricing_offers")
    .insert({
      name: parsed.name,
      description: parsed.description,
      currency: parsed.currency,
      anchor_price: parsed.anchor_price ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const priceRows = parsed.prices.map((p, idx) => ({
    offer_id: offer.id,
    position: idx + 1,
    label: p.label ?? null,
    price: p.price,
  }));
  const { error: pErr } = await supa.from("pricing_prices").insert(priceRows);
  if (pErr) {
    await supa.from("pricing_offers").delete().eq("id", offer.id);
    throw new Error(pErr.message);
  }
  return offer as PricingOffer;
}
