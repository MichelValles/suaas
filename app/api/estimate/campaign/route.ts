import { getDailyBudget } from "@/lib/budget";
import { getCampaign } from "@/lib/campaigns";
import {
  getScopeAverages,
  getTokensLast24h,
} from "@/lib/usage";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estimación de coste previa al lanzamiento de un run de campaña, con las
 * medias empíricas de gateway_usage (últimas 200 llamadas por scope).
 * GET /api/estimate/campaign?campaignId=<uuid>&profiles=<n>
 *
 * La landing eval solo corre cuando intent >= 0,5: se pondera con la
 * proporción histórica aproximada (~60%).
 */
const LANDING_SHARE = 0.6;
const RUNNER_CONCURRENCY = 5;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, error: "Supabase no configurado." }, { status: 503 });
  }
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId");
  const profiles = Number(url.searchParams.get("profiles") ?? "0");
  if (!campaignId || !Number.isInteger(profiles) || profiles < 1) {
    return Response.json(
      { ok: false, error: "campaignId y profiles (entero >= 1) requeridos." },
      { status: 400 },
    );
  }
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    return Response.json({ ok: false, error: "Campaña no encontrada." }, { status: 404 });
  }

  const combos =
    profiles *
    campaign.channels.length *
    Math.max(1, campaign.queries.length);

  const [averages, spent24h] = await Promise.all([
    getScopeAverages(["campaign_probe", "campaign_landing", "campaign_ideal"]),
    getTokensLast24h(),
  ]);
  const byScope = new Map(averages.map((a) => [a.scope, a]));
  const probe = byScope.get("campaign_probe");
  const landing = byScope.get("campaign_landing");
  const ideal = byScope.get("campaign_ideal");

  const tokensPerCombo =
    (probe?.avgTokens ?? 0) +
    LANDING_SHARE * (landing?.avgTokens ?? 0) +
    (ideal?.avgTokens ?? 0);
  const latencyPerComboMs =
    (probe?.avgLatencyMs ?? 0) +
    LANDING_SHARE * (landing?.avgLatencyMs ?? 0) +
    (ideal?.avgLatencyMs ?? 0);

  const hasHistory = (probe?.n ?? 0) > 0;
  const budget = getDailyBudget();

  return Response.json({
    ok: true,
    combos,
    has_history: hasHistory,
    est_tokens: hasHistory ? Math.round(combos * tokensPerCombo) : null,
    est_seconds: hasHistory
      ? Math.round((combos * latencyPerComboMs) / RUNNER_CONCURRENCY / 1000)
      : null,
    budget: budget
      ? { limit: budget, spent_24h: Math.round(spent24h) }
      : null,
  });
}
