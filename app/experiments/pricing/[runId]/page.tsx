import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import {
  listPricingResponses,
  summarizePricingResponses,
} from "@/lib/experiments/pricing";
import { getPricingOffer } from "@/lib/pricing";
import { listProfilesByIds } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PricingRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Resultados pricing" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const run = await getRun(runId);
  if (!run || run.kind !== "pricing") notFound();
  const offerId = run.pricing_offer_id ?? (run.params?.offerId as string | undefined);
  if (!offerId) notFound();

  const [offer, responses] = await Promise.all([
    getPricingOffer(offerId),
    listPricingResponses(runId),
  ]);
  if (!offer) notFound();

  const profileIdsRequested = (run.params?.profileIds as string[] | undefined) ?? [];
  const totalProfiles =
    profileIdsRequested.length || new Set(responses.map((r) => r.profileId)).size;
  const summary = summarizePricingResponses(offer, totalProfiles, responses);
  const profiles = await listProfilesByIds(Array.from(new Set(responses.map((r) => r.profileId))));
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const sortedByPos = [...summary.byPrice].sort((a, b) => a.position - b.position);

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Run · ${run.status}`}
        title={offer.name}
        description={`Elasticidad evaluada sobre ${summary.n} ${summary.n === 1 ? "perfil" : "perfiles"}. ${offer.description}`}
        actions={
          <Link href={`/pricing/${offer.id}`} className="btn-pill">
            Volver a la oferta
          </Link>
        }
      />

      {summary.sweet_spot && (
        <section
          style={{
            border: "1px solid var(--accent-500)",
            borderRadius: "var(--radius-md)",
            padding: 20,
            background: "rgba(250,204,13,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--accent-500)",
            }}
          >
            Sweet spot (mejor revenue esperado)
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "#fff" }}>
            {summary.sweet_spot.price} {summary.currency} · buy-rate {Math.round(summary.sweet_spot.would_buy_rate * 100)}%
          </span>
        </section>
      )}

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
          Curva de demanda
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedByPos.map((p) => (
            <div
              key={p.priceId}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 80px",
                gap: 12,
                alignItems: "center",
                padding: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ color: "#fff", fontSize: 14 }}>
                  {p.price} {summary.currency}
                </span>
                {p.label && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {p.label}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 12,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${p.would_buy_rate * 100}%`,
                    height: "100%",
                    background: "var(--accent-500)",
                  }}
                />
              </div>
              <span className="mono" style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "right" }}>
                {Math.round(p.would_buy_rate * 100)}%
              </span>
            </div>
          ))}
        </div>
      </section>

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
          Detalle por precio
        </h2>
        {sortedByPos.map((p) => (
          <details
            key={p.priceId}
            style={{
              padding: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <summary
              className="mono"
              style={{
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                color: "rgba(255,255,255,0.75)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                {p.price} {summary.currency} {p.label ? `· ${p.label}` : ""}
              </span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                buy {Math.round(p.would_buy_rate * 100)}% · WTP {Math.round(p.wtp_mean * 100)}% · valor {Math.round(p.value_mean * 100)}%
              </span>
            </summary>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "12px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {responses
                .filter((r) => r.priceId === p.priceId)
                .map((r) => {
                  const profile = profilesById.get(r.profileId);
                  return (
                    <li
                      key={`${r.priceId}-${r.profileId}`}
                      style={{ padding: 10, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "baseline",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: "#fff", fontSize: 13 }}>
                          {profile?.name ?? r.profileId.slice(0, 8)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: r.reaction.would_buy ? "var(--success-500)" : "var(--error-500)",
                          }}
                        >
                          {r.reaction.would_buy ? "✓ compraría" : "✕ no compraría"}
                        </span>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: "6px 0 0", lineHeight: 1.5 }}>
                        «{r.reaction.critique}»
                      </p>
                    </li>
                  );
                })}
            </ul>
          </details>
        ))}
      </section>
    </AppShell>
  );
}
