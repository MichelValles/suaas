"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ChatModels, ChatProviderGroup } from "@/lib/chat-models";
import {
  type ChatModelsFormState,
  type RunsModelFormState,
  saveChatModelsAction,
  saveRunsModelAction,
} from "./actions";

/**
 * Selector del modelo del chat 1:1 (Talker + Reasoner), por empresa y modelo.
 * El endpoint /api/chat lee la elección de app_settings en cada turno; las
 * tandas por lotes usan el modelo por defecto del despliegue.
 */
export function ChatModelSettings({
  catalog,
  current,
  migrationPending,
}: {
  catalog: ChatProviderGroup[];
  current: ChatModels;
  migrationPending: boolean;
}) {
  const [state, formAction] = useActionState(saveChatModelsAction, {
    ok: false,
  } as ChatModelsFormState);

  return (
    <form
      action={formAction}
      style={{
        border: "1px solid rgba(var(--fg),0.12)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.025)",
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
          color: "rgba(var(--fg),0.72)",
        }}
      >
        El chat 1:1 de cada perfil corre con arquitectura Talker-Reasoner: el
        Reasoner planifica cada turno y el Talker responde en voz del perfil.
        Elige empresa y modelo para cada rol. Las tandas por lotes (Claridad 5s,
        Copy, Pricing, Embudos, Campañas, Momentum) siguen usando el modelo por
        defecto del despliegue.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <RoleSelect
          name="model_talker"
          label="Chat · Talker"
          hint="Responde en voz del perfil, en streaming."
          catalog={catalog}
          value={current.talker}
        />
        <RoleSelect
          name="model_reasoner"
          label="Razonador · Reasoner"
          hint="Planifica cada turno (barreras, tono, plan)."
          catalog={catalog}
          value={current.reasoner}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <SaveButton disabled={migrationPending} />
        {migrationPending && (
          <span style={{ fontSize: 12, color: "var(--warning-text)", lineHeight: 1.4 }}>
            Falta aplicar la migración 0023_app_settings.sql en Supabase para
            poder guardar; mientras tanto el chat usa los modelos por defecto.
          </span>
        )}
        {state.error && (
          <span role="alert" style={{ fontSize: 12, color: "var(--error-text)", lineHeight: 1.4 }}>
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span style={{ fontSize: 12, color: "var(--success-text)" }}>
            Guardado. Los próximos turnos de chat usarán estos modelos.
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * Selector del modelo de las tandas por lotes (un único modelo para todas
 * las runs: 5s, copy, pricing, embudos, campañas, momentum, semilla...).
 */
export function RunsModelSettings({
  catalog,
  current,
  migrationPending,
}: {
  catalog: ChatProviderGroup[];
  current: string;
  migrationPending: boolean;
}) {
  const [state, formAction] = useActionState(saveRunsModelAction, {
    ok: false,
  } as RunsModelFormState);

  return (
    <form
      action={formAction}
      style={{
        border: "1px solid rgba(var(--fg),0.12)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.025)",
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
          color: "rgba(var(--fg),0.72)",
        }}
      >
        Las tandas por lotes (Claridad 5s, Copy, Pricing, Embudos, Campañas,
        Momentum, semilla de perfiles y la síntesis del análisis GEO) corren
        con este modelo. Elige empresa y modelo: ligero para pruebas baratas,
        frontera cuando el análisis vaya en serio.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <RoleSelect
          name="model_runs"
          label="Modelo de las runs"
          hint="Se aplica a todos los tests por lotes."
          catalog={catalog}
          value={current}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <SaveButton disabled={migrationPending} />
        {migrationPending && (
          <span style={{ fontSize: 12, color: "var(--warning-text)", lineHeight: 1.4 }}>
            Falta aplicar la migración 0023_app_settings.sql en Supabase para
            poder guardar; mientras tanto las runs usan el modelo por defecto.
          </span>
        )}
        {state.error && (
          <span role="alert" style={{ fontSize: 12, color: "var(--error-text)", lineHeight: 1.4 }}>
            {state.error}
          </span>
        )}
        {state.ok && !state.error && (
          <span style={{ fontSize: 12, color: "var(--success-text)" }}>
            Guardado. Las próximas runs usarán este modelo.
          </span>
        )}
      </div>
    </form>
  );
}

function RoleSelect({
  name,
  label,
  hint,
  catalog,
  value,
}: {
  name: string;
  label: string;
  hint: string;
  catalog: ChatProviderGroup[];
  value: string;
}) {
  const [current, setCurrent] = useState(value);
  const selected = catalog
    .flatMap((g) => g.models)
    .find((m) => m.id === current);
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
        {label}
      </span>
      <select
        name={name}
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
        {catalog.map((group) => (
          <optgroup key={group.provider} label={group.provider}>
            {group.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span style={{ fontSize: 11, color: "rgba(var(--fg),0.5)", lineHeight: 1.4 }}>
        {selected ? `${selected.priceHint} · ` : ""}
        {hint}
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
