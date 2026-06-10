"use client";

import { useState } from "react";

const PENDING = [
  {
    label: "Instancias como entidad",
    note: "SUAAS tiene perfiles individuales, pero no el par «perfil comportamental → N instancias»: mismo comportamiento observable, orígenes y aha moments radicalmente distintos.",
  },
  {
    label: "Gravedad agregada",
    note: "No existe una métrica que sume el momentum de las interacciones de una cohorte como fuerza gravitacional de la marca, ni una vista que cruce el momentum entre módulos.",
  },
  {
    label: "Mapa de fricción priorizado por impacto",
    note: "Los embudos ya rankean fricciones por frecuencia entre perfiles (top_friction), pero falta la dimensión instancia y la regla de severidad: lo que falla en todas las instancias se toca primero.",
  },
  {
    label: "Aha moment por instancia",
    note: "El momento de propiedad psicológica no se modela ni detecta. Es específico por instancia, detectable y acelerable.",
  },
  {
    label: "Capas de activación (Value Plane)",
    note: "No hay simulación post-alta: adopción, pertenencia, inducción de hábitos recurrentes ni predicción de churn.",
  },
  {
    label: "Repesca accionable",
    note: "behavior_class='repesca' se cuenta pero no genera la ventana de recuperación: qué mensaje recuperaría a ese perfil en función de su instancia.",
  },
  {
    label: "Evolución temporal del momentum",
    note: "El vector se mide por interacción, pero no se traza su trayectoria a lo largo del tiempo ni entre touchpoints.",
  },
];

export function ConceptosPendientes() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === "michel101") {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        Conceptos pendientes
      </h2>

      {!unlocked ? (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "24px 24px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 360,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Esta sección contiene el roadmap estratégico interno. Introduce la contraseña para continuar.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Contraseña"
              autoComplete="off"
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                background: "rgba(255,255,255,0.04)",
                border: error
                  ? "1px solid #f87171"
                  : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-sm)",
                color: "#fff",
                outline: "none",
                transition: "border-color 0.15s",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                background: "var(--accent-500)",
                color: "#000",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Acceder
            </button>
          </div>
          {error && (
            <span
              className="mono"
              style={{ fontSize: 11, color: "#f87171", letterSpacing: "0.08em" }}
            >
              Contraseña incorrecta.
            </span>
          )}
        </form>
      ) : (
        <>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Huecos identificados entre el marco teórico y la implementación actual. Insumo directo
            para el roadmap.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PENDING.map((p) => (
              <div
                key={p.label}
                style={{
                  padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255,255,255,0.015)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {p.label}
                </span>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.38)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {p.note}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
