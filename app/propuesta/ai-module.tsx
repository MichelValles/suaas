"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { AI_PROVIDERS, runCostEur, runsForBudget } from "@/lib/landing-pricing";

function eur(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}

const MIN_BUDGET = 10;
const MAX_BUDGET = 200;

const cellStyle: CSSProperties = {
  textAlign: "right",
  fontSize: 14,
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  color: "rgba(var(--fg),0.7)",
  padding: "9px 8px",
  borderBottom: "1px solid rgba(var(--fg),0.05)",
};

/**
 * Módulo de coste de IA interactivo: un slider (con input de texto asociado)
 * fija el presupuesto mensual y la tabla recalcula cuántos runs entran con
 * cada modelo de cada proveedor.
 */
export function AiCostModule({ defaultBudget = 30 }: { defaultBudget?: number }) {
  const [budget, setBudget] = useState(defaultBudget);
  const clamp = (n: number) => Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Math.round(n)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Control de presupuesto */}
      <div
        style={{
          border: "1px solid rgba(var(--fg),0.1)",
          borderRadius: "var(--radius-md)",
          padding: "20px 22px",
          background: "rgba(var(--fg),0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--fg),0.55)" }}
          >
            Presupuesto de IA al mes
          </span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={MIN_BUDGET}
              max={MAX_BUDGET}
              value={budget}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setBudget(clamp(v));
              }}
              aria-label="Presupuesto de IA en dólares al mes"
              style={{
                width: 92,
                textAlign: "right",
                background: "rgba(var(--fg),0.05)",
                border: "1px solid rgba(var(--fg),0.14)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                color: "var(--text-strong)",
                fontSize: 16,
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
            />
            <span className="mono" style={{ fontSize: 14, color: "rgba(var(--fg),0.55)" }}>$/mes</span>
          </div>
        </div>
        <input
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={5}
          value={budget}
          onChange={(e) => setBudget(clamp(Number(e.target.value)))}
          aria-label="Presupuesto de IA (slider)"
          style={{ width: "100%", accentColor: "var(--accent-500)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "rgba(var(--fg),0.35)" }}>{MIN_BUDGET} $</span>
          <span style={{ fontSize: 11, color: "rgba(var(--fg),0.35)" }}>{MAX_BUDGET} $</span>
        </div>
      </div>

      {/* Tablas por proveedor */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {AI_PROVIDERS.map((p) => (
          <div key={p.provider} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-strong)" }}>
                {p.provider}
              </span>
              <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)" }}>{p.note}</span>
            </div>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {["Modelo", "Coste/run", `Runs con ${budget} $`].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          textAlign: i === 0 ? "left" : "right",
                          width: i === 0 ? "44%" : "28%",
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(var(--fg),0.4)",
                          fontWeight: 500,
                          padding: "6px 8px",
                          borderBottom: "1px solid rgba(var(--fg),0.1)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.models.map((m) => (
                    <tr key={m.id}>
                      <td style={{ ...cellStyle, textAlign: "left", color: "var(--text-strong)" }}>
                        {m.label}
                        {m.current && (
                          <span className="mono" style={{ fontSize: 9, marginLeft: 8, color: "var(--accent-text)", letterSpacing: "0.1em" }}>
                            ACTUAL
                          </span>
                        )}
                      </td>
                      <td style={cellStyle}>{eur(runCostEur(m), 3)}</td>
                      <td style={{ ...cellStyle, color: "var(--accent-text)", fontSize: 16 }}>
                        ~{runsForBudget(m, budget).toLocaleString("es-ES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            {p.provider === "Perplexity" && (
              <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>
                Perplexity cobra un fee por request además de los tokens (incluido en el coste/run).
                Sus modelos Sonar traen búsqueda web en vivo: encajan en el módulo GEO.
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
