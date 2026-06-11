import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { budgetGate } from "@/lib/budget";
import { runAbTest } from "@/lib/experiments/ab";
import {
  executeCampaignRun,
  prepareCampaignRun,
  runCampaignTest,
  type PreparedCampaignRun,
} from "@/lib/experiments/campaign";
import { runCopyTest } from "@/lib/experiments/copy";
import { runFiveSecondTest } from "@/lib/experiments/five-second";
import { runFunnelTest } from "@/lib/experiments/funnel";
import { runPricingTest } from "@/lib/experiments/pricing";
import { isGatewayConfigured } from "@/lib/gateway";
import { runGeoAnalysis } from "@/lib/geo";
import { runMomentumChallenge } from "@/lib/momentum";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import { generateSeedPlan, type SeedPlan } from "@/lib/seed-brief";
import {
  pickProfileIdsByAgeRange,
  pickRandomProfileIds,
  seedAbExample,
  seedCampaignExample,
  seedCampaignStrategiesExample,
  seedCopyExample,
  seedFiveSecondExample,
  seedFunnelExample,
  seedGeoExample,
  seedMomentumExample,
  seedPricingExample,
} from "@/lib/seed-examples";

export const runtime = "nodejs";
// 8 ejemplos + runs (con 3 perfiles cada uno) + plan opcional con brief.
export const maxDuration = 300;

const KIND_VALUES = [
  "clarity",
  "copy",
  "pricing",
  "ab",
  "funnel",
  "campaign",
  "campaign_strategies",
  "geo",
  "momentum",
] as const;
type Kind = (typeof KIND_VALUES)[number];

const BodySchema = z.object({
  launch: z.number().int().min(0).max(10).optional().default(0),
  kinds: z.array(z.enum(KIND_VALUES)).optional(),
  brief: z.string().trim().max(2000).optional(),
});

