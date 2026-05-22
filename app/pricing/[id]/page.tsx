import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
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
        actions={
          <Link href="/pricing" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {offer.prices.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {p.label ?? `nivel ${p.position}`}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "#fff" }}>
              {p.price} {offer.currency}
            </span>
          </div>
        ))}
      </section>

      <RunsSection runs={runsWithMetrics} currency={offer.currency} />

      <ProfileLaunchPanel
        title="Lanzar test de pricing"
        endpoint="/api/runs/pricing"
        extraBody={{ offerId: offer.id }}
        progressLabel={`Cada perfil reaccionará a ${offer.prices.length} precios. Estimado ~${Math.ceil(offer.prices.length * 6)}s por perfil.`}
        redirectTo={(json) => `/experiments/pricing/${json.runId}`}
        profiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          demo: `${p.demographics.age} · ${p.demographics.gender} · ${p.demographics.occupation}`,
        }))}
      />
    </AppShell>
  );
}

function RunsSection({
  runs,
  currency,
}: {
  runs: Array<{
    run: { id: string; created_at: string; status: string; params: Record<string, unknown> | null };
    metrics: Record<string, number>;
  }>;
  currency: string;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
          margin: 0,
        }}
      >
        Runs previos
      </h2>
      {runs.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          Sin runs todavía.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.55)" }}>
                <Th>Fecha</Th>
                <Th>N</Th>
                <Th>Sweet spot</Th>
                <Th>Buy-rate</Th>
                <Th>Estado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {runs.map(({ run, metrics }) => {
                const ids = (run.params?.profileIds as string[] | undefined) ?? [];
                return (
                  <tr key={run.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Td>{formatDate(run.created_at)}</Td>
                    <Td>{ids.length || metrics.n || "—"}</Td>
                    <Td>
                      {metrics.sweet_spot_price
                        ? `${metrics.sweet_spot_price} ${currency}`
                        : "—"}
                    </Td>
                    <Td>{fmtPct(metrics.sweet_spot_buy_rate)}</Td>
                    <Td>{run.status}</Td>
                    <Td>
                      <Link
                        href={`/experiments/pricing/${run.id}`}
                        className="mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: "var(--accent-500)",
                        }}
                      >
                        ver →
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtPct(v: number | undefined): string {
  if (typeof v !== "number") return "—";
  return `${Math.round(v * 100)}%`;
}
