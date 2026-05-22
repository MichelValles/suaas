import Link from "next/link";

type RunSummary = {
  id: string;
  created_at: string;
  status: string;
  params: Record<string, unknown> | null;
};

export type RunWithMetrics = {
  run: RunSummary;
  metrics: Record<string, number>;
};

export type RunMetricCell = {
  /** Clave del Record<string, number>. Si no existe o no es number → "—". */
  key: string;
  /** Etiqueta en mono uppercase encima del valor. */
  label: string;
  /** Si se omite, se asume número 0..1 a porcentaje entero. */
  format?: (v: number) => string;
};

/**
 * Cuadrícula de tarjetas para «Runs previos» en las páginas de detalle de
 * targets/funnels/copy/pricing/ab. Sustituye al patrón tabla y unifica la
 * presentación. Diseñada para Server Components (sin props función).
 */
export function RunsPreviousGrid({
  runs,
  metrics,
  resultsBase,
  emptyHint,
}: {
  runs: RunWithMetrics[];
  /** Hasta 4 métricas a mostrar por tarjeta. */
  metrics: RunMetricCell[];
  /** Prefijo de URL al que se concatena `runId` para "Ver resultados". */
  resultsBase: string;
  /** Texto en el placeholder cuando aún no hay runs. */
  emptyHint?: string;
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
          {emptyHint ??
            "Sin runs todavía. Lanza el primero desde el panel de abajo."}
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {runs.map((r) => (
            <RunCard
              key={r.run.id}
              run={r.run}
              metrics={r.metrics}
              fields={metrics}
              resultsHref={`${resultsBase}/${r.run.id}`}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RunCard({
  run,
  metrics,
  fields,
  resultsHref,
}: {
  run: RunSummary;
  metrics: Record<string, number>;
  fields: RunMetricCell[];
  resultsHref: string;
}) {
  const ids = (run.params?.profileIds as string[] | undefined) ?? [];
  const n = ids.length || (typeof metrics.n === "number" ? metrics.n : 0);
  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "16px 18px 14px",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {formatDate(run.created_at)}
        </span>
        <StatusBadge status={run.status} />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 12,
        }}
      >
        <MetricCell label="N perfiles" value={n > 0 ? String(n) : "—"} />
        {fields.map((f) => (
          <MetricCell
            key={f.key}
            label={f.label}
            value={formatMetric(metrics[f.key], f.format)}
          />
        ))}
      </div>

      <Link
        href={resultsHref}
        className="mono"
        style={{
          alignSelf: "flex-start",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
        }}
      >
        Ver resultados →
      </Link>
    </li>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 15,
          color: "#fff",
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "done"
      ? "var(--accent-500)"
      : status === "error"
        ? "var(--error-500)"
        : "rgba(255,255,255,0.55)";
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color === "rgba(255,255,255,0.55)" ? "rgba(255,255,255,0.18)" : color}`,
        borderRadius: "var(--radius-pill)",
        padding: "3px 8px",
        opacity: 0.95,
      }}
    >
      {status}
    </span>
  );
}

function formatMetric(
  v: number | undefined,
  format?: (v: number) => string,
): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (format) return format(v);
  return `${Math.round(v * 100)}%`;
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
