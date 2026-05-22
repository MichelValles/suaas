import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { getCopyDeck } from "@/lib/copy";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByCopyDeck } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CopyDeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Deck" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const deck = await getCopyDeck(id);
  if (!deck) notFound();
  const [profiles, runs] = await Promise.all([listProfiles(), listRunsByCopyDeck(id)]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Deck · ${deck.blocks.length} ${deck.blocks.length === 1 ? "bloque" : "bloques"}`}
        title={deck.name}
        description={deck.description ?? deck.context ?? undefined}
        actions={
          <Link href="/copy" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {deck.blocks.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              padding: 20,
              background: "rgba(255,255,255,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
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
              {b.position} · {b.label}
            </span>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {b.text}
            </p>
          </div>
        ))}
      </section>

      <RunsSection runs={runsWithMetrics} />

      <ProfileLaunchPanel
        title="Lanzar copy test"
        endpoint="/api/runs/copy"
        extraBody={{ deckId: deck.id }}
        progressLabel={`Cada perfil reaccionará a los ${deck.blocks.length} bloques. Estimado ~${Math.ceil(deck.blocks.length * 6)}s por perfil.`}
        redirectTo={(json) => `/experiments/copy/${json.runId}`}
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
}: {
  runs: Array<{
    run: { id: string; created_at: string; status: string; params: Record<string, unknown> | null };
    metrics: Record<string, number>;
  }>;
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
                <Th>Mejor persuasión</Th>
                <Th>CTR medio</Th>
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
                    <Td>{fmtPct(metrics.best_persuasion_mean)}</Td>
                    <Td>{fmtPct(metrics.mean_click_rate)}</Td>
                    <Td>{run.status}</Td>
                    <Td>
                      <Link
                        href={`/experiments/copy/${run.id}`}
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
