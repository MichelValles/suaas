import { AppShell, PageHeading } from "@/components/app-shell";
import { getGatewayCredits, getUsageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const [credits, summary] = await Promise.all([
    getGatewayCredits(),
    getUsageSummary(),
  ]);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Sistema · tokens"
        title="Consumo del AI Gateway."
        description="Crédito disponible del Vercel AI Gateway y consumo acumulado registrado por SUAAS, desglosado por modelo y por scope."
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <Card
          label="Crédito gateway"
          value={
            credits.ok && credits.balance !== null
              ? formatNumber(credits.balance)
              : credits.ok
                ? "—"
                : "no disponible"
          }
          hint={
            credits.ok
              ? credits.balance === null
                ? "El endpoint respondió pero no expone 'balance'."
                : "Saldo restante reportado por el gateway."
              : credits.error ?? undefined
          }
          tone={credits.ok && credits.balance !== null ? "ok" : "warn"}
        />
        <Card
          label="Total tokens (SUAAS)"
          value={formatNumber(summary.total.total)}
          hint={`Acumulado en ${summary.total.calls} llamadas registradas.`}
          tone={summary.total.calls > 0 ? "neutral" : "off"}
        />
        <Card
          label="Prompt tokens"
          value={formatNumber(summary.total.prompt)}
          tone="neutral"
        />
        <Card
          label="Completion tokens"
          value={formatNumber(summary.total.completion)}
          tone="neutral"
        />
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
          Por modelo
        </h2>
        {summary.byModel.length === 0 ? (
          <Notice>Aún no hay llamadas registradas en `gateway_usage`.</Notice>
        ) : (
          <UsageTable rows={summary.byModel} />
        )}
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
          Por scope
        </h2>
        {summary.byScope.length === 0 ? (
          <Notice>Sin datos de scope todavía.</Notice>
        ) : (
          <UsageTable rows={summary.byScope} />
        )}
      </section>

      {summary.last7d.length > 0 && (
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
            Últimos 7 días
          </h2>
          <DayBars rows={summary.last7d} />
        </section>
      )}

      <section
        style={{
          padding: 16,
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-md)",
          color: "rgba(255,255,255,0.55)",
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        Si el crédito del gateway aparece como «no disponible», puede ser que la
        clave actual no tenga permiso para consultar `/v1/credits` o que tu plan
        no exponga ese endpoint. El acumulado de SUAAS sigue siendo válido.
      </section>
    </AppShell>
  );
}

function UsageTable({
  rows,
}: {
  rows: { key: string; prompt: number; completion: number; total: number; calls: number }[];
}) {
  const max = rows[0]?.total ?? 1;
  return (
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
              <Td>{r.calls}</Td>
              <Td>{formatNumber(r.prompt)}</Td>
              <Td>{formatNumber(r.completion)}</Td>
              <Td>{formatNumber(r.total)}</Td>
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 8,
        alignItems: "end",
        padding: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        minHeight: 180,
      }}
    >
      {rows.map((r) => (
        <div
          key={r.date}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "center",
            justifyContent: "flex-end",
            height: "100%",
          }}
          title={`${r.date}: ${formatNumber(r.total)} tokens · ${r.calls} llamadas`}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 40,
              height: `${(r.total / max) * 100}%`,
              minHeight: 4,
              background: "var(--accent-500)",
              borderRadius: 2,
              opacity: 0.85,
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
  );
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "warn" | "off" | "neutral";
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
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="display"
        style={{ fontSize: 32, lineHeight: 1, color: accent }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
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

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}
