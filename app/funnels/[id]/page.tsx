import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getFunnel } from "@/lib/funnels";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByFunnel } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function FunnelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Embudo" title="Supabase aún no está conectado." />
        <Link href="/funnels" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const funnel = await getFunnel(id);
  if (!funnel) notFound();

  const [profiles, runs] = await Promise.all([
    listProfiles(),
    listRunsByFunnel(funnel.id),
  ]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Embudo · ${funnel.steps.length} ${funnel.steps.length === 1 ? "paso" : "pasos"}`}
        title={funnel.name}
        description={funnel.description ?? undefined}
        actions={
          <Link href="/funnels" className="btn-pill">
            Volver
          </Link>
        }
      />

      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {funnel.steps.map((step, idx) => (
          <li
            key={step.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)",
              gap: 20,
              padding: 20,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.02)",
              alignItems: "start",
            }}
          >
            <Hero src={step.payload.image_url} alt={`${step.name} · paso ${idx + 1}`} />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--accent-500)",
                }}
              >
                Paso {idx + 1} de {funnel.steps.length} · {step.payload.kind}
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 28,
                  lineHeight: 1.15,
                  color: "#fff",
                  margin: 0,
                }}
              >
                {step.name}
              </h2>
              <Block label="Intent">{step.intent}</Block>
              {step.payload.source_url && (
                <Block label="Fuente">
                  <a
                    href={step.payload.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 13,
                      wordBreak: "break-all",
                    }}
                  >
                    {step.payload.source_url}
                  </a>
                </Block>
              )}
            </div>
          </li>
        ))}
      </ol>

      <RunsSection runs={runsWithMetrics} />

      <ProfileLaunchPanel
        title="Lanzar recorrido del embudo"
        endpoint="/api/runs/funnel"
        extraBody={{ funnelId: funnel.id }}
        progressLabel={`Cada perfil recorrerá hasta ${funnel.steps.length} pasos. Estimado ~${Math.ceil(funnel.steps.length * 5)}s por perfil.`}
        redirectTo={(json) => `/experiments/funnel/${json.runId}`}
        profiles={profiles}
      />
    </AppShell>
  );
}

function Hero({ src, alt }: { src: string; alt: string }) {
  const isData = src.startsWith("data:");
  if (isData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={840}
      height={525}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    />
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
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
          Sin runs todavía. Lanza el primer recorrido desde el panel de abajo.
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
                <Th>Fecha</Th>
                <Th>N</Th>
                <Th>Completion</Th>
                <Th>Esfuerzo medio</Th>
                <Th>Claridad intent</Th>
                <Th>Estado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {runs.map(({ run, metrics }) => {
                const ids = (run.params?.profileIds as string[] | undefined) ?? [];
                return (
                  <tr
                    key={run.id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Td>{formatDate(run.created_at)}</Td>
                    <Td>{ids.length || metrics.n || "—"}</Td>
                    <Td>{fmtPct(metrics.completion_rate)}</Td>
                    <Td>{fmtPct(metrics.mean_effort)}</Td>
                    <Td>{fmtPct(metrics.mean_intent_match)}</Td>
                    <Td>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color:
                            run.status === "done"
                              ? "var(--accent-500)"
                              : run.status === "error"
                                ? "var(--error-500)"
                                : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {run.status}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/experiments/funnel/${run.id}`}
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
