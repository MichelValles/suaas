import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByTarget } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTarget } from "@/lib/targets";
import { LaunchPanel } from "./launch-panel";

export const dynamic = "force-dynamic";

export default async function TargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Target" title="Supabase aún no está conectado." />
        <Link href="/targets" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const target = await getTarget(id);
  if (!target) notFound();

  const [profiles, runs] = await Promise.all([
    listProfiles(),
    listRunsByTarget(target.id),
  ]);

  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({
      run: r,
      metrics: await getMetricsForRun(r.id),
    })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`${target.kind} · ${target.name}`}
        title={target.payload.main_promise}
        description={
          target.payload.source_url
            ? `Fuente: ${target.payload.source_url}`
            : undefined
        }
        actions={
          <Link href="/targets" className="btn-pill">
            Volver
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <Hero src={target.payload.image_url} alt={target.name} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            padding: 24,
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
            Cómo funciona el test
          </span>
          <p
            className="body"
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Cada perfil ve la pantalla durante 5 segundos. Luego responde qué
            recuerda y qué cree que se le ofrece. Un segundo modelo compara ese
            recuerdo con la promesa principal y devuelve un score 0..1
            (comprehension_rate).
          </p>
        </div>
      </section>

      <RunsSection
        runs={runsWithMetrics}
        emptyMsg="Sin runs todavía. Lanza el primer test desde el panel de abajo."
      />

      <LaunchPanel
        targetId={target.id}
        profiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          demo: `${p.demographics.age} · ${p.demographics.gender} · ${p.demographics.occupation}`,
        }))}
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
          borderRadius: "var(--radius-md)",
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
      width={960}
      height={600}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    />
  );
}

function RunsSection({
  runs,
  emptyMsg,
}: {
  runs: Array<{ run: { id: string; created_at: string; status: string; params: Record<string, unknown> | null }; metrics: Record<string, number> }>;
  emptyMsg: string;
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
          {emptyMsg}
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
                <Th>Claridad</Th>
                <Th>Compr.</Th>
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
                    <Td>{fmtPct(metrics.mean_clarity)}</Td>
                    <Td>{fmtPct(metrics.mean_comprehension)}</Td>
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
                        href={`/experiments/five-second/${run.id}`}
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
  return (
    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>
  );
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
