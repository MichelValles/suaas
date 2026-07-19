"use client";

import { useState } from "react";

type PendingItem = { label: string; note: string };

/**
 * El contenido y la contraseña viven en el servidor (/api/gravity/unlock):
 * este componente solo pide el desbloqueo y pinta lo que reciba. Así ni el
 * roadmap interno ni el secreto viajan en el bundle del cliente.
 */
export function ConceptosPendientes() {
  const [pending, setPending] = useState<PendingItem[] | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const unlocked = pending !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/gravity/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input }),
      });
      if (res.ok) {
        const data = (await res.json()) as { pending?: PendingItem[] };
        setPending(data.pending ?? []);
        setError(false);
      } else {
        setError(true);
        setInput("");
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
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
          color: "var(--accent-text)",
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
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "rgba(var(--fg),0.45)",
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
                background: "rgba(var(--fg),0.04)",
                border: error
                  ? "1px solid var(--error-500)"
                  : "1px solid rgba(var(--fg),0.12)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-strong)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                background: "var(--accent-500)",
                color: "var(--ink-900)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: busy ? "wait" : "pointer",
                fontWeight: 600,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Comprobando…" : "Acceder"}
            </button>
          </div>
          {error && (
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--error-text)", letterSpacing: "0.08em" }}
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
              color: "rgba(var(--fg),0.5)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Huecos identificados entre el marco teórico y la implementación actual. Insumo directo
            para el roadmap.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(pending ?? []).map((p) => (
              <div
                key={p.label}
                style={{
                  padding: "14px 18px",
                  border: "1px solid rgba(var(--fg),0.07)",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(var(--fg),0.015)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "rgba(var(--fg),0.5)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {p.label}
                </span>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(var(--fg),0.38)",
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
