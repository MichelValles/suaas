import Link from "next/link";

/**
 * Bloques de comparación lado a lado entre dos variantes o dos runs.
 * Extraídos de la comparativa A/B (`/experiments/ab/[abTestId]`) y
 * parametrizados para reutilizarse en la comparativa run vs run de
 * campañas (`/campaigns/[id]/compare`). Server Components puros.
 */

export function fmtComparePct(v: number | null): string {
  if (v === null) return "·";
  return `${Math.round(v * 100)}%`;
}

/**
 * Regla de empate compartida: diferencias menores a epsilon no declaran
 * ganador (con muestras sintéticas pequeñas serían ruido, no señal).
 */
export function pickCompareWinner(
  ka: number,
  kb: number,
  epsilon = 0.02,
): "A" | "B" | "tie" {
  if (Math.abs(ka - kb) < epsilon) return "tie";
  return ka > kb ? "A" : "B";
}

export type CompareMetric = { label: string; value: string };

export function CompareCard({
  variantLabel,
  title,
  subtitle,
  metrics,
  detailHref,
  detailLabel = "Detalle del run →",
  winner,
}: {
  /** Etiqueta mono superior («Variante A», «Run base», fecha…). */
  variantLabel: string;
  title: string;
  subtitle?: string;
  /** Hasta 4 métricas en la franja inferior. */
  metrics: CompareMetric[];
  detailHref?: string;
  detailLabel?: string;
  winner: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${winner ? "var(--accent-500)" : "rgba(var(--fg),0.08)"}`,
        borderRadius: "var(--radius-md)",
        padding: "28px 32px",
        background: winner ? "rgba(250,204,13,0.06)" : "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          {variantLabel}
        </span>
        {winner && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            Ganadora
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 26,
            color: "var(--text-strong)",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          paddingTop: 6,
          paddingBottom: 4,
          borderTop: "1px solid rgba(var(--fg),0.06)",
          marginTop: 4,
        }}
      >
        {metrics.map((m) => (
          <CompareMetricCell key={m.label} label={m.label} value={m.value} />
        ))}
      </div>
      {detailHref && (
        <Link
          href={detailHref}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            marginTop: 4,
          }}
        >
          {detailLabel}
        </Link>
      )}
    </div>
  );
}

function CompareMetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 26,
          color: "var(--text-strong)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function DeltaBar({
  labelA,
  labelB,
  valueA,
  valueB,
  title,
}: {
  labelA: string;
  labelB: string;
  valueA: number;
  valueB: number;
  title: string;
}) {
  const max = Math.max(valueA, valueB, 0.01);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3
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
      </h3>
      <Bar label={labelA} value={valueA} max={max} />
      <Bar label={labelB} value={valueB} max={max} />
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 50px", gap: 12, alignItems: "center" }}>
      <span style={{ color: "rgba(var(--fg),0.8)", fontSize: 13 }}>{label}</span>
      <div
        style={{
          height: 10,
          background: "rgba(var(--fg),0.06)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: "100%",
            background: "var(--accent-500)",
          }}
        />
      </div>
      <span className="mono" style={{ color: "rgba(var(--fg),0.85)", fontSize: 12 }}>
        {fmtComparePct(value)}
      </span>
    </div>
  );
}
