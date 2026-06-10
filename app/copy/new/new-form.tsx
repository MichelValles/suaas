"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCopyAction, type CreateCopyState } from "./actions";

const initial: CreateCopyState = { ok: false };

type Block = { label: string; text: string };
const empty = (): Block => ({ label: "", text: "" });

export function NewCopyForm() {
  const [state, formAction] = useActionState(createCopyAction, initial);
  const [blocks, setBlocks] = useState<Block[]>([
    { label: "Variante 1", text: "" },
    { label: "Variante 2", text: "" },
  ]);

  function update(i: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function add() {
    setBlocks((prev) => (prev.length >= 10 ? prev : [...prev, { ...empty(), label: `Variante ${prev.length + 1}` }]));
  }
  function remove(i: number) {
    setBlocks((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 24,
        maxWidth: 960,
        width: "100%",
        marginInline: "auto",
      }}
    >
      <Field label="Nombre del deck" name="name" placeholder="CTA prestamos personales" required />
      <Field
        label="Contexto (opcional)"
        name="context"
        placeholder="Anuncio en Instagram · hero de landing · email transaccional"
      />
      <TextArea
        label="Descripción (opcional)"
        name="description"
        rows={2}
        placeholder="Probamos 3 estilos: directo, emocional y precio. Mismo público objetivo."
      />

      <input type="hidden" name="blocks_json" value={JSON.stringify(blocks)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            Bloques · {blocks.length} / 10
          </span>
          <button
            type="button"
            onClick={add}
            disabled={blocks.length >= 10}
            className="btn-pill"
            style={{ fontSize: 11 }}
          >
            + Añadir bloque
          </button>
        </div>
        {blocks.map((b, i) => (
          <fieldset
            key={i}
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              margin: 0,
            }}
          >
            <legend
              className="mono"
              style={{
                padding: "0 8px",
                marginLeft: 8,
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--accent-text)",
              }}
            >
              Bloque {i + 1}
            </legend>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-pill"
                onClick={() => remove(i)}
                disabled={blocks.length <= 2}
                style={{ fontSize: 11 }}
              >
                Eliminar
              </button>
            </div>
            <Controlled
              label="Label interno"
              value={b.label}
              onChange={(v) => update(i, { label: v })}
              placeholder="v1 directo"
              required
            />
            <ControlledTextArea
              label="Copy"
              value={b.text}
              onChange={(v) => update(i, { text: v })}
              rows={3}
              placeholder="Préstamo personal en 2 minutos, sin papeleo y sin sorpresas."
              required
              minLength={3}
            />
          </fieldset>
        ))}
      </div>

      {state.error && (
        <div
          role="alert"
          style={{
            padding: 16,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 14,
          }}
        >
          {state.error}
        </div>
      )}
      <Submit />
    </form>
  );
}

function Field(props: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <input name={props.name} placeholder={props.placeholder} required={props.required} style={inputStyle} />
    </label>
  );
}
function TextArea(props: { label: string; name: string; rows?: number; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <textarea
        name={props.name}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}
function Controlled(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        required={props.required}
        style={inputStyle}
      />
    </label>
  );
}
function ControlledTextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(var(--fg),0.55)",
      }}
    >
      {children}
    </span>
  );
}
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-pill solid" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Creando…" : "Crear deck"}
    </button>
  );
}
const inputStyle: React.CSSProperties = {
  background: "rgba(var(--fg),0.03)",
  border: "1px solid rgba(var(--fg),0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  color: "var(--text-strong)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-sans)",
};
