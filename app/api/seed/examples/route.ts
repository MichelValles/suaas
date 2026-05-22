import { cookies } from "next/headers";
import { z } from "zod";
import { runAbTest } from "@/lib/experiments/ab";
import { runCampaignTest } from "@/lib/experiments/campaign";
import { runCopyTest } from "@/lib/experiments/copy";
import { runFiveSecondTest } from "@/lib/experiments/five-second";
import { runFunnelTest } from "@/lib/experiments/funnel";
import { runPricingTest } from "@/lib/experiments/pricing";
import { isGatewayConfigured } from "@/lib/gateway";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import {
  pickRandomProfileIds,
  seedAbExample,
  seedCampaignExample,
  seedCopyExample,
  seedFiveSecondExample,
  seedFunnelExample,
  seedPricingExample,
} from "@/lib/seed-examples";

export const runtime = "nodejs";
// 6 ejemplos + 6 runs paralelos (con 3 perfiles cada uno) → margen amplio.
export const maxDuration = 300;

const KIND_VALUES = ["clarity", "copy", "pricing", "ab", "funnel", "campaign"] as const;
type Kind = (typeof KIND_VALUES)[number];

const BodySchema = z.object({
  launch: z.number().int().min(0).max(10).optional().default(0),
  kinds: z.array(z.enum(KIND_VALUES)).optional(),
});

type ExampleResult =
  | { kind: "clarity"; ok: true; targetId: string; runId?: string; error?: undefined }
  | { kind: "copy"; ok: true; deckId: string; runId?: string; error?: undefined }
  | { kind: "pricing"; ok: true; offerId: string; runId?: string; error?: undefined }
  | { kind: "ab"; ok: true; abTestId: string; runIds?: string[]; error?: undefined }
  | { kind: "funnel"; ok: true; funnelId: string; runId?: string; error?: undefined }
  | { kind: "campaign"; ok: true; campaignId: string; runId?: string; error?: undefined }
  | { kind: string; ok: false; error: string };

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(SEED_COOKIE)?.value !== SEED_VALUE) {
    return Response.json(
      { ok: false, error: "Acceso a /seed-examples no autorizado." },
      { status: 401 },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json().catch(() => ({})));
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 400 },
    );
  }
  const { launch } = body;
  if (launch > 0 && !isGatewayConfigured()) {
    return Response.json(
      { ok: false, error: "AI Gateway no configurado y se pidió launch > 0." },
      { status: 503 },
    );
  }

  const selected: Set<Kind> = new Set(
    body.kinds && body.kinds.length > 0 ? body.kinds : KIND_VALUES,
  );

  const profileIds = launch > 0 ? await pickRandomProfileIds(launch) : [];
  const results: ExampleResult[] = [];

  // ============================================================
  // Claridad 5s
  // ============================================================
  if (selected.has("clarity")) {
    try {
      const { targetId } = await seedFiveSecondExample();
      let runId: string | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runId: rid } = await runFiveSecondTest({ targetId, profileIds });
        runId = rid;
      }
      results.push({ kind: "clarity", ok: true, targetId, runId });
    } catch (err) {
      results.push({ kind: "clarity", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // Copy
  // ============================================================
  if (selected.has("copy")) {
    try {
      const { deckId } = await seedCopyExample();
      let runId: string | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runId: rid } = await runCopyTest({ deckId, profileIds });
        runId = rid;
      }
      results.push({ kind: "copy", ok: true, deckId, runId });
    } catch (err) {
      results.push({ kind: "copy", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // Pricing
  // ============================================================
  if (selected.has("pricing")) {
    try {
      const { offerId } = await seedPricingExample();
      let runId: string | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runId: rid } = await runPricingTest({ offerId, profileIds });
        runId = rid;
      }
      results.push({ kind: "pricing", ok: true, offerId, runId });
    } catch (err) {
      results.push({ kind: "pricing", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // A/B test (2 runs 5s en paralelo si launch > 0; runAbTest se encarga)
  // ============================================================
  if (selected.has("ab")) {
    try {
      const { abTestId } = await seedAbExample();
      let runIds: string[] | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runs } = await runAbTest({ abTestId, profileIds });
        runIds = runs.map((r) => r.runId);
      }
      results.push({ kind: "ab", ok: true, abTestId, runIds });
    } catch (err) {
      results.push({ kind: "ab", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // Funnel
  // ============================================================
  if (selected.has("funnel")) {
    try {
      const { funnelId } = await seedFunnelExample();
      let runId: string | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runId: rid } = await runFunnelTest({ funnelId, profileIds });
        runId = rid;
      }
      results.push({ kind: "funnel", ok: true, funnelId, runId });
    } catch (err) {
      results.push({ kind: "funnel", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // Campaign
  // ============================================================
  if (selected.has("campaign")) {
    try {
      const { campaignId } = await seedCampaignExample();
      let runId: string | undefined;
      if (launch > 0 && profileIds.length > 0) {
        const { runId: rid } = await runCampaignTest({ campaignId, profileIds });
        runId = rid;
      }
      results.push({ kind: "campaign", ok: true, campaignId, runId });
    } catch (err) {
      results.push({ kind: "campaign", ok: false, error: (err as Error).message });
    }
  }

  return Response.json({
    ok: results.every((r) => r.ok),
    profileIds,
    results,
  });
}
