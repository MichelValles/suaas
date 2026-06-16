"use client";

import { useState } from "react";

// Caja de «Contexto de marca»: muestra un extracto y permite ampliar a una
// caja con scroll. Reutilizable en cualquier vista que vuelque el contexto de
// marca con esta plantilla (Momentum y futuros módulos).
export function BrandContextBox({
  text,
  label = "Contexto de marca",
}: {
  text: string;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 280;
  const preview = long ? `${text.slice(0, 280).trimEnd()}…` : text;

  return (
    <div
      style={{
        padding: "12px 16px",
        border: "1px solid rgba(var(--fg),0.07)",
        borderRadius: "var(--radius-sm)",
        background: "rgba(var(--fg),0.025)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.35)",
          }}
        >
          {label}
        </span>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
              background: "transparent",
              border: "1px solid rgba(var(--fg),0.15)",
              borderRadius: "var(--radius-pill)",
              padding: "3px 10px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {expanded ? "Reducir" : "Ampliar"}
          </button>
        )}
      </div>
      <div
        style={
          expanded
            ? { maxHeight: 320, overflowY: "auto", paddingRight: 8 }
            : undefined
        }
      >
        <span
          style={{
            fontSize: 13,
            color: "rgba(var(--fg),0.6)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            display: "block",
          }}
        >
          {expanded ? text : preview}
        </span>
      </div>
    </div>
  );
}
