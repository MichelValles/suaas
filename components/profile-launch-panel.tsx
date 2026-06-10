"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ProfileExplorer } from "@/components/profile-explorer";
import type { Profile } from "@/lib/profiles";

/**
 * Panel reutilizable de selección de perfiles + botón "Lanzar".
 *
 * Por defecto está colapsado: sólo enseña un CTA «Lanzar nueva Run». Al
 * pulsarlo se despliega el selector con el botón de lanzar arriba del
 * listado (no abajo) y un enlace de cancelar.
 *
 * Pensado para vivir en las páginas de detalle de cada entidad (no en las
 * páginas de resultados, donde sólo se ven los participantes del run).
 */

export type LaunchKind =
  | "five-second"
  | "funnel"
  | "ab"
  | "copy"
  | "pricing"
  | "campaign";

type RunJson = { runId?: string; abTestId?: string; runs?: { runId: string }[] };

function resolveRedirect(
  kind: LaunchKind,
  json: RunJson,
  fallback?: string,
): string {
  switch (kind) {
    case "five-second":
      return `/experiments/five-second/${json.runId}`;
    case "funnel":
      return `/experiments/funnel/${json.runId}`;
    case "ab":
      return json.abTestId
        ? `/experiments/ab/${json.abTestId}`
        : (fallback ?? "/ab");
    case "copy":
      return `/experiments/copy/${json.runId}`;
    case "pricing":
      return `/experiments/pricing/${json.runId}`;
    case "campaign":
      return `/experiments/campaign/${json.runId}`;
  }
}

export function ProfileLaunchPanel({
  title,
  endpoint,
  extraBody,
  kind,
  redirectFallback,
  profiles,
  progressLabel = "Lanzando run…",
  initialSelected,
  combosPerProfile,
  estimateEndpoint,
}: {
  title: string;
  endpoint: string;
  extraBody: Record<string, unknown>;
  /** Tipo de experimento. Determina la URL de resultados tras el run. */
  kind: LaunchKind;
  /** Ruta a la que volver si el JSON de respuesta no incluye el id esperado. */
  redirectFallback?: string;
  profiles: Profile[];
  progressLabel?: string;
  /** Perfiles preseleccionados («Repetir con esta muestra»). El panel arranca expandido. */
  initialSelected?: string[];
  /**
   * Combinaciones que genera cada perfil (canales × queries). Si se pasa,
   * el cap de 200 combinaciones se valida en cliente antes del submit.
   */
  combosPerProfile?: number;
  /** GET que estima coste; recibe &profiles=N. Se consulta al cambiar la selección. */
  estimateEndpoint?: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(
    Boolean(initialSelected && initialSelected.length > 0),
  );
  const [selected, setSelected] = useState<string[]>(initialSelected ?? []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{
    est_tokens: number | null;
    est_seconds: number | null;
    budget: { limit: number; spent_24h: number } | null;
  } | null>(null);

  // Estimación de coste previa: se consulta (con debounce) al cambiar la
  // selección, si la página de detalle pasó un endpoint de estimación.
  useEffect(() => {
    if (!estimateEndpoint || selected.length === 0) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const sep = estimateEndpoint.includes("?") ? "&" : "?";
        const res = await fetch(`${estimateEndpoint}${sep}profiles=${selected.length}`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setEstimate({
            est_tokens: json.est_tokens ?? null,
            est_seconds: json.est_seconds ?? null,
            budget: json.budget ?? null,
          });
        }
      } catch {
        // la estimación es informativa: un fallo no bloquea nada
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [estimateEndpoint, selected.length]);

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
    if (combosPerProfile && selected.length * combosPerProfile > 200) {
      setError(
        `${selected.length} perfiles × ${combosPerProfile} combinaciones por perfil = ${selected.length * combosPerProfile}. Máximo 200 por run: reduce la selección.`,
      );
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
        router.push(resolveRedirect(kind, json, redirectFallback));
      } catch (e) {
        setError((e as Error).message);
        setProgress(null);
      }
    });
  }

  function collapse() {
    setExpanded(false);
    setSelected([]);
    setError(null);
    setProgress(null);
  }

  // ------------------ vista colapsada ------------------
  if (!expanded) {
    return (
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          border: "1px solid rgba(var(--fg),0.08)",
          borderRadius: "var(--radius-md)",
          padding: "32px 32px 30px",
          background: "rgba(var(--fg),0.02)",
        }}
      >
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
          {title}
        </h2>
        <p
          style={{
            color: "rgba(var(--fg),0.65)",
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 640,
          }}
        >
          {profiles.length === 0
            ? "No hay perfiles todavía. Crea al menos uno desde /profiles/new."
            : `Selecciona perfiles del panel (${profiles.length} disponibles) y lanza un nuevo run.`}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn-pill solid"
          disabled={profiles.length === 0}
          style={{ alignSelf: "flex-start", marginTop: 4 }}
        >
          Lanzar nueva Run
        </button>
      </section>
    );
  }

  // ------------------ vista expandida ------------------
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "32px 32px 30px",
        background: "rgba(var(--fg),0.02)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
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
            color: "var(--accent-text)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={collapse}
          disabled={submitting}
          className="mono"
          style={{
            background: "transparent",
            border: 0,
            color: "rgba(var(--fg),0.55)",
            cursor: submitting ? "wait" : "pointer",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: 0,
          }}
        >
          Cancelar
        </button>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={launch}
          className="btn-pill solid"
          disabled={submitting || profiles.length === 0}
        >
          {submitting
            ? "Ejecutando…"
            : `Lanzar sobre ${selected.length || 0} perfil${
                selected.length === 1 ? "" : "es"
              }`}
        </button>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            color: "rgba(var(--fg),0.5)",
          }}
        >
          {selected.length === 0
            ? "Marca al menos 1 perfil. Máx 20 por run."
            : `${selected.length}/${Math.min(profiles.length, 20)} seleccionados.`}
          {estimate?.est_tokens != null && selected.length > 0 && (
            <>
              {" "}· estimado ~{Math.round(estimate.est_tokens / 1000).toLocaleString("es-ES")}k tokens
              {estimate.est_seconds != null && ` · ~${estimate.est_seconds}s`}
              {estimate.budget &&
                ` · presupuesto 24h: ${Math.round((estimate.budget.spent_24h / estimate.budget.limit) * 100)}% usado`}
            </>
          )}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(var(--fg),0.9)",
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
            border: "1px solid rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(var(--fg),0.75)",
            fontSize: 13,
          }}
        >
          {progress}
        </div>
      )}

      {profiles.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
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
          initialSelected={initialSelected}
          onSelectionChange={setSelected}
        />
      )}
    </section>
  );
}
