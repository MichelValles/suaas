import { AppShell, PageHeading } from "@/components/app-shell";
import { isGatewayConfigured } from "@/lib/gateway";
import { getMigrationsStatus, type MigrationsStatus } from "@/lib/migrations";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

// Cada tabla con la migración que la crea: si la tabla entera falta,
// pendingMigrations debe señalar esa migración (aplicar solo el ALTER
// de una posterior fallaría con "relation does not exist").
// Mantener en paridad con app/api/diag/route.ts.
const TABLES = [
  { table: "profiles", migration: "0001_initial.sql" },
  { table: "targets", migration: "0001_initial.sql" },
  { table: "runs", migration: "0001_initial.sql" },
  { table: "messages", migration: "0001_initial.sql" },
  { table: "metrics", migration: "0001_initial.sql" },
  { table: "five_second_responses", migration: "0002_five_second.sql" },
  { table: "funnels", migration: "0003_funnels.sql" },
  { table: "funnel_steps", migration: "0003_funnels.sql" },
  { table: "funnel_step_responses", migration: "0004_funnel_runs.sql" },
  { table: "gateway_usage", migration: "0005_gateway_usage.sql" },
  { table: "ab_tests", migration: "0006_ab_copy_pricing.sql" },
  { table: "ab_test_runs", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_decks", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_blocks", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_responses", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_offers", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_prices", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_responses", migration: "0006_ab_copy_pricing.sql" },
  { table: "campaigns", migration: "0008_campaigns.sql" },
  { table: "campaign_responses", migration: "0008_campaigns.sql" },
  { table: "geo_analyses", migration: "0015_gravity_model.sql" },
  { table: "momentum_challenges", migration: "0016_momentum.sql" },
] as const;

