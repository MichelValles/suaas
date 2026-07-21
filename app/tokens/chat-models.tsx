"use client";

import { Fragment, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ChatModels, ChatProviderGroup } from "@/lib/chat-models";
import { priceForModel } from "@/lib/model-pricing";
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

/**
 * Tabla de tarifas por modelo, en paralelo al selector de las runs: precio de
 * entrada/salida por millón de tokens, con la fila del modelo vigente
 * resaltada. Ayuda a decidir sin salir de /tokens.
 */
export function RunsModelCostTable({
  catalog,
  current,
}: {
  catalog: ChatProviderGroup[];
  current: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.12)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.025)",
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(var(--fg),0.72)" }}>
        Tarifa por millón de tokens (entrada / salida). El gateway cobra el
        precio del proveedor sin markup; el coste real de una run depende de los
        tokens de cada llamada.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <CostTh align="left">Modelo</CostTh>
              <CostTh align="right">Entrada</CostTh>
              <CostTh align="right">Salida</CostTh>
            </tr>
          </thead>
          <tbody>
            {catalog.map((group) => (
              <Fragment key={group.provider}>
                <tr>
                  <td
                    colSpan={3}
                    className="mono"
                    style={{
                      padding: "12px 8px 4px",
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--accent-text)",
                    }}
                  >
                    {group.provider}
                  </td>
                </tr>
                {group.models.map((m) => {
                  const p = priceForModel(m.id);
                  const selected = m.id === current;
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderTop: "1px solid rgba(var(--fg),0.06)",
                        background: selected ? "rgba(249,203,13,0.08)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px", color: "var(--text-strong)" }}>
                        {m.label.split(" · ")[0]}
                        {selected && (
                          <span
                            className="mono"
                            style={{
                              marginLeft: 8,
                              fontSize: 9,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: "var(--accent-text)",
                            }}
                          >
                            · actual
                          </span>
                        )}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: "8px", textAlign: "right", color: "rgba(var(--fg),0.85)" }}
                      >
                        {p ? `${p.inputPerMtok.toLocaleString("es-ES")} $` : "·"}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: "8px", textAlign: "right", color: "rgba(var(--fg),0.85)" }}
                      >
                        {p ? `${p.outputPerMtok.toLocaleString("es-ES")} $` : "·"}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostTh({
  align,
  children,
}: {
  align: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <th
      className="mono"
      style={{
        padding: "0 8px 8px",
        textAlign: align,
        fontSize: 9,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontWeight: 400,
        color: "rgba(var(--fg),0.5)",
      }}
    >
      {children}
    </th>
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
          background: "var(--surface-panel)",
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
          <optgroup
            key={group.provider}
            label={group.provider}
            style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}
          >
            {group.models.map((m) => (
              <option
                key={m.id}
                value={m.id}
                style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}
              >
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
