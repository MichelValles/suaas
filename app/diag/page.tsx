import { AppShell, PageHeading } from "@/components/app-shell";
import { isGatewayConfigured } from "@/lib/gateway";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

const TABLES = [
  "profiles",
  "targets",
  "runs",
  "messages",
  "metrics",
  "five_second_responses",
  "funnels",
  "funnel_steps",
  "funnel_step_responses",
  "gateway_usage",
  "ab_tests",
  "ab_test_runs",
  "copy_decks",
  "copy_blocks",
  "copy_responses",
  "pricing_offers",
  "pricing_prices",
  "pricing_responses",
] as const;

type TableStatus = {
  table: string;
  ok: boolean;
  count: number | null;
  error: string | null;
};

export default async function DiagPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const gatewayConfigured = isGatewayConfigured();

  let results: TableStatus[] = [];
  const runsColumns: { name: string; present: boolean }[] = [];
  if (supabaseConfigured) {
    const supa = getServerClient();
    results = await Promise.all(
      TABLES.map(async (table) => {
        const { count, error } = await supa
          .from(table)
          .select("*", { count: "exact", head: true });
        return {
          table,
          ok: !error,
          count: count ?? null,
          error: error?.message ?? null,
        };
      }),
    );

    const RUNS_COLS = [
      "target_id",
      "funnel_id",
      "ab_test_id",
      "copy_deck_id",
      "pricing_offer_id",
    ] as const;
    const cols = await Promise.all(
      RUNS_COLS.map(async (col) => {
        const { error } = await supa
          .from("runs")
          .select(col, { head: true, count: "exact" })
          .limit(1);
        return { name: col, present: !error };
      }),
    );
    runsColumns.push(...cols);
  }

  const missingRunsCols = runsColumns.filter((c) => !c.present).map((c) => c.name);
  const schemaOk =
    results.every((r) => r.ok) && missingRunsCols.length === 0;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Sistema · diagnóstico"
        title="Estado de la plataforma."
        description="Visión rápida del esquema de Supabase y de la configuración del entorno. Si una tabla aparece en rojo, aplica la migración correspondiente desde supabase/migrations en el SQL editor."
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatusBlock
          label="Versión"
          value={APP_VERSION}
          tone="neutral"
        />
        <StatusBlock
          label="Supabase"
          value={supabaseConfigured ? "configurado" : "no configurado"}
          tone={supabaseConfigured ? "ok" : "off"}
        />
        <StatusBlock
          label="AI Gateway"
          value={gatewayConfigured ? "configurado" : "no configurado"}
          tone={gatewayConfigured ? "ok" : "off"}
        />
        <StatusBlock
          label="Esquema"
          value={
            !supabaseConfigured
              ? "—"
              : schemaOk
                ? "todo verde"
                : "faltan migraciones"
          }
          tone={!supabaseConfigured ? "off" : schemaOk ? "ok" : "warn"}
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
          Tablas conocidas
        </h2>
        {!supabaseConfigured ? (
          <Notice tone="warn">Supabase no está configurado en este entorno.</Notice>
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
                  <Th>Tabla</Th>
                  <Th>Estado</Th>
                  <Th>Filas</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr
                    key={r.table}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {r.table}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="status-badge"
                        data-status={r.ok ? "ok" : "warn"}
                      >
                        {r.ok ? "ok" : "missing"}
                      </span>
                    </Td>
                    <Td>{r.count ?? "—"}</Td>
                    <Td>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: 12,
                        }}
                      >
                        {r.error ?? ""}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {supabaseConfigured && (
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
            Columnas críticas de `runs`
          </h2>
          {missingRunsCols.length > 0 && (
            <Notice tone="warn">
              Faltan columnas en <code className="mono">runs</code>:{" "}
              <strong>{missingRunsCols.join(", ")}</strong>. Aplica los ALTER
              TABLE pendientes (ver migraciones 0004 / 0006) o ejecuta el
              snippet idempotente que dejé en el chat.
            </Notice>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {runsColumns.map((c) => (
              <div
                key={c.name}
                style={{
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span className="mono" style={{ fontSize: 12 }}>
                  {c.name}
                </span>
                <span className="status-badge" data-status={c.present ? "ok" : "warn"}>
                  {c.present ? "ok" : "missing"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
          Endpoint JSON
        </h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          La misma información en bruto está disponible en{" "}
          <a
            href="/api/diag"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-500)" }}
          >
            /api/diag
          </a>
          . Útil para integraciones o checks externos.
        </p>
      </section>
    </AppShell>
  );
}

function StatusBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 18,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Notice({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn";
}) {
  const color = tone === "warn" ? "var(--warning-500)" : "var(--accent-500)";
  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        color: "rgba(255,255,255,0.85)",
        lineHeight: 1.6,
        fontSize: 14,
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
