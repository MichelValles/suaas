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
  const profiles = await listProfilesByIds(
    Array.from(new Set(responses.map((r) => r.profileId))),
  );
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const sortedByPos = [...summary.byPrice].sort((a, b) => a.position - b.position);

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Run · ${run.status} · ${summary.n} ${summary.n === 1 ? "perfil" : "perfiles"}`}
        title={offer.name}
        description={offer.description}
        descriptionVariant="panel"
        actions={
          <Link href={`/pricing/${offer.id}`} className="btn-pill">
            Volver a la oferta
          </Link>
        }
      />

      {summary.sweet_spot && (
        <section
          aria-label="Sweet spot"
          style={{
            border: "1px solid var(--accent-500)",
            borderRadius: "var(--radius-md)",
            padding: "28px 32px",
            background: "rgba(250,204,13,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            Sweet spot · mejor revenue esperado
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(26px, 3vw, 36px)",
              lineHeight: 1.05,
              color: "var(--text-strong)",
            }}
          >
            {summary.sweet_spot.price} {summary.currency} · buy-rate{" "}
            {Math.round(summary.sweet_spot.would_buy_rate * 100)}%
          </span>
        </section>
      )}

      <Section title="Curva de demanda">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedByPos.map((p) => (
            <div
              key={p.priceId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 220px) 1fr 80px",
                gap: 20,
                alignItems: "center",
                padding: "18px 22px",
                border: "1px solid rgba(var(--fg),0.08)",
                borderRadius: "var(--radius-md)",
                background: "rgba(var(--fg),0.02)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "var(--text-strong)", fontSize: 15 }}>
                  {p.price} {summary.currency}
                </span>
                {p.label && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(var(--fg),0.5)",
                    }}
                  >
                    {p.label}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 12,
                  background: "rgba(var(--fg),0.06)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(p.would_buy_rate * 100, p.would_buy_rate > 0 ? 4 : 0)}%`,
                    height: "100%",
                    background: "var(--accent-500)",
                  }}
                />
              </div>
              <span
                className="mono"
                style={{
                  color: "rgba(var(--fg),0.85)",
                  fontSize: 13,
                  textAlign: "right",
                }}
              >
                {Math.round(p.would_buy_rate * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Detalle por precio">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sortedByPos.map((p) => (
            <details
              key={p.priceId}
              style={{
                padding: "20px 24px",
                border: "1px solid rgba(var(--fg),0.08)",
                borderRadius: "var(--radius-md)",
                background: "rgba(var(--fg),0.02)",
              }}
            >
              <summary
                className="mono"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: "rgba(var(--fg),0.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {p.price} {summary.currency} {p.label ? `· ${p.label}` : ""}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip label="Buy" value={`${Math.round(p.would_buy_rate * 100)}%`} />
                  <Chip label="WTP" value={`${Math.round(p.wtp_mean * 100)}%`} />
                  <Chip label="Valor" value={`${Math.round(p.value_mean * 100)}%`} />
                </span>
              </summary>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "20px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {responses
                  .filter((r) => r.priceId === p.priceId)
                  .map((r) => {
                    const profile = profilesById.get(r.profileId);
                    return (
                      <li
                        key={`${r.priceId}-${r.profileId}`}
                        style={{
                          padding: "16px 18px",
                          borderRadius: "var(--radius-sm)",
                          background: "rgba(var(--fg),0.03)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "baseline",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            href={`/profiles/${r.profileId}`}
                            title={profile ? `Ver perfil de ${profile.name}` : undefined}
                            style={{
                              color: "var(--text-strong)",
                              fontSize: 14,
                              textDecoration: "none",
                              borderBottom: "1px dotted rgba(var(--fg),0.25)",
                            }}
                          >
                            {profile?.name ?? r.profileId.slice(0, 8)}
                          </Link>
                          <span
                            className="mono"
                            style={{
                              fontSize: 10,
                              letterSpacing: "0.2em",
                              textTransform: "uppercase",
                              color: r.reaction.would_buy
                                ? "var(--success-500)"
                                : "var(--error-500)",
                            }}
                          >
                            {r.reaction.would_buy ? "✓ compraría" : "✕ no compraría"}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "rgba(var(--fg),0.75)",
                            fontSize: 14,
                            margin: 0,
                            lineHeight: 1.55,
                          }}
                        >
                          «{r.reaction.critique}»
                        </p>
                      </li>
                    );
                  })}
              </ul>
            </details>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(var(--fg),0.04)",
        border: "1px solid rgba(var(--fg),0.08)",
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(var(--fg),0.55)",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "var(--text-strong)", fontWeight: 700 }}>{value}</span>
    </span>
  );
}
