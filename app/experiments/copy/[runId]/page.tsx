import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getCopyDeckWithTrashed } from "@/lib/copy";
import {
  listCopyResponses,
  summarizeCopyResponses,
} from "@/lib/experiments/copy";
import { listProfilesByIds } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CopyRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="KNOWLEDGE · Copy" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const run = await getRun(runId);
  if (!run || run.kind !== "copy_resonance") notFound();
  const deckId = run.copy_deck_id ?? (run.params?.deckId as string | undefined);
  if (!deckId) notFound();

  // Vista de resultados históricos: el deck se carga aunque esté en la
  // papelera para no romper runs antiguos.
  const [deck, responses] = await Promise.all([
    getCopyDeckWithTrashed(deckId),
    listCopyResponses(runId),
  ]);
  if (!deck) notFound();

  const profileIdsRequested = (run.params?.profileIds as string[] | undefined) ?? [];
  const totalProfiles = profileIdsRequested.length || new Set(responses.map((r) => r.profileId)).size;
  const summary = summarizeCopyResponses(deck, totalProfiles, responses);
  const profiles = await listProfilesByIds(Array.from(new Set(responses.map((r) => r.profileId))));
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <AppShell>
      <PageHeading
        eyebrow="KNOWLEDGE · Copy"
        title={deck.name}
        description={deck.description ?? deck.context ?? undefined}
        descriptionVariant="panel"
        actions={
          <Link
            href={deck.deleted_at ? "/copy" : `/copy/${deck.id}`}
            className="btn-pill"
          >
            {deck.deleted_at ? "Volver al listado" : "Volver al deck"}
          </Link>
        }
      />

      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {summary.byBlock
          .sort((a, b) => b.persuasion_mean - a.persuasion_mean)
          .map((b, idx) => (
            <article
              key={b.blockId}
              style={{
                border: `1px solid ${idx === 0 ? "var(--accent-500)" : "rgba(var(--fg),0.08)"}`,
                borderRadius: "var(--radius-md)",
                padding: "24px 28px",
                background: idx === 0 ? "rgba(250,204,13,0.06)" : "rgba(var(--fg),0.02)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: "var(--accent-text)",
                  }}
                >
                  Bloque {b.position} · {b.label}
                  {idx === 0 && " · mejor"}
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip label="Persuasión" value={fmtPct(b.persuasion_mean)} />
                  <Chip label="Claridad" value={fmtPct(b.clarity_mean)} />
                  <Chip label="CTR" value={fmtPct(b.click_rate)} />
                </div>
              </header>
              <p
                style={{
                  color: "rgba(var(--fg),0.85)",
                  fontSize: 15,
                  lineHeight: 1.65,
                  margin: 0,
                  paddingBlock: 4,
                }}
              >
                «{b.text}»
              </p>
              <SentimentBar sentiment={b.sentiment} n={summary.n} />
              <details style={{ marginTop: 4 }}>
                <summary
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(var(--fg),0.6)",
                    cursor: "pointer",
                    paddingBlock: 4,
                  }}
                >
                  Críticas por perfil
                </summary>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "16px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {responses
                    .filter((r) => r.blockId === b.blockId)
                    .map((r) => {
                      const profile = profilesById.get(r.profileId);
                      return (
                        <li
                          key={`${r.blockId}-${r.profileId}`}
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
                                color:
                                  r.reaction.sentiment === "positivo"
                                    ? "var(--success-500)"
                                    : r.reaction.sentiment === "negativo"
                                      ? "var(--error-500)"
                                      : "rgba(var(--fg),0.55)",
                              }}
                            >
                              {r.reaction.sentiment} ·{" "}
                              {r.reaction.would_click ? "↗ clickaría" : "✕ no clickaría"}
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
            </article>
          ))}
      </section>
    </AppShell>
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

function SentimentBar({
  sentiment,
  n,
}: {
  sentiment: { positivo: number; negativo: number; neutro: number; escéptico: number };
  n: number;
}) {
  const total = Math.max(
    n,
    sentiment.positivo + sentiment.negativo + sentiment.neutro + sentiment.escéptico,
  );
  const w = (v: number) => (total === 0 ? 0 : (v / total) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(var(--fg),0.06)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div style={{ width: `${w(sentiment.positivo)}%`, background: "var(--success-500)" }} />
        <div style={{ width: `${w(sentiment.neutro)}%`, background: "rgba(var(--fg),0.35)" }} />
        <div style={{ width: `${w(sentiment.escéptico)}%`, background: "var(--warning-500)" }} />
        <div style={{ width: `${w(sentiment.negativo)}%`, background: "var(--error-500)" }} />
      </div>
      <div
        className="mono"
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        <span>
          <span style={{ color: "var(--success-500)" }}>●</span> positivo {sentiment.positivo}
        </span>
        <span>
          <span style={{ color: "rgba(var(--fg),0.5)" }}>●</span> neutro {sentiment.neutro}
        </span>
        <span>
          <span style={{ color: "var(--warning-500)" }}>●</span> escéptico {sentiment.escéptico}
        </span>
        <span>
          <span style={{ color: "var(--error-500)" }}>●</span> negativo {sentiment.negativo}
        </span>
      </div>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
