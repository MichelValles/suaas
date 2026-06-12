"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { GeoEngineModels, GeoEngineSpec } from "@/lib/geo-engines";
import { type GeoModelsFormState, saveGeoEngineModelsAction } from "./actions";

/**
 * Selector del modelo por motor del GEO Tester. Modelos ligeros para
 * pruebas baratas, frontera para análisis reales; el runner lee la
 * elección de app_settings en cada lanzamiento.
 */
export function GeoModelSettings({
  catalog,
  current,
  migrationPending,
}: {
  catalog: GeoEngineSpec[];
  current: GeoEngineModels;
  migrationPending: boolean;
}) {
  const [state, formAction] = useActionState(saveGeoEngineModelsAction, {
    ok: false,
  } as GeoModelsFormState);

  return (
    <form
      action={formAction}
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(var(--fg),0.6)",
        }}
      >
        El GEO Tester lanza cada query contra estos tres motores reales.
        Elige modelos ligeros para pruebas baratas y modelos frontera cuando
        el análisis vaya en serio. A los tokens se suma la cuota de búsqueda
        de cada sonda (10 $/1.000 búsquedas en Claude y ChatGPT, 5-14 $/1.000
        en Perplexity).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {catalog.map((spec) => (
          <EngineSelect key={spec.id} spec={spec} value={current[spec.id]} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <SaveButton disabled={migrationPending} />
        {migrationPending && (
          <span style={{ fontSize: 12, color: "var(--warning-text)", lineHeight: 1.4 }}>
            Falta aplicar la migración 0023_app_settings.sql en Supabase para
            poder guardar; mientras tanto el GEO Tester usa los modelos por
            defecto.
          </span>
        )}
        {state.error && (
          <span role="alert" style={{ fontSize: 12, color: "var(--error-text)", lineHeight: 1.4 }}>
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span style={{ fontSize: 12, color: "var(--success-text)" }}>
            Guardado. Los próximos análisis GEO usarán estos modelos.
          </span>
        )}
      </div>
    </form>
  );
}

function EngineSelect({ spec, value }: { spec: GeoEngineSpec; value: string }) {
  const [current, setCurrent] = useState(value);
  const selected = spec.models.find((m) => m.id === current);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {spec.label} · {spec.provider}
      </span>
      <select
        name={`model_${spec.id}`}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        style={{
          background: "rgba(var(--fg),0.03)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 12px",
          color: "var(--text-strong)",
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          outline: "none",
          width: "100%",
        }}
      >
        {spec.models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <span style={{ fontSize: 11, color: "rgba(var(--fg),0.45)", lineHeight: 1.4 }}>
        {selected ? `${selected.priceHint} · ` : ""}búsqueda: {spec.searchFeeHint}
      </span>
    </label>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-pill solid"
      disabled={disabled || pending}
      style={{ alignSelf: "flex-start" }}
    >
      {pending ? "Guardando..." : "Guardar modelos"}
    </button>
  );
}
