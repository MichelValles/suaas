"use client";

import type { CSSProperties } from "react";
import { FlaskConical } from "lucide-react";
import { useBetaMode } from "@/components/use-beta-mode";

/**
 * Tarjeta de /diag que activa el modo beta. Al encenderlo aparecen en la
 * navegación (sidebar y home) los módulos aún en desarrollo: Embudos, A/B
 * tests, Pricing y Sembrar. Sustituye a la antigua tarjeta de estado del
 * esquema (cuyo detalle sigue en las secciones de abajo de la página).
 */
export function BetaModeToggle() {
  const [beta, setBeta] = useBetaMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={beta}
      onClick={() => setBeta(!beta)}
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "rgba(var(--fg),0.02)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          Modo beta
        </span>
        <FlaskConical size={14} style={{ color: "rgba(var(--fg),0.4)" }} />
      </span>

      <span
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
            fontSize: 18,
            color: beta ? "var(--accent-text)" : "rgba(var(--fg),0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {beta ? "activo" : "inactivo"}
        </span>
        <span aria-hidden style={track(beta)}>
          <span style={knob(beta)} />
        </span>
      </span>

      <span style={{ fontSize: 11, lineHeight: 1.5, color: "var(--text-faint)" }}>
        Muestra en el menú los módulos en desarrollo: Embudos, A/B tests,
        Pricing y Sembrar.
      </span>
    </button>
  );
}

function track(on: boolean): CSSProperties {
  return {
    position: "relative",
    width: 32,
    height: 18,
    flexShrink: 0,
    borderRadius: "var(--radius-pill)",
    border: `1px solid ${on ? "var(--accent-500)" : "rgba(var(--fg),0.25)"}`,
    background: on ? "var(--accent-500)" : "transparent",
    transition:
      "background var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out)",
  };
}

function knob(on: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: on ? "var(--ink-900)" : "rgba(var(--fg),0.6)",
    transform: on ? "translateX(14px)" : "translateX(0)",
    transition:
      "transform var(--dur-short) var(--ease-out), background var(--dur-short) var(--ease-out)",
  };
}
