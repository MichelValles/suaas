"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProfileLite = { id: string; name: string; demo: string };

export function LaunchPanel({
  targetId,
  profiles,
}: {
  targetId: string;
  profiles: ProfileLite[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === profiles.length ? new Set() : new Set(profiles.map((p) => p.id)),
    );
  }

  function launch() {
    setError(null);
    if (selected.size === 0) {
      setError("Selecciona al menos un perfil.");
      return;
    }
    if (selected.size > 20) {
      setError("Máximo 20 perfiles por run.");
      return;
    }
    const ids = [...selected];
    setProgress("Lanzando run, esto puede tardar 30-60 s para 5 perfiles…");
    startSubmit(async () => {
      try {
        const res = await fetch("/api/runs/five-second", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ targetId, profileIds: ids }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setProgress(null);
        router.push(`/experiments/five-second/${json.runId}`);
      } catch (e) {
        setError((e as Error).message);
        setProgress(null);
      }
    });
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
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
          Lanzar test 5s
        </h2>
        <button
          type="button"
          onClick={toggleAll}
          className="mono"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-pill)",
            color: "rgba(255,255,255,0.7)",
            padding: "6px 14px",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {selected.size === profiles.length ? "Deseleccionar todos" : "Seleccionar todos"}
        </button>
      </div>

      {profiles.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          No hay perfiles todavía. Crea al menos uno desde /profiles/new.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 8,
          }}
        >
          {profiles.map((p) => {
            const checked = selected.has(p.id);
            return (
              <li key={p.id}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 12,
                    border: `1px solid ${checked ? "var(--accent-500)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "var(--radius-sm)",
                    background: checked ? "rgba(255,230,0,0.06)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 14,
                        color: "#fff",
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {p.demo}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {progress && (
        <div
          style={{
            padding: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
          }}
        >
          {progress}
        </div>
      )}

      <button
        type="button"
        onClick={launch}
        className="btn-pill solid"
        disabled={submitting || profiles.length === 0}
        style={{ alignSelf: "flex-start" }}
      >
        {submitting
          ? "Ejecutando…"
          : `Lanzar sobre ${selected.size || "—"} perfil${selected.size === 1 ? "" : "es"}`}
      </button>
    </section>
  );
}
