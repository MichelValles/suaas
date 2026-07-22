import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { formatUsd, usdForTokens } from "@/lib/model-pricing";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getUsageSummary,
  listUsageRows,
  USAGE_SCOPES,
  type UsageRow,
} from "@/lib/usage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gravity · Observabilidad" };

const PAGE_SIZE = 50;

type SP = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ObservabilidadPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="SISTEMA"
          title="Observabilidad"
          description="Supabase aún no está conectado: no hay telemetría que inspeccionar."
        />
      </AppShell>
    );
  }

  const sp = await searchParams;
  const model = one(sp.model);
  const scope = one(sp.scope);
  const failedOnly = one(sp.failed) === "1";
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [summary, { rows, total }] = await Promise.all([
    getUsageSummary(),
    listUsageRows({
      model: model || undefined,
      scope: scope || undefined,
      failedOnly,
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  // Coste real acumulado (todas las llamadas): tokens por modelo × tarifa.
  const totalUsd = summary.byModel.reduce(
    (s, b) => s + usdForTokens(b.key, b.prompt, b.completion),
    0,
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const modelOptions = summary.byModel.map((b) => b.key);

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    if (model) p.set("model", model);
    if (scope) p.set("scope", scope);
    if (failedOnly) p.set("failed", "1");
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/observabilidad?${s}` : "/observabilidad";
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA"
        title="Observabilidad"
        description="Inspector de las llamadas al AI Gateway: cada salida de modelo con su fecha, scope, modelo, tokens, coste y latencia. El coste se calcula al vuelo (tokens × tarifa del modelo); no se persiste."
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/evaluacion" className="btn-pill solid">
              Evaluación de calidad
            </Link>
            <Link href="/tokens" className="btn-pill">
              Consumo y modelos
            </Link>
          </div>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* KPIs (acumulado global) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <Kpi label="Coste real acumulado" value={formatUsd(totalUsd)} accent />
          <Kpi
            label="Tokens totales"
            value={summary.total.total.toLocaleString("es-ES")}
          />
          <Kpi
            label="Llamadas registradas"
            value={summary.total.calls.toLocaleString("es-ES")}
          />
          <Kpi
            label="Última llamada"
            value={summary.lastUpdated ? fmtDate(summary.lastUpdated) : "–"}
          />
        </div>

        {/* Filtros */}
        <form
          method="GET"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Select label="Modelo" name="model" value={model} options={modelOptions} />
          <Select label="Scope" name="scope" value={scope} options={USAGE_SCOPES} />
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(var(--fg),0.75)",
              padding: "10px 0",
            }}
          >
            <input type="checkbox" name="failed" value="1" defaultChecked={failedOnly} />
            Solo fallidas
          </label>
          <button type="submit" className="btn-pill solid" style={{ fontSize: 13 }}>
            Filtrar
          </button>
          {(model || scope || failedOnly) && (
            <Link href="/observabilidad" className="btn-pill" style={{ fontSize: 13 }}>
              Limpiar
            </Link>
          )}
        </form>

        {/* Tabla de llamadas */}
        {total === 0 ? (
          <div
            style={{
              padding: "36px 32px",
              border: "1px dashed rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(var(--fg),0.55)",
              fontSize: 14,
            }}
          >
            {model || scope || failedOnly
              ? "Ninguna llamada coincide con el filtro."
              : "Aún no hay llamadas registradas en gateway_usage."}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  minWidth: 900,
                }}
              >
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Scope</Th>
                    <Th>Modelo</Th>
                    <Th right>Prompt</Th>
                    <Th right>Compl.</Th>
                    <Th right>Total</Th>
                    <Th right>Coste</Th>
                    <Th right>Latencia</Th>
                    <Th>Estado</Th>
                    <Th>Run</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 11, color: "rgba(var(--fg),0.5)" }}
              >
                {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} de{" "}
                {total.toLocaleString("es-ES")} · página {page}/{pageCount}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {page > 1 ? (
                  <Link href={qs({ page: String(page - 1) })} className="btn-pill" style={{ fontSize: 13 }}>
                    ← Anterior
                  </Link>
                ) : (
                  <span className="btn-pill" style={{ fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    ← Anterior
                  </span>
                )}
                {page < pageCount ? (
                  <Link href={qs({ page: String(page + 1) })} className="btn-pill" style={{ fontSize: 13 }}>
                    Siguiente →
                  </Link>
                ) : (
                  <span className="btn-pill" style={{ fontSize: 13, opacity: 0.4, pointerEvents: "none" }}>
                    Siguiente →
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── piezas ─────────────────────────────────────────────────

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
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
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.45)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          lineHeight: 1.1,
          color: accent ? "var(--accent-500)" : "var(--text-strong)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Select({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {label}
      </span>
      <select
        name={name}
        defaultValue={value}
        style={{
          background: "var(--surface-panel)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "9px 12px",
          color: "var(--text-strong)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          outline: "none",
          minWidth: 200,
          cursor: "pointer",
        }}
      >
        <option value="" style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}>
          Todos
        </option>
        {options.map((o) => (
          <option
            key={o}
            value={o}
            style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}
          >
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className="mono"
      style={{
        textAlign: right ? "right" : "left",
        padding: "8px 12px",
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(var(--fg),0.45)",
        borderBottom: "1px solid rgba(var(--fg),0.1)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  color,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
}) {
  return (
    <td
      className={mono ? "mono" : undefined}
      style={{
        textAlign: right ? "right" : "left",
        padding: "8px 12px",
        color: color ?? "rgba(var(--fg),0.8)",
        borderBottom: "1px solid rgba(var(--fg),0.05)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function Row({ r }: { r: UsageRow }) {
  return (
    <tr>
      <Td mono color="rgba(var(--fg),0.6)">
        {fmtDate(r.createdAt)}
      </Td>
      <Td mono>{r.scope}</Td>
      <Td mono color="rgba(var(--fg),0.7)">
        {r.model}
      </Td>
      <Td right mono>
        {fmtNum(r.promptTokens)}
      </Td>
      <Td right mono>
        {fmtNum(r.completionTokens)}
      </Td>
      <Td right mono color="var(--text-strong)">
        {fmtNum(r.totalTokens)}
      </Td>
      <Td right mono>
        {r.usd > 0 ? formatUsd(r.usd) : "–"}
      </Td>
      <Td right mono color="rgba(var(--fg),0.6)">
        {fmtLatency(r.latencyMs)}
      </Td>
      <Td>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: r.failed ? "var(--error-text)" : "var(--success-text)",
          }}
        >
          {r.failed ? "fallo" : "ok"}
        </span>
      </Td>
      <Td mono color="rgba(var(--fg),0.4)">
        {r.runId ? r.runId.slice(0, 8) : "–"}
      </Td>
    </tr>
  );
}

// ── formato ────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null): string {
  return n == null ? "–" : n.toLocaleString("es-ES");
}

function fmtLatency(ms: number | null): string {
  if (ms == null) return "–";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} s`;
}
