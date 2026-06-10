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
  /** Clave del Record<string, number>. Si no existe o no es number → "·". */
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
  repeatSampleBase,
}: {
  runs: RunWithMetrics[];
  /** Hasta 4 métricas a mostrar por tarjeta. */
  metrics: RunMetricCell[];
  /** Prefijo de URL al que se concatena `runId` para "Ver resultados". */
  resultsBase: string;
  /** Texto en el placeholder cuando aún no hay runs. */
  emptyHint?: string;
  /**
   * URL del detalle de la entidad. Si se pasa y el run guarda profileIds,
   * la tarjeta ofrece «Repetir con esta muestra» (mismos perfiles
   * preseleccionados vía ?profiles=...). Iterar sobre muestras distintas
   * invalida la comparación entre runs.
   */
  repeatSampleBase?: string;
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
        Runs previos
      </h2>

      {runs.length === 0 ? (
        <div
          style={{
            padding: "26px 24px",
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 14,
            lineHeight: 1.55,
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
            gap: 16,
          }}
        >
          {runs.map((r) => (
            <RunCard
              key={r.run.id}
              run={r.run}
              metrics={r.metrics}
              fields={metrics}
              resultsHref={`${resultsBase}/${r.run.id}`}
              repeatSampleBase={repeatSampleBase}
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
  repeatSampleBase,
}: {
  run: RunSummary;
  metrics: Record<string, number>;
  fields: RunMetricCell[];
  resultsHref: string;
  repeatSampleBase?: string;
}) {
  const ids = (run.params?.profileIds as string[] | undefined) ?? [];
  const n = ids.length || (typeof metrics.n === "number" ? metrics.n : 0);
  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "22px 22px 20px",
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "rgba(var(--fg),0.7)",
          }}
        >
          {formatDate(run.created_at)}
        </span>
        <StatusBadge status={run.status} />
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "14px 18px",
        }}
      >
        <MetricCell label="N perfiles" value={n > 0 ? String(n) : "·"} />
        {fields.map((f) => (
          <MetricCell
            key={f.key}
            label={f.label}
            value={formatMetric(metrics[f.key], f.format)}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 18px",
          paddingTop: 4,
        }}
      >
        <Link
          href={resultsHref}
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Ver resultados →
        </Link>
        {repeatSampleBase && ids.length > 0 && (
          <Link
            href={`${repeatSampleBase}?profiles=${ids.join(",")}`}
            className="mono"
            title="Preselecciona los mismos perfiles de este run en el panel de lanzamiento"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Repetir con esta muestra →
          </Link>
        )}
      </div>
    </li>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.45)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 16,
          color: "var(--text-strong)",
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
        : "rgba(var(--fg),0.55)";
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color === "rgba(var(--fg),0.55)" ? "rgba(var(--fg),0.18)" : color}`,
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
  if (typeof v !== "number" || !Number.isFinite(v)) return "·";
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
