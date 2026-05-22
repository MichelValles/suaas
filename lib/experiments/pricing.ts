import { generateObject } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/gateway";
import {
  type PricingOfferWithPrices,
  type PricingPrice,
  getPricingOffer,
} from "@/lib/pricing";
import { buildSystemPrompt } from "@/lib/prompts";
import { type Profile, getProfile } from "@/lib/profiles";
import { createRun, markRunFinished, upsertMetric } from "@/lib/runs";
import { getServerClient } from "@/lib/supabase";
import { recordUsage } from "@/lib/usage";

/**
 * Experimento: Pricing / elasticidad.
 * Cada perfil reacciona a la oferta a cada uno de los precios candidatos:
 * compraría o no, willingness_to_pay 0..1 (qué tan justo le parece), perceived_value
 * 0..1 (qué tanto cree que vale la pena) y una crítica corta.
 */

export const PricingReactionSchema = z.object({
  would_buy: z.boolean(),
  willingness_to_pay: z.number().min(0).max(1),
  perceived_value: z.number().min(0).max(1),
  critique: z.string().min(1),
});
export type PricingReaction = z.infer<typeof PricingReactionSchema>;

export type PricingResponse = {
  profileId: string;
  priceId: string;
  position: number;
  label: string | null;
  price: number;
  reaction: PricingReaction;
};

export type PricingSummary = {
  n: number;
  currency: string;
  byPrice: Array<{
    priceId: string;
    position: number;
    label: string | null;
    price: number;
    would_buy_rate: number;
    wtp_mean: number;
    value_mean: number;
    n: number;
  }>;
  sweet_spot: { priceId: string; price: number; would_buy_rate: number } | null;
};

async function reactToPrice(
  profile: Profile,
  offer: PricingOfferWithPrices,
  price: PricingPrice,
): Promise<{ output: PricingReaction; latencyMs: number; usage: unknown }> {
  const startedAt = Date.now();
  const anchor = offer.anchor_price
    ? `El precio actual de referencia es ${offer.anchor_price} ${offer.currency}.`
    : "";
  const result = await generateObject({
    model: DEFAULT_MODEL,
    schema: PricingReactionSchema,
    system: [
      buildSystemPrompt(profile),
      "",
      "## Tarea de este turno",
      `- Estás considerando una oferta: "${offer.name}".`,
      `- Descripción: ${offer.description}`,
      anchor,
      "- Vas a recibir un precio concreto. Reacciona como TÚ.",
      "- 'would_buy' = comprarías a ese precio dado tu contexto.",
      "- 'willingness_to_pay' 0..1 = cómo de justo te parece ese precio (1 = totalmente justo, 0 = abuso).",
      "- 'perceived_value' 0..1 = cuánto valor crees que recibirías (1 = mucho, 0 = nada).",
      "- 'critique' = 1-2 frases tuyas con el porqué, sin meta-comentarios.",
      "- No inventes promociones ni asumas ofertas paralelas. Solo este precio.",
    ]
      .filter(Boolean)
      .join("\n"),
    prompt: `Precio propuesto: ${price.price} ${offer.currency}${price.label ? ` (${price.label})` : ""}.`,
  });
  return {
    output: result.object,
    latencyMs: Date.now() - startedAt,
    usage: result.usage ?? null,
  };
}

export type RunPricingInput = { offerId: string; profileIds: string[] };
export type RunPricingOutput = { runId: string; summary: PricingSummary };

