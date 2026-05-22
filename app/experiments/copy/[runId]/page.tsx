import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getCopyDeck } from "@/lib/copy";
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
        <PageHeading eyebrow="Resultados copy" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const run = await getRun(runId);
  if (!run || run.kind !== "copy_resonance") notFound();
  const deckId = run.copy_deck_id ?? (run.params?.deckId as string | undefined);
  if (!deckId) notFound();

  const [deck, responses] = await Promise.all([
    getCopyDeck(deckId),
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
        eyebrow={`Run · ${run.status}`}
        title={deck.name}
        description={`Resonancia evaluada sobre ${summary.n} ${summary.n === 1 ? "perfil" : "perfiles"}.`}
        actions={
          <Link href={`/copy/${deck.id}`} className="btn-pill">
            Volver al deck
          </Link>
        }
      />

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {summary.byBlock
          .sort((a, b) => b.persuasion_mean - a.persuasion_mean)
          .map((b, idx) => (
            <div
              key={b.blockId}
              style={{
                border: `1px solid ${idx === 0 ? "var(--accent-500)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "var(--radius-md)",
                padding: 20,
                background: idx === 0 ? "rgba(250,204,13,0.06)" : "rgba(255,255,255,0.02)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--accent-500)",
                  }}
                >
                  Bloque {b.position} · {b.label}
                  {idx === 0 && " · ★ mejor"}
                </span>
                <div style={{ display: "flex", gap: 16 }}>
                  <Stat label="Persuasión" value={fmtPct(b.persuasion_mean)} />
                  <Stat label="Claridad" value={fmtPct(b.clarity_mean)} />
                  <Stat label="CTR" value={fmtPct(b.click_rate)} />
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                «{b.text}»
              </p>
              <SentimentBar sentiment={b.sentiment} n={summary.n} />
              <details>
                <summary
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    cursor: "pointer",
                  }}
                >
                  Críticas por perfil
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
                    .filter((r) => r.blockId === b.blockId)
                    .map((r) => {
                      const profile = profilesById.get(r.profileId);
                      return (
                        <li
                          key={`${r.blockId}-${r.profileId}`}
                          style={{
                            padding: 12,
                            borderRadius: "var(--radius-sm)",
                            background: "rgba(255,255,255,0.03)",
                          }}
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
                                color:
                                  r.reaction.sentiment === "positivo"
                                    ? "var(--success-500)"
                                    : r.reaction.sentiment === "negativo"
                                      ? "var(--error-500)"
                                      : "rgba(255,255,255,0.55)",
                              }}
                            >
                              {r.reaction.sentiment} · {r.reaction.would_click ? "↗ clickaría" : "✕ no clickaría"}
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
            </div>
          ))}
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 18, color: "#fff", fontFamily: "var(--font-display)" }}>{value}</span>
    </div>
  );
}

function SentimentBar({
  sentiment,
  n,
}: {
  sentiment: { positivo: number; negativo: number; neutro: number; escéptico: number };
  n: number;
}) {
  const total = Math.max(n, sentiment.positivo + sentiment.negativo + sentiment.neutro + sentiment.escéptico);
  const w = (v: number) => (total === 0 ? 0 : (v / total) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div style={{ width: `${w(sentiment.positivo)}%`, background: "var(--success-500)" }} />
        <div style={{ width: `${w(sentiment.neutro)}%`, background: "rgba(255,255,255,0.35)" }} />
        <div style={{ width: `${w(sentiment.escéptico)}%`, background: "var(--warning-500)" }} />
        <div style={{ width: `${w(sentiment.negativo)}%`, background: "var(--error-500)" }} />
      </div>
      <div
        className="mono"
        style={{
          display: "flex",
          gap: 12,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        <span>● positivo {sentiment.positivo}</span>
        <span>● neutro {sentiment.neutro}</span>
        <span>● escéptico {sentiment.escéptico}</span>
        <span>● negativo {sentiment.negativo}</span>
      </div>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}
