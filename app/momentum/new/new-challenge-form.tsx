"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { Profile } from "@/lib/profiles";
import { createMomentumChallengeAction, saveProfileIntentAction } from "./actions";

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
      {pending ? "Guardando..." : "Crear Trigger"}
    </button>
  );
}

type IntentFilter = "all" | "with" | "without";

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "4px 11px",
        borderRadius: "var(--radius-pill)",
        border: active ? "1px solid var(--accent-500)" : "1px solid rgba(255,255,255,0.1)",
        background: active ? "rgba(255,255,255,0.05)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.4)",
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

function ProfileRow({
  profile: p,
  selected,
  intent,
  isEditing,
  isSaving,
  draftIntent,
  onToggle,
  onStartEditing,
  onCancelEditing,
  onDraftChange,
  onSaveIntent,
}: {
  profile: Profile;
  selected: boolean;
  intent: string;
  isEditing: boolean;
  isSaving: boolean;
  draftIntent: string;
  onToggle: () => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onDraftChange: (v: string) => void;
  onSaveIntent: () => void;
}) {
  return (
    <div
      style={{
        border: selected ? "1px solid var(--accent-500)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-sm)",
        background: selected ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "border-color 0.15s, background 0.15s",
        overflow: "hidden",
      }}
    >
      {/* Fila superior: checkbox + nombre + demografía */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 16px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 3, accentColor: "var(--accent-500)", flexShrink: 0 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: "#fff", fontFamily: "var(--font-display)" }}>
            {p.name}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
            {p.demographics.age} años · {p.demographics.gender} · {p.demographics.occupation}
            {p.demographics.geo ? ` · ${p.demographics.geo}` : ""}
          </span>
        </div>
      </div>

      {/* Franja de intent */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 16px",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        {!isEditing ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: intent ? "flex-start" : "center", gap: 12 }}>
            {intent ? (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.42)",
                  lineHeight: 1.55,
                  fontStyle: "italic",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {intent.length > 110 ? intent.slice(0, 110) + "..." : intent}
              </span>
            ) : (
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.2)",
                  textTransform: "uppercase",
                }}
              >
                Sin intent
              </span>
            )}
            <button
              type="button"
              onClick={onStartEditing}
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                flexShrink: 0,
                transition: "color 0.12s, border-color 0.12s",
              }}
            >
              {intent ? "Editar" : "Añadir"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              value={draftIntent}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Cuando [situación] quiero [motivación] para poder [resultado]."
              rows={3}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-xs)",
                color: "#fff",
                fontSize: 13,
                lineHeight: 1.5,
                resize: "vertical",
                fontFamily: "var(--font-sans)",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={onCancelEditing}
                className="btn-pill"
                style={{ fontSize: 11 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSaveIntent}
                className="btn-pill solid"
                disabled={isSaving || !draftIntent.trim()}
                style={{ fontSize: 11, opacity: !draftIntent.trim() ? 0.45 : 1 }}
              >
                {isSaving ? "Guardando..." : "Guardar en perfil"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NewChallengeForm({ profiles }: { profiles: Profile[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");

  // Refleja intent_context de cada perfil; se actualiza al guardar
  const [localIntents, setLocalIntents] = useState<Record<string, string>>(
    () => Object.fromEntries(profiles.map((p) => [p.id, p.intent_context ?? ""])),
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftIntent, setDraftIntent] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const withCount = profiles.filter((p) => !!localIntents[p.id]).length;
  const withoutCount = profiles.length - withCount;

  const filteredProfiles = profiles.filter((p) => {
    if (intentFilter === "with") return !!localIntents[p.id];
    if (intentFilter === "without") return !localIntents[p.id];
    return true;
  });

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredProfiles.map((p) => p.id)));
  }

  function clearAll() {
    const shown = new Set(filteredProfiles.map((p) => p.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !shown.has(id))));
  }

  function startEditing(id: string) {
    setEditingId(id);
    setDraftIntent(localIntents[id] ?? "");
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftIntent("");
  }

  async function handleSaveIntent(profileId: string) {
    setSavingId(profileId);
    try {
      await saveProfileIntentAction(profileId, draftIntent);
      setLocalIntents((prev) => ({ ...prev, [profileId]: draftIntent.trim() }));
      setEditingId(null);
      setDraftIntent("");
    } catch {
      alert("Error al guardar el intent en el perfil.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <form
      action={createMomentumChallengeAction}
      style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 720 }}
    >
      <Field label="Nombre del Trigger" hint="Corto y descriptivo.">
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
        hint="Describe el momento o situación que activa este Trigger para el usuario. Cuanto más concreto, mejor simula el perfil."
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
          placeholder="Ej: IVI es la mayor red de clínicas de reproducción asistida en España."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      {/* Selector de perfiles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Cabecera: label + botones seleccionar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <FieldLabel>Perfiles a analizar</FieldLabel>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={selectAll}
              className="btn-pill"
              style={{ fontSize: 11, padding: "3px 10px" }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="btn-pill"
              style={{ fontSize: 11, padding: "3px 10px" }}
            >
              Ninguno
            </button>
          </div>
        </div>

        {/* Filtros de intent */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterPill active={intentFilter === "all"} onClick={() => setIntentFilter("all")}>
            Todos ({profiles.length})
          </FilterPill>
          <FilterPill active={intentFilter === "with"} onClick={() => setIntentFilter("with")}>
            Con intent ({withCount})
          </FilterPill>
          <FilterPill active={intentFilter === "without"} onClick={() => setIntentFilter("without")}>
            Sin intent ({withoutCount})
          </FilterPill>
        </div>

        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", margin: 0 }}>
          {selectedIds.size} de {profiles.length} seleccionados
        </p>

        {/* Lista de perfiles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 500, overflowY: "auto" }}>
          {filteredProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "20px 0", textAlign: "center", margin: 0 }}>
              Ningún perfil coincide con el filtro.
            </p>
          ) : (
            filteredProfiles.map((p) => (
              <ProfileRow
                key={p.id}
                profile={p}
                selected={selectedIds.has(p.id)}
                intent={localIntents[p.id] ?? ""}
                isEditing={editingId === p.id}
                isSaving={savingId === p.id}
                draftIntent={editingId === p.id ? draftIntent : ""}
                onToggle={() => toggle(p.id)}
                onStartEditing={() => startEditing(p.id)}
                onCancelEditing={cancelEditing}
                onDraftChange={setDraftIntent}
                onSaveIntent={() => handleSaveIntent(p.id)}
              />
            ))
          )}
        </div>
      </div>

      <input
        type="hidden"
        name="profile_ids"
        value={JSON.stringify([...selectedIds])}
      />

      <SubmitButton disabled={selectedIds.size === 0} />
    </form>
  );
}
