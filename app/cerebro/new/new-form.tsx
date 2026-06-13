"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBrandAction, type CreateBrandState } from "./actions";

const initial: CreateBrandState = { ok: false };

const inputStyle: React.CSSProperties = {
  background: "rgba(var(--fg),0.03)",
  border: "1px solid rgba(var(--fg),0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  color: "var(--text-strong)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-sans)",
  width: "100%",
  boxSizing: "border-box",
};

export function NewBrandForm() {
  const [state, formAction] = useActionState(createBrandAction, initial);
  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 24,
        maxWidth: 760,
        width: "100%",
        marginInline: "auto",
      }}
    >
      <Field label="Nombre de la marca" name="name" required placeholder="BBVA" />
      <TextArea
        label="Descripción (identidad reutilizable)"
        name="description"
        rows={5}
        placeholder="BBVA es un banco global con fuerte presencia en España. Ofrece hipotecas, préstamos personales, cuentas y productos de inversión para particulares y empresas."
        hint="Es el texto que el selector volcará en los campos de marca de los módulos. Podrás añadir documentos .md con más detalle desde el detalle de la marca."
      />
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

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      <input
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  rows,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      {hint && (
        <p style={{ fontSize: 12, color: "rgba(var(--fg),0.4)", margin: 0, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
      <textarea
        name={name}
        rows={rows ?? 4}
        placeholder={placeholder}
        style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical" }}
      />
    </div>
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
      {pending ? "Creando..." : "Crear marca"}
    </button>
  );
}
