"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPricingAction, type CreatePricingState } from "./actions";

const initial: CreatePricingState = { ok: false };

type Level = { label: string; price: string };
const empty = (): Level => ({ label: "", price: "" });

export function NewPricingForm() {
  const [state, formAction] = useActionState(createPricingAction, initial);
  const [prices, setPrices] = useState<Level[]>([
    { label: "barato", price: "9.99" },
    { label: "actual", price: "19.99" },
    { label: "premium", price: "29.99" },
  ]);

  function update(i: number, patch: Partial<Level>) {
    setPrices((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function add() {
    setPrices((prev) => (prev.length >= 8 ? prev : [...prev, empty()]));
  }
  function remove(i: number) {
    setPrices((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 24,
        maxWidth: 880,
        width: "100%",
        marginInline: "auto",
      }}
    >
      <Field label="Nombre de la oferta" name="name" placeholder="Suscripción premium" required />
      <TextArea
        label="Descripción"
        name="description"
        rows={3}
        placeholder="Acceso ilimitado a todos los cursos, sin anuncios, certificados oficiales."
        required
        minLength={10}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Moneda" name="currency" placeholder="EUR" />
        <Field label="Precio actual de referencia (opcional)" name="anchor_price" placeholder="19.99" />
      </div>

      <input type="hidden" name="prices_json" value={JSON.stringify(prices)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--accent-500)",
            }}
          >
            Niveles de precio · {prices.length} / 8
          </span>
          <button
            type="button"
            onClick={add}
            disabled={prices.length >= 8}
            className="btn-pill"
            style={{ fontSize: 11 }}
          >
            + Añadir nivel
          </button>
        </div>
        {prices.map((p, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              padding: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <Controlled
              label="Label (opcional)"
              value={p.label}
              onChange={(v) => update(i, { label: v })}
              placeholder="barato | actual | premium"
            />
            <Controlled
              label="Precio"
              value={p.price}
              onChange={(v) => update(i, { price: v })}
              type="number"
              placeholder="19.99"
            />
            <button
              type="button"
              className="btn-pill"
              onClick={() => remove(i)}
              disabled={prices.length <= 2}
              style={{ fontSize: 11 }}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {state.error && (
        <div
          role="alert"
          style={{
            padding: 16,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.9)",
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
function TextArea(props: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <textarea
        name={props.name}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}
function Controlled(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        style={inputStyle}
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
        color: "rgba(255,255,255,0.55)",
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
      {pending ? "Creando…" : "Crear oferta"}
    </button>
  );
}
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-sans)",
};
