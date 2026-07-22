"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "@/lib/model-pricing";
import type { UsageRow } from "@/lib/usage";

type ApiResponse = { rows: UsageRow[]; total: number; pageSize: number };

/**
 * Inspector por llamada de gateway_usage, embebido en /tokens. Client component
 * que consulta /api/usage/rows con filtros y paginación (sin recargar la página
 * pesada de /tokens). Las opciones de filtro llegan como props del server.
 */
export function UsageInspector({
  modelOptions,
  scopeOptions,
}: {
  modelOptions: string[];
  scopeOptions: string[];
}) {
  const [model, setModel] = useState("");
  const [scope, setScope] = useState("");
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (model) p.set("model", model);
    if (scope) p.set("scope", scope);
    if (failed) p.set("failed", "1");
    p.set("page", String(page));
    try {
      const res = await fetch(`/api/usage/rows?${p.toString()}`);
      setData((await res.json()) as ApiResponse);
    } catch {
      setData({ rows: [], total: 0, pageSize: 50 });
    } finally {
      setLoading(false);
    }
  }, [model, scope, failed, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pageSize = data?.pageSize ?? 50;
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const onFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Sel
          label="Modelo"
          value={model}
          onChange={(v) => onFilter(() => setModel(v))}
          options={modelOptions}
        />
        <Sel
          label="Scope"
          value={scope}
          onChange={(v) => onFilter(() => setScope(v))}
          options={scopeOptions}
        />
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "rgba(var(--fg),0.75)",
            padding: "9px 0",
          }}
        >
          <input
            type="checkbox"
            checked={failed}
            onChange={(e) => onFilter(() => setFailed(e.currentTarget.checked))}
          />
          Solo fallidas
        </label>
        <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.4)", paddingBottom: 10 }}>
          {loading ? "cargando…" : `${total.toLocaleString("es-ES")} llamadas`}
        </span>
      </div>

      {/* Tabla */}
      {!loading && total === 0 ? (
        <div
          style={{
            padding: "28px 24px",
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.5)",
            fontSize: 14,
          }}
        >
          {model || scope || failed
            ? "Ninguna llamada coincide con el filtro."
            : "Aún no hay llamadas registradas."}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
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
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((r) => (
                  <tr key={r.id}>
                    <Td mono color="rgba(var(--fg),0.6)">{fmtDate(r.createdAt)}</Td>
                    <Td mono>{r.scope}</Td>
                    <Td mono color="rgba(var(--fg),0.7)">{r.model}</Td>
                    <Td right mono>{fmtNum(r.promptTokens)}</Td>
                    <Td right mono>{fmtNum(r.completionTokens)}</Td>
                    <Td right mono color="var(--text-strong)">{fmtNum(r.totalTokens)}</Td>
                    <Td right mono>{r.usd > 0 ? formatUsd(r.usd) : "–"}</Td>
                    <Td right mono color="rgba(var(--fg),0.6)">{fmtLatency(r.latencyMs)}</Td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.5)" }}>
              página {page}/{pageCount}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <PageBtn disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </PageBtn>
              <PageBtn disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>
                Siguiente →
              </PageBtn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-pill"
      onClick={onClick}
      disabled={disabled}
      style={{ fontSize: 13, opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--fg),0.5)" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
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
          <option key={o} value={o} style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
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