export async function runPricingTest(
  input: RunPricingInput,
): Promise<RunPricingOutput> {
  const offer = await getPricingOffer(input.offerId);
  if (!offer) throw new Error("Oferta no encontrada.");
  if (offer.prices.length < 2)
    throw new Error("La oferta necesita al menos 2 precios.");

  const profiles: Profile[] = [];
  for (const pid of input.profileIds) {
    const p = await getProfile(pid);
    if (!p) throw new Error(`Perfil ${pid} no encontrado.`);
    profiles.push(p);
  }
  if (profiles.length === 0) throw new Error("Sin perfiles para evaluar.");
  if (profiles.length > 20) throw new Error("Máximo 20 perfiles por run.");

  const run = await createRun({
    profile_id: profiles[0].id,
    kind: "pricing",
    pricing_offer_id: offer.id,
    params: { offerId: offer.id, profileIds: profiles.map((p) => p.id) },
  });

  try {
    const supa = getServerClient();
    const collected: PricingResponse[] = [];

    for (const chunk of chunks(profiles, 5)) {
      const results = await Promise.all(
        chunk.map(async (profile) => {
          const perPrice: PricingResponse[] = [];
          for (const price of offer.prices) {
            const reacted = await reactToPrice(profile, offer, price);
            await recordUsage({
              runId: run.id,
              scope: "pricing_react",
              model: DEFAULT_MODEL,
              usage: reacted.usage,
              meta: { latency_ms: reacted.latencyMs, price: price.price },
            }).catch(() => {});
            const row: PricingResponse = {
              profileId: profile.id,
              priceId: price.id,
              position: price.position,
              label: price.label,
              price: price.price,
              reaction: reacted.output,
            };
            perPrice.push(row);
            const { error } = await supa.from("pricing_responses").upsert(
              {
                run_id: run.id,
                profile_id: profile.id,
                price_id: price.id,
                would_buy: reacted.output.would_buy,
                willingness_to_pay: reacted.output.willingness_to_pay,
                perceived_value: reacted.output.perceived_value,
                critique: reacted.output.critique,
                meta: { model: DEFAULT_MODEL, latency_ms: reacted.latencyMs },
              },
              { onConflict: "run_id,profile_id,price_id" },
            );
            if (error) throw new Error(error.message);
          }
          return perPrice;
        }),
      );
      for (const arr of results) collected.push(...arr);
    }

    const summary = summarize(offer, profiles.length, collected);
    await upsertMetric({ run_id: run.id, key: "n", value: summary.n, unit: "count" });
    if (summary.sweet_spot) {
      await upsertMetric({
        run_id: run.id,
        key: "sweet_spot_price",
        value: summary.sweet_spot.price,
        unit: offer.currency,
      });
      await upsertMetric({
        run_id: run.id,
        key: "sweet_spot_buy_rate",
        value: summary.sweet_spot.would_buy_rate,
        unit: "0..1",
      });
    }

    await markRunFinished(run.id, "done");
    return { runId: run.id, summary };
  } catch (err) {
    await markRunFinished(run.id, "error").catch(() => {});
    throw err;
  }
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function summarize(
  offer: PricingOfferWithPrices,
  totalProfiles: number,
  responses: PricingResponse[],
): PricingSummary {
  const byPrice = offer.prices.map((p) => {
    const rs = responses.filter((r) => r.priceId === p.id);
    const n = rs.length || 1;
    return {
      priceId: p.id,
      position: p.position,
      label: p.label,
      price: p.price,
      would_buy_rate: rs.filter((r) => r.reaction.would_buy).length / n,
      wtp_mean: rs.reduce((a, r) => a + r.reaction.willingness_to_pay, 0) / n,
      value_mean: rs.reduce((a, r) => a + r.reaction.perceived_value, 0) / n,
      n: rs.length,
    };
  });
  // Sweet spot: el precio con mayor (would_buy_rate * price). Mezcla volumen y revenue.
  let sweet: PricingSummary["sweet_spot"] = null;
  let bestScore = -Infinity;
  for (const b of byPrice) {
    const score = b.would_buy_rate * b.price;
    if (score > bestScore) {
      bestScore = score;
      sweet = {
        priceId: b.priceId,
        price: b.price,
        would_buy_rate: b.would_buy_rate,
      };
    }
  }
  return { n: totalProfiles, currency: offer.currency, byPrice, sweet_spot: sweet };
}

export async function listPricingResponses(runId: string): Promise<PricingResponse[]> {
  const supa = getServerClient();
  const { data, error } = await supa
    .from("pricing_responses")
    .select("*, pricing_prices!inner(position, label, price)")
    .eq("run_id", runId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const price = (r as { pricing_prices: { position: number; label: string | null; price: number } })
      .pricing_prices;
    return {
      profileId: r.profile_id as string,
      priceId: r.price_id as string,
      position: price.position,
      label: price.label,
      price: price.price,
      reaction: {
        would_buy: r.would_buy as boolean,
        willingness_to_pay: r.willingness_to_pay as number,
        perceived_value: r.perceived_value as number,
        critique: r.critique as string,
      },
    };
  });
}

export function summarizePricingResponses(
  offer: PricingOfferWithPrices,
  totalProfiles: number,
  responses: PricingResponse[],
): PricingSummary {
  return summarize(offer, totalProfiles, responses);
}