// Columnas añadidas por migraciones posteriores a la creación de cada tabla.
// No basta con que la tabla exista: una migración a medio aplicar deja la
// columna fuera y el módulo correspondiente roto. Mantener en paridad con
// app/api/diag/route.ts.
const CRITICAL_COLUMNS = [
  // runs: enlaces opcionales hacia cada módulo testeable
  { table: "runs", column: "target_id", migration: "0001_initial.sql" },
  { table: "runs", column: "funnel_id", migration: "0004_funnel_runs.sql" },
  { table: "runs", column: "ab_test_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "copy_deck_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "pricing_offer_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "campaign_id", migration: "0008_campaigns.sql" },
  // papelera (soft delete)
  { table: "targets", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "funnels", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "ab_tests", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "copy_decks", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "pricing_offers", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "campaigns", column: "deleted_at", migration: "0008_campaigns.sql" },
  { table: "profiles", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  { table: "geo_analyses", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  { table: "momentum_challenges", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  // campañas: multicanal y estrategia
  { table: "campaigns", column: "channels", migration: "0011_campaigns_multichannel.sql" },
  { table: "campaigns", column: "strategy", migration: "0013_campaigns_strategy.sql" },
  // Gravity Model
  { table: "profiles", column: "intent_context", migration: "0015_gravity_model.sql" },
  { table: "five_second_responses", column: "behavior_class", migration: "0015_gravity_model.sql" },
] as const;

type TableStatus = {
  table: string;
  migration: string;
  ok: boolean;
  count: number | null;
  error: string | null;
};

type ColumnStatus = {
  table: string;
  column: string;
  migration: string;
  present: boolean;
};

export default async function DiagPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const gatewayConfigured = isGatewayConfigured();

  let results: TableStatus[] = [];
  const columns: ColumnStatus[] = [];
  let migrations: MigrationsStatus = { tracking: false };
  if (supabaseConfigured) {
    migrations = await getMigrationsStatus().catch(
      (): MigrationsStatus => ({ tracking: false }),
    );
  }
  if (supabaseConfigured) {
    const supa = getServerClient();
    results = await Promise.all(
      TABLES.map(async ({ table, migration }) => {
        const { count, error } = await supa
          .from(table)
          .select("*", { count: "exact", head: true });
        return {
          table,
          migration,
          ok: !error,
          count: count ?? null,
          error: error?.message ?? null,
        };
      }),
    );

    // select head sobre la columna concreta: present = !error. Si la tabla
    // entera falta, la columna también cuenta como ausente.
    const cols = await Promise.all(
      CRITICAL_COLUMNS.map(async ({ table, column, migration }) => {
        const { error } = await supa
          .from(table)
          .select(column, { head: true, count: "exact" })
          .limit(1);
        return { table, column, migration, present: !error };
      }),
    );
    columns.push(...cols);
  }

  const missingColumns = columns.filter((c) => !c.present);
  // Tablas ausentes primero: su migración creadora precede a cualquier
  // ALTER posterior sobre ellas.
  const missingTables = results.filter((r) => !r.ok);
  const pendingMigrations = [
    ...new Set([
      ...missingTables.map((t) => t.migration),
      ...missingColumns.map((c) => c.migration),
    ]),
  ].sort();
  const schemaOk =
    results.every((r) => r.ok) && missingColumns.length === 0;

  // Agrupar columnas por tabla para la UI, conservando el orden de la lista.
  const columnGroups: { table: string; columns: ColumnStatus[] }[] = [];
  for (const col of columns) {
    const group = columnGroups.find((g) => g.table === col.table);
    if (group) {
      group.columns.push(col);
    } else {
      columnGroups.push({ table: col.table, columns: [col] });
    }
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Sistema · diagnóstico"
        title="Estado de la plataforma."
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
              ? "·"
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
            color: "var(--accent-text)",
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
                color: "rgba(var(--fg),0.85)",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "rgba(var(--fg),0.55)" }}>
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
                    style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}
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
                    <Td>{r.count ?? "·"}</Td>
                    <Td>
                      <span
                        style={{
                          color: "rgba(var(--fg),0.55)",
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
              color: "var(--accent-text)",
              margin: 0,
            }}
          >
            Columnas críticas
          </h2>
          {pendingMigrations.length > 0 && (
            <Notice tone="warn">
              {missingTables.length > 0 && (
                <>
                  Faltan tablas:{" "}
                  <strong>{missingTables.map((t) => t.table).join(", ")}</strong>.{" "}
                </>
              )}
              {missingColumns.length > 0 && (
                <>
                  Faltan columnas:{" "}
                  <strong>
                    {missingColumns.map((c) => `${c.table}.${c.column}`).join(", ")}
                  </strong>
                  .{" "}
                </>
              )}
              Aplica en orden en el SQL editor de Supabase los archivos
              pendientes de <code className="mono">supabase/migrations</code>:{" "}
              <strong>{pendingMigrations.join(", ")}</strong>. Si tras
              aplicarlos PostgREST sigue sirviendo el esquema cacheado, ejecuta{" "}
              <code className="mono">NOTIFY pgrst, &apos;reload schema&apos;;</code>
            </Notice>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {columnGroups.map((group) => (
              <div
                key={group.table}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <h3
                  className="mono"
                  style={{
                    fontSize: 12,
                    margin: 0,
                    color: "rgba(var(--fg),0.7)",
                  }}
                >
                  {group.table}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 8,
                  }}
                >
                  {group.columns.map((c) => (
                    <div
                      key={`${c.table}.${c.column}`}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid rgba(var(--fg),0.08)",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(var(--fg),0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        <span className="mono" style={{ fontSize: 12 }}>
                          {c.column}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: c.present
                              ? "rgba(var(--fg),0.45)"
                              : "var(--warning-text)",
                          }}
                        >
                          {c.migration}
                        </span>
                      </span>
                      <span
                        className="status-badge"
                        data-status={c.present ? "ok" : "warn"}
                      >
                        {c.present ? "ok" : "missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {supabaseConfigured && (
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
            Tracking de migraciones
          </h2>
          {!migrations.tracking ? (
            <Notice tone="warn">
              La tabla <code className="mono">suaas_migrations</code> no existe
              todavía: aplica <code className="mono">0019_consolidacion.sql</code>{" "}
              en el SQL editor para activar el tracking (incluye el backfill de
              las migraciones anteriores).
            </Notice>
          ) : migrations.pending.length > 0 ? (
            <Notice tone="warn">
              Migraciones sin registrar como aplicadas:{" "}
              <strong>{migrations.pending.join(", ")}</strong>. Aplícalas en el
              SQL editor (cada una registra su propia fila al final).
            </Notice>
          ) : (
            <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              Las {migrations.applied.length} migraciones conocidas constan como
              aplicadas.
            </p>
          )}
        </section>
      )}

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
          Endpoint JSON
        </h2>
        <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          La misma información en bruto está disponible en{" "}
          <a
            href="/api/diag"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-text)" }}
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
      ? "var(--success-text)"
      : tone === "warn"
        ? "var(--warning-text)"
        : tone === "off"
          ? "rgba(var(--fg),0.4)"
          : "var(--accent-text)";
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(var(--fg),0.02)",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
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
  const color = tone === "warn" ? "var(--warning-text)" : "var(--accent-text)";
  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        color: "rgba(var(--fg),0.85)",
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
