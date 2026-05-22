"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAbAction, type CreateAbState } from "./actions";

const initial: CreateAbState = { ok: false };

export function NewAbForm({
  targets,
}: {
  targets: { id: string; name: string; main_promise: string }[];
}) {
  const [state, formAction] = useActionState(createAbAction, initial);

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
      <Field label="Nombre del A/B test" name="name" placeholder="CTA verde vs CTA amarillo" required />
      <TextArea
        label="Hipótesis (opcional)"
        name="hypothesis"
        rows={2}
        placeholder="La variante B genera más recall porque el CTA contrasta más."
      />
      <Select
        label="Variante A"
        name="target_a_id"
        options={targets.map((t) => ({ value: t.id, label: `${t.name} — ${t.main_promise}` }))}
        required
      />
      <Select
        label="Variante B"
        name="target_b_id"
        options={targets.map((t) => ({ value: t.id, label: `${t.name} — ${t.main_promise}` }))}
        required
      />
      {state.error && <ErrorBox>{state.error}</ErrorBox>}
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
}) {
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
function Select(props: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{props.label}</Label>
      <select name={props.name} required={props.required} style={inputStyle} defaultValue="">
        <option value="" disabled>
          Elegir target…
        </option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
      {pending ? "Creando…" : "Crear A/B test"}
    </button>
  );
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
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
