"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProfileExplorer } from "@/components/profile-explorer";
import type { Profile } from "@/lib/profiles";

/**
 * Panel reutilizable de selección de perfiles + botón "Lanzar".
 * Usa ProfileExplorer (grid/tabla + filtros + selección + hover backstory)
 * en modo picker para que la selección sea consistente con /profiles.
 */
export function ProfileLaunchPanel({
  title,
  endpoint,
  extraBody,
  redirectTo,
  profiles,
  progressLabel = "Lanzando run…",
}: {
  title: string;
  endpoint: string;
  extraBody: Record<string, unknown>;
  redirectTo: (json: { runId?: string; abTestId?: string; runs?: { runId: string }[] }) => string;
  profiles: Profile[];
  progressLabel?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  function launch() {
    setError(null);
    if (selected.length === 0) {
      setError("Selecciona al menos un perfil.");
      return;
    }
    if (selected.length > 20) {
      setError("Máximo 20 perfiles por run.");
      return;
    }
    setProgress(progressLabel);
    startSubmit(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...extraBody, profileIds: selected }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setProgress(null);
        router.push(redirectTo(json));
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
        {title}
      </h2>

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
        <ProfileExplorer
          profiles={profiles}
          mode="picker"
          initialView="table"
          onSelectionChange={setSelected}
        />
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
          : `Lanzar sobre ${selected.length || "—"} perfil${selected.length === 1 ? "" : "es"}`}
      </button>
    </section>
  );
}
