import { AppShell, PageHeading } from "@/components/app-shell";
import { getGatewayCredits, getUsageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const [credits, summary] = await Promise.all([
    getGatewayCredits(),
    getUsageSummary(),
  ]);

  const balanceStr =
    credits.ok && credits.balance !== null
      ? formatUsd(credits.balance)
      : credits.ok
        ? "—"
        : "no disponible";
  const balanceHint = credits.ok
    ? credits.balance === null
      ? "El endpoint respondió pero no expone «balance»."
      : credits.totalUsed !== null
        ? `Total gastado en el gateway: ${formatUsd(credits.totalUsed)}.`
        : "Saldo restante reportado por el gateway."
    : credits.error ?? undefined;

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(32px, 4vw, 56px)",
        }}
      >
        <PageHeading
          eyebrow="Sistema · tokens"
          title="Consumo del AI Gateway."
        />

        {/* HERO: saldo en dinero + total tokens */}
        <section
          aria-label="Saldo y total"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <BigKpi
            label="Saldo restante (USD)"
            value={balanceStr}
            hint={balanceHint}
            tone={
              credits.ok && credits.balance !== null
                ? credits.balance < 5
                  ? "warn"
                  : "ok"
                : "warn"
            }
          />
          <BigKpi
            label="Total tokens consumidos"
            value={formatNumber(summary.total.total)}
            hint={
              summary.total.calls > 0
                ? `Acumulado en ${formatNumber(summary.total.calls)} llamadas registradas.`
                : "Sin llamadas registradas todavía."
            }
            tone={summary.total.calls > 0 ? "accent" : "off"}
          />
        </section>

        {/* Tokens desglosados */}
        <section
          aria-label="Tokens por tipo"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <SmallStat
            label="Prompt tokens"
            value={formatNumber(summary.total.prompt)}
            hint="Entrada que enviamos al modelo."
          />
          <SmallStat
            label="Completion tokens"
            value={formatNumber(summary.total.completion)}
            hint="Tokens generados por el modelo."
          />
          <SmallStat
            label="Llamadas"
            value={formatNumber(summary.total.calls)}
            hint="Filas insertadas en gateway_usage."
          />
          <SmallStat
            label="Última actualización"
            value={summary.lastUpdated ? formatRelative(summary.lastUpdated) : "—"}
            hint={summary.lastUpdated ?? "Aún sin registros."}
          />
        </section>

        {/* Por modelo */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Por modelo</SectionLabel>
          {summary.byModel.length === 0 ? (
            <Notice>Aún no hay llamadas registradas en `gateway_usage`.</Notice>
          ) : (
            <UsageTable rows={summary.byModel} />
          )}
        </section>

        {/* Por scope */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Por scope</SectionLabel>
          {summary.byScope.length === 0 ? (
            <Notice>Sin datos de scope todavía.</Notice>
          ) : (
            <UsageTable rows={summary.byScope} />
          )}
        </section>

        {/* Últimos 7 días */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Últimos 7 días</SectionLabel>
          {summary.last7d.length === 0 ? (
            <Notice>Sin actividad en la última semana.</Notice>
          ) : (
            <DayBars rows={summary.last7d} />
          )}
        </section>

        {/* Footer notice */}
        <p
          style={{
            padding: "16px 20px",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Si el saldo aparece como «no disponible», puede ser que la clave
          actual no tenga permiso para consultar `/v1/credits` o que tu plan no
          exponga ese endpoint. El consumo de tokens en SUAAS sigue siendo válido.
        </p>
      </div>
    </AppShell>
  );
}

// ============================================================
// Componentes
// ============================================================

function BigKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "warn" | "off" | "accent";
}) {
  const accent =
    tone === "ok"
      ? "var(--success-500)"
      : tone === "warn"
        ? "var(--warning-500)"
        : tone === "off"
          ? "rgba(255,255,255,0.4)"
          : "var(--accent-500)";
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: `3px solid ${accent}`,
        borderRadius: "var(--radius-md)",
        padding: "28px 28px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "rgba(255,255,255,0.02)",
        minHeight: 180,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(36px, 4vw, 56px)",
          lineHeight: 1,
          color: accent,
        }}
      >
        {value}
      </span>
      {hint && (
        <span
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.5,
            marginTop: "auto",
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

function SmallStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(255,255,255,0.02)",
      }}
    >
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
      <span
        className="mono"
        style={{
          fontSize: 20,
          color: "#fff",
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  );
}

function UsageTable({
  rows,
}: {
  rows: { key: string; prompt: number; completion: number; total: number; calls: number }[];
}) {
  const max = rows[0]?.total ?? 1;
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
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
            <Th>Clave</Th>
            <Th>Llamadas</Th>
            <Th>Prompt</Th>
            <Th>Completion</Th>
            <Th>Total</Th>
            <Th>Distribución</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Td>
                <span className="mono" style={{ fontSize: 12 }}>
                  {r.key}
                </span>
              </Td>
              <Td>{formatNumber(r.calls)}</Td>
              <Td>{formatNumber(r.prompt)}</Td>
              <Td>{formatNumber(r.completion)}</Td>
              <Td>
                <strong style={{ color: "#fff" }}>{formatNumber(r.total)}</strong>
              </Td>
              <Td>
                <div
                  style={{
                    width: 160,
                    height: 8,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${max === 0 ? 0 : (r.total / max) * 100}%`,
                      height: "100%",
                      background: "var(--accent-500)",
                    }}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayBars({
  rows,
}: {
  rows: { date: string; total: number; calls: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  const totalWeek = rows.reduce((acc, r) => acc + r.total, 0);
  const callsWeek = rows.reduce((acc, r) => acc + r.calls, 0);
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em" }}
        >
          {rows.length} {rows.length === 1 ? "día" : "días"} con actividad
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: "0.16em" }}
        >
          {formatNumber(totalWeek)} tokens · {formatNumber(callsWeek)} llamadas
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, 1fr)`,
          gap: 12,
          alignItems: "end",
          minHeight: 200,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.date}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
            title={`${r.date}: ${formatNumber(r.total)} tokens · ${r.calls} llamadas`}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 700,
              }}
            >
              {formatCompact(r.total)}
            </span>
            <div
              style={{
                width: "100%",
                maxWidth: 56,
                height: `${(r.total / max) * 100}%`,
                minHeight: 4,
                background: "var(--accent-500)",
                borderRadius: 3,
                opacity: 0.9,
              }}
            />
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {r.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-md)",
        color: "rgba(255,255,255,0.6)",
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "12px 14px",
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
    <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>{children}</td>
  );
}

// ============================================================
// Formatters
// ============================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return iso.slice(0, 10);
}
