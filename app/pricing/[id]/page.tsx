import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { RunsPreviousGrid } from "@/components/runs-previous";
import { getPricingOffer } from "@/lib/pricing";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByPricingOffer } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PricingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Oferta" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const offer = await getPricingOffer(id);
  if (!offer) notFound();
  const [profiles, runs] = await Promise.all([listProfiles(), listRunsByPricingOffer(id)]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Oferta · ${offer.prices.length} ${offer.prices.length === 1 ? "precio" : "precios"}`}
        title={offer.name}
        description={offer.description}
        descriptionVariant="panel"
        actions={
          <Link href="/pricing" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {offer.prices.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              padding: "22px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "rgba(var(--fg),0.02)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.55)",
              }}
            >
              {p.label ?? `nivel ${p.position}`}
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 30,
                color: "var(--text-strong)",
                lineHeight: 1,
              }}
            >
              {p.price} {offer.currency}
            </span>
          </div>
        ))}
      </section>

      <RunsPreviousGrid
        runs={runsWithMetrics}
        resultsBase="/experiments/pricing"
        emptyHint="Sin runs todavía. Lanza el primer test de pricing desde el panel de abajo."
        metrics={[
          {
            key: "sweet_spot_price",
            label: "Sweet spot",
            format: (v) => `${v} ${offer.currency}`,
          },
          { key: "sweet_spot_buy_rate", label: "Buy-rate" },
        ]}
      />

      <ProfileLaunchPanel
        title="Lanzar test de pricing"
        endpoint="/api/runs/pricing"
        extraBody={{ offerId: offer.id }}
        estimateEndpoint={`/api/estimate/run?kind=pricing&perProfile=${offer.prices.length}`}
        progressLabel={`Cada perfil reaccionará a ${offer.prices.length} precios. Estimado ~${Math.ceil(offer.prices.length * 6)}s por perfil.`}
        kind="pricing"
        profiles={profiles}
      />
    </AppShell>
  );
}