type ExampleResult =
  | { kind: "clarity"; ok: true; targetId: string; runId?: string; error?: undefined }
  | { kind: "copy"; ok: true; deckId: string; runId?: string; error?: undefined }
  | { kind: "pricing"; ok: true; offerId: string; runId?: string; error?: undefined }
  | { kind: "ab"; ok: true; abTestId: string; runIds?: string[]; error?: undefined }
  | { kind: "funnel"; ok: true; funnelId: string; runId?: string; error?: undefined }
  | { kind: "campaign"; ok: true; campaignId: string; runId?: string; error?: undefined }
  | {
      kind: "campaign_strategies";
      ok: true;
      campaigns: { strategy: string; campaignId: string; runId?: string }[];
      error?: undefined;
    }
  | { kind: "geo"; ok: true; geoId: string; ran?: boolean; error?: undefined }
  | { kind: "momentum"; ok: true; momentumId: string; ran?: boolean; error?: undefined }
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
  const brief = body.brief && body.brief.length > 0 ? body.brief : null;
  if (launch > 0 && !isGatewayConfigured()) {
    return Response.json(
      { ok: false, error: "AI Gateway no configurado y se pidió launch > 0." },
      { status: 503 },
    );
  }
  if (brief && !isGatewayConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "AI Gateway no configurado: el brief requiere generación con IA.",
      },
      { status: 503 },
    );
  }
  // Es la acción individual más cara de la UI (encadena runs de los 7
  // experimentos en background) y no pasaba por el gate de presupuesto:
  // el incidente de la cuota de v0.47 entró por aquí. Solo aplica si la
  // petición va a consumir LLM (launch > 0 o brief).
  if (launch > 0 || brief) {
    const gate = await budgetGate();
    if (gate) return gate;
  }

  // campaign_strategies (las 6 campañas IVI, una por estrategia) solo se
  // siembra si se pide explícitamente: no entra en el «sembrar todos».
  const selected: Set<Kind> = new Set(
    body.kinds && body.kinds.length > 0
      ? body.kinds
      : KIND_VALUES.filter((k) => k !== "campaign_strategies"),
  );

  let plan: SeedPlan = {};
  if (brief) {
    try {
      // campaign_strategies usa contenido propio (IVI): no entra en el plan.
      plan = await generateSeedPlan(
        brief,
        [...selected].filter(
          (k): k is Exclude<Kind, "campaign_strategies"> =>
            k !== "campaign_strategies",
        ),
      );
    } catch (err) {
      return Response.json(
        {
          ok: false,
          error: `No se pudo generar el plan a partir del brief: ${(err as Error).message}`,
        },
        { status: 502 },
      );
    }
  }

  const profileIds = launch > 0 ? await pickRandomProfileIds(launch) : [];
  const results: ExampleResult[] = [];

  // ============================================================
  // Claridad 5s
  // ============================================================
  if (selected.has("clarity")) {
    try {
      const { targetId } = await seedFiveSecondExample(plan.clarity);
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
      const { deckId } = await seedCopyExample(plan.copy);
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
      const { offerId } = await seedPricingExample(plan.pricing);
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
      const { abTestId } = await seedAbExample(plan.ab);
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
      const { funnelId } = await seedFunnelExample(plan.funnel);
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
      const { campaignId } = await seedCampaignExample(plan.campaign);
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

  // ============================================================
  // Campañas por estrategia (ejemplo IVI: 6 campañas, una por estrategia)
  // ============================================================
  if (selected.has("campaign_strategies")) {
    try {
      const { campaigns } = await seedCampaignStrategiesExample();
      const rows: { strategy: string; campaignId: string; runId?: string }[] =
        campaigns.map((c) => ({ strategy: c.strategy, campaignId: c.campaignId }));
      if (launch > 0) {
        // Audiencia natural del ejemplo (fertilidad): perfiles de 28 a 45
        // años, completando con aleatorios. Los 6 runs se preparan dentro
        // del request (rápido) y se ejecutan en after(), en paralelo; si la
        // función se corta, cada run ofrece «Retomar» en su página.
        const fertilityProfiles = await pickProfileIdsByAgeRange(28, 45, launch);
        if (fertilityProfiles.length > 0) {
          const preps: PreparedCampaignRun[] = [];
          for (const row of rows) {
            const prep = await prepareCampaignRun({
              campaignId: row.campaignId,
              profileIds: fertilityProfiles,
            });
            row.runId = prep.runId;
            preps.push(prep);
          }
          after(() => Promise.all(preps.map((p) => executeCampaignRun(p))));
        }
      }
      results.push({ kind: "campaign_strategies", ok: true, campaigns: rows });
    } catch (err) {
      results.push({
        kind: "campaign_strategies",
        ok: false,
        error: (err as Error).message,
      });
    }
  }

  // ============================================================
  // GEO (el run analiza segmentos, no usa perfiles)
  // ============================================================
  if (selected.has("geo")) {
    try {
      const { geoId } = await seedGeoExample(plan.geo);
      let ran = false;
      if (launch > 0) {
        await runGeoAnalysis(geoId);
        ran = true;
      }
      results.push({ kind: "geo", ok: true, geoId, ran });
    } catch (err) {
      results.push({ kind: "geo", ok: false, error: (err as Error).message });
    }
  }

  // ============================================================
  // Momentum (asigna perfiles aunque no se lance, para poder correrlo luego)
  // ============================================================
  if (selected.has("momentum")) {
    try {
      const { momentumId } = await seedMomentumExample(plan.momentum, profileIds);
      let ran = false;
      if (launch > 0 && profileIds.length > 0) {
        await runMomentumChallenge(momentumId);
        ran = true;
      }
      results.push({ kind: "momentum", ok: true, momentumId, ran });
    } catch (err) {
      results.push({ kind: "momentum", ok: false, error: (err as Error).message });
    }
  }

  return Response.json({
    ok: results.every((r) => r.ok),
    profileIds,
    results,
  });
}
