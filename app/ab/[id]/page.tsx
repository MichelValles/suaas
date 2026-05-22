import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getAbTest, listAbTestRuns } from "@/lib/ab";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTarget } from "@/lib/targets";
import { LaunchAbPanel } from "./launch-panel";

export const dynamic = "force-dynamic";

export default async function AbDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="A/B test" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const ab = await getAbTest(id);
  if (!ab) notFound();
  const [targetA, targetB, profiles, abRuns] = await Promise.all([
    getTarget(ab.target_a_id),
    getTarget(ab.target_b_id),
    listProfiles(),
    listAbTestRuns(ab.id),
  ]);
  if (!targetA || !targetB) notFound();

  // Agrupar runs por launchTime (pares A/B muy juntos en el tiempo).
  const launches = await Promise.all(
    abRuns.map(async (link) => {
      const run = await getRun(link.run_id);
      const metrics = await getMetricsForRun(link.run_id);
      return { variant: link.variant, run, metrics };
    }),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow="A/B test"
        title={ab.name}
        description={ab.hypothesis ?? undefined}
        actions={
          <Link href="/ab" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
        }}
      >
        <VariantCard variant="A" name={targetA.name} promise={targetA.payload.main_promise} />
        <VariantCard variant="B" name={targetB.name} promise={targetB.payload.main_promise} />
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
          Runs ejecutados
        </h2>
        {launches.length === 0 ? (
          <div
            style={{
              padding: 16,
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
            }}
          >
            Sin runs todavía. Lanza el primero desde el panel.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.55)" }}>
                  <Th>Variante</Th>
                  <Th>Fecha</Th>
                  <Th>Claridad</Th>
                  <Th>Compr.</Th>
                  <Th>Estado</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {launches.map((l) => (
                  <tr
                    key={l.run?.id ?? Math.random()}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Td>
                      <span className="mono" style={{ color: "var(--accent-500)" }}>
                        {l.variant}
                      </span>
                    </Td>
                    <Td>{l.run ? formatDate(l.run.created_at) : "—"}</Td>
                    <Td>{fmtPct(l.metrics.mean_clarity)}</Td>
                    <Td>{fmtPct(l.metrics.mean_comprehension)}</Td>
                    <Td>{l.run?.status ?? "—"}</Td>
                    <Td>
                      {l.run && (
                        <Link
                          href={`/experiments/five-second/${l.run.id}`}
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
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LaunchAbPanel
        abTestId={ab.id}
        profiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          demo: `${p.demographics.age} · ${p.demographics.gender} · ${p.demographics.occupation}`,
        }))}
      />
    </AppShell>
  );
}

function VariantCard({
  variant,
  name,
  promise,
}: {
  variant: "A" | "B";
  name: string;
  promise: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 24,
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
        Variante {variant}
      </span>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 24,
          color: "#fff",
          margin: 0,
        }}
      >
        {name}
      </h3>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
        {promise}
      </p>
    </div>
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
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtPct(v: number | undefined): string {
  if (typeof v !== "number") return "—";
  return `${Math.round(v * 100)}%`;
}
