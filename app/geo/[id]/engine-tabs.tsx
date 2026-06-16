"use client";

import { useState } from "react";
import type { EngineResult } from "@/lib/geo";

/**
 * Pestañas de motor del detalle GEO (v2, sondas reales). Claude, ChatGPT y
 * Perplexity muestran la respuesta real con sus citas y métricas; AI
 * Overview y Gemini quedan anunciadas como próximas.
 */

const POSITION_LABEL: Record<string, string> = {
  primary: "Protagonista",
  secondary: "Secundaria",
  absent: "Ausente",
};
const POSITION_COLOR: Record<string, string> = {
  primary: "var(--success-text)",
  secondary: "var(--warning-text)",
  absent: "var(--error-text)",
};
const TONE_LABEL: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  absent: "Ausente",
};
const POSITION_TOOLTIP: Record<string, string> = {
  primary: "La marca aparece como primera o única recomendación de este motor para esta query.",
  secondary: "La marca aparece junto a otros resultados o competidores, no como protagonista.",
  absent: "La marca no aparece en la respuesta de este motor para esta query.",
};
const TONE_TOOLTIP: Record<string, string> = {
  positive: "El motor menciona la marca con tono favorable o recomendatorio.",
  neutral: "El motor menciona la marca de forma informativa, sin valorar ni recomendar.",
  negative: "El motor menciona la marca con tono desfavorable o con advertencias.",
  absent: "La marca no aparece, por lo que no hay tono que analizar.",
};

const TABS: { id: string; label: string; enabled: boolean }[] = [
  { id: "claude", label: "Claude", enabled: true },
  { id: "chatgpt", label: "ChatGPT", enabled: true },
  { id: "perplexity", label: "Perplexity", enabled: true },
  { id: "ai-overview", label: "AI Overview", enabled: false },
  { id: "gemini", label: "Gemini", enabled: false },
];

export function EngineTabs({ engines }: { engines: EngineResult[] }) {
  const first = TABS.find((t) => engines.some((e) => e.engine === t.id));
  const [active, setActive] = useState(first?.id ?? "claude");
  const current = engines.find((e) => e.engine === active);

  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        role="tablist"
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(var(--fg),0.08)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((tab) => {
          const hasData = engines.some((e) => e.engine === tab.id);
          const enabled = tab.enabled && hasData;
          const isActive = enabled && tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!enabled}
              onClick={() => enabled && setActive(tab.id)}
              title={!tab.enabled ? "Próximamente" : undefined}
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                color: isActive
                  ? "var(--text-strong)"
                  : enabled
                    ? "rgba(var(--fg),0.55)"
                    : "rgba(var(--fg),0.22)",
                borderBottom: isActive
                  ? "2px solid var(--accent-500)"
                  : "2px solid transparent",
                marginBottom: -1,
                cursor: isActive ? "default" : enabled ? "pointer" : "not-allowed",
                userSelect: "none",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {current ? (
        <EnginePanel result={current} />
      ) : (
        <div style={{ padding: 16, fontSize: 13, color: "rgba(var(--fg),0.5)" }}>
          Sin datos para este motor.
        </div>
      )}
    </div>
  );
}

function EnginePanel({ result }: { result: EngineResult }) {
  const m = result.metrics;
  const posColor = m ? POSITION_COLOR[m.brand_position] ?? "rgba(var(--fg),0.6)" : "rgba(var(--fg),0.6)";

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "rgba(var(--fg),0.015)",
        borderBottomLeftRadius: "var(--radius-sm)",
        borderBottomRightRadius: "var(--radius-sm)",
      }}
    >
      {/* Modelo usado + badges de métricas */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(var(--fg),0.4)" }}
        >
          {result.model} · respuesta real
        </span>
        {m && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge
              label={POSITION_LABEL[m.brand_position] ?? m.brand_position}
              color={posColor}
              tooltip={POSITION_TOOLTIP[m.brand_position]}
            />
            {m.recommendation_tone !== "absent" && (
              <Badge
                label={TONE_LABEL[m.recommendation_tone] ?? m.recommendation_tone}
                color="rgba(var(--fg),0.5)"
                tooltip={TONE_TOOLTIP[m.recommendation_tone]}
              />
            )}
          </div>
        )}
      </div>

      {/* Error de la sonda o del análisis */}
      {result.error && (
        <div
          style={{
            padding: "12px 14px",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(248,113,113,0.06)",
            color: "var(--error-text)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {result.error}
        </div>
      )}

      {/* Respuesta real */}
      {result.response && (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(var(--fg),0.8)",
            whiteSpace: "pre-wrap",
          }}
        >
          {result.response}
        </div>
      )}

      {/* Citas */}
      {result.citations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.4)",
            }}
          >
            Fuentes citadas
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.citations.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                title={c.title ?? c.url}
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid rgba(var(--fg),0.14)",
                  color: "rgba(var(--fg),0.65)",
                  textDecoration: "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {hostname(c.url)}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Visibilidad */}
      {m && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.4)",
            }}
          >
            Visibilidad
          </span>
          <div
            style={{
              flex: 1,
              height: 4,
              background: "rgba(var(--fg),0.08)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(m.visibility_score * 100)}%`,
                height: "100%",
                background: posColor,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: posColor, minWidth: 32, textAlign: "right" }}>
            {Math.round(m.visibility_score * 100)}%
          </span>
        </div>
      )}

      {m && m.key_claims.length > 0 && (
        <Detail label="Lo que dice este motor sobre la marca">
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
            {m.key_claims.map((c, i) => (
              <li key={i} style={{ fontSize: 13, color: "rgba(var(--fg),0.75)", lineHeight: 1.5 }}>
                {c}
              </li>
            ))}
          </ul>
        </Detail>
      )}

      {m && m.missing_attributes.length > 0 && (
        <Detail label="Huecos detectados (atributos ausentes)">
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
            {m.missing_attributes.map((a, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--error-text)", lineHeight: 1.5 }}>
                {a}
              </li>
            ))}
          </ul>
        </Detail>
      )}
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Badge({
  label,
  color,
  tooltip,
}: {
  label: string;
  color: string;
  tooltip?: string;
}) {
  return (
    <span
      className="mono"
      data-tooltip={tooltip}
      style={{
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "var(--radius-pill)",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        cursor: tooltip ? "help" : undefined,
      }}
    >
      {label}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.45)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
