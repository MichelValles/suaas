"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Profile } from "@/lib/profiles";
import { createMomentumChallengeAction } from "./actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "var(--radius-sm)",
  color: "#fff",
  fontSize: 14,
  lineHeight: 1.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-sans)",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}
    >
      {children}
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <FieldLabel>{label}</FieldLabel>
      {hint && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: 0, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-pill solid"
      disabled={pending || disabled}
      style={{ alignSelf: "flex-start", opacity: disabled ? 0.45 : 1 }}
    >
      {pending ? "Guardando..." : "Crear reto"}
    </button>
  );
}

export function NewChallengeForm({ profiles }: { profiles: Profile[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(profiles.map((p) => p.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  return (
    <form
      action={createMomentumChallengeAction}
      style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 720 }}
    >
      <Field label="Nombre del reto" hint="Corto y descriptivo.">
        <input
          name="name"
          type="text"
          required
          placeholder="Ej: Búsqueda de hipoteca para millennials"
          style={inputStyle}
        />
      </Field>

      <Field
        label="Escenario de activación"
        hint="Describe el momento o situación que hace que este reto se vuelva relevante para el usuario. Cuanto más concreto, mejor simula el perfil."
      >
        <textarea
          name="trigger_scenario"
          required
          rows={5}
          placeholder="Ej: Una pareja de 32 años recibe una carta del banco informando que el alquiler de su piso sube un 18%. Empiezan a plantearse si tiene sentido comprar."
          style={{ ...inputStyle, resize: "vertical", minHeight: 120 }}
        />
      </Field>

      <Field
        label="Contexto de marca (opcional)"
        hint="Si quieres orientar el análisis a una marca concreta, descríbela aquí. Sin contexto de marca el análisis es agnóstico."
      >
        <textarea
          name="brand_context"
          rows={3}
          placeholder="Ej: IVI es la mayor red de clínicas de reproducción asistida en España. El equipo quiere saber en qué momento entraría su marca en el radar de estas pacientes."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      {/* Hidden field con la selección de perfiles */}
      <input
        type="hidden"
        name="profile_ids"
        value={JSON.stringify([...selectedIds])}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <FieldLabel>Perfiles a analizar</FieldLabel>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={selectAll} className="btn-pill" style={{ fontSize: 11, padding: "3px 10px" }}>
              Todos
            </button>
            <button type="button" onClick={clearAll} className="btn-pill" style={{ fontSize: 11, padding: "3px 10px" }}>
              Ninguno
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
          {selectedIds.size} de {profiles.length} seleccionados
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
          {profiles.map((p) => {
            const selected = selectedIds.has(p.id);
            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  border: selected
                    ? "1px solid var(--accent-500)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  background: selected ? "rgba(255,255,255,0.04)" : "transparent",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(p.id)}
                  style={{ marginTop: 3, accentColor: "var(--accent-500)", flexShrink: 0 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, color: "#fff", fontFamily: "var(--font-display)" }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                    {p.demographics.age} años · {p.demographics.gender} · {p.demographics.occupation}
                    {p.demographics.geo ? ` · ${p.demographics.geo}` : ""}
                  </span>
                  {p.intent_context && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.4, marginTop: 2 }}>
                      {p.intent_context.length > 90
                        ? p.intent_context.slice(0, 90) + "..."
                        : p.intent_context}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <SubmitButton disabled={selectedIds.size === 0} />
    </form>
  );
}
