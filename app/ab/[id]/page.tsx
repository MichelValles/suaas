import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getAbTest, listAbTestRuns } from "@/lib/ab";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTargetWithTrashed } from "@/lib/targets";
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
        <PageHeading eyebrow="KNOWLEDGE · A/B tests" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const ab = await getAbTest(id);
  if (!ab) notFound();
  // Las variantes se cargan sin filtrar la papelera: un target borrado no
  // debe romper la vista del A/B ni sus resultados históricos. Sólo 404
  // si el target ya no existe (hard delete).
  const [targetA, targetB, profiles, abRuns] = await Promise.all([
    getTargetWithTrashed(ab.target_a_id),
    getTargetWithTrashed(ab.target_b_id),
    listProfiles(),
    listAbTestRuns(ab.id),
  ]);
  if (!targetA || !targetB) notFound();

  // Variantes en papelera: se muestran, pero bloquean el lanzamiento de runs.
  const trashedVariants = [
    targetA.deleted_at ? `A («${targetA.name}»)` : null,
    targetB.deleted_at ? `B («${targetB.name}»)` : null,
  ].filter((v): v is string => v !== null);

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
        eyebrow="KNOWLEDGE · A/B tests"
        title={ab.name}
        description={ab.hypothesis ?? undefined}
        descriptionVariant="panel"
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
        <VariantCard
          variant="A"
          name={targetA.name}
          promise={targetA.payload.main_promise}
          trashed={Boolean(targetA.deleted_at)}
        />
        <VariantCard
          variant="B"
          name={targetB.name}
          promise={targetB.payload.main_promise}
          trashed={Boolean(targetB.deleted_at)}
        />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          Runs ejecutados
        </h2>
        {launches.length === 0 ? (
          <div
            style={{
              padding: 16,
              border: "1px dashed rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(var(--fg),0.55)",
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
                color: "rgba(var(--fg),0.85)",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "rgba(var(--fg),0.55)" }}>
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
                    style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}
                  >
                    <Td>
                      <span className="mono" style={{ color: "var(--accent-text)" }}>
                        {l.variant}
                      </span>
                    </Td>
                    <Td>{l.run ? formatDate(l.run.created_at) : "·"}</Td>
                    <Td>{fmtPct(l.metrics.mean_clarity)}</Td>
                    <Td>{fmtPct(l.metrics.mean_comprehension)}</Td>
                    <Td>{l.run?.status ?? "·"}</Td>
                    <Td>
                      {l.run && (
                        <Link
                          href={`/experiments/five-second/${l.run.id}`}
                          className="mono"
                          style={{
                            fontSize: 11,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--accent-text)",
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

      {trashedVariants.length === 0 ? (
        <LaunchAbPanel abTestId={ab.id} profiles={profiles} />
      ) : (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 13,
          }}
        >
          {trashedVariants.length === 1
            ? `No se pueden lanzar runs nuevos mientras la variante ${trashedVariants[0]} esté en la papelera.`
            : `No se pueden lanzar runs nuevos mientras las variantes ${trashedVariants.join(" y ")} estén en la papelera.`}{" "}
          Los runs históricos se siguen mostrando.
        </div>
      )}
    </AppShell>
  );
}

function VariantCard({
  variant,
  name,
  promise,
  trashed,
}: {
  variant: "A" | "B";
  name: string;
  promise: string;
  trashed?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "28px 30px",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 180,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
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
          Variante {variant}
        </span>
        {trashed && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.45)",
              border: "1px solid rgba(var(--fg),0.15)",
              borderRadius: "var(--radius-pill)",
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
            En papelera
          </span>
        )}
      </div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: 26,
          lineHeight: 1.15,
          color: "var(--text-strong)",
          margin: 0,
        }}
      >
        {name}
      </h3>
      <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
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
  if (typeof v !== "number") return "·";
  return `${Math.round(v * 100)}%`;
}
