"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type GeoFormState, createGeoAnalysisAction } from "./actions";

const SEGMENT_PLACEHOLDER = JSON.stringify(
  [
    {
      label: "Autónomo buscando hipoteca",
      jtbd: "Cuando necesito financiar mi local quiero comparar productos hipotecarios para poder elegir sin depender de un asesor que no me entiende.",
      query: "hipoteca para autónomos sin nómina fija cuál es mejor 2025",
    },
    {
      label: "Joven con poco historial crediticio",
      jtbd: "Cuando quiero comprar mi primer piso quiero saber si puedo pedir hipoteca para poder planificar con tiempo.",
      query: "hipoteca primer piso sin ahorros opciones 2025",
    },
  ],
  null,
  2,
);

export function NewGeoForm() {
  const [state, formAction] = useActionState(createGeoAnalysisAction, {
    ok: false,
  } as GeoFormState);

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
      <FieldGroup title="Identificación">
        <Field
          label="Nombre del análisis"
          name="name"
          required
          placeholder="GEO · Hipotecas · Q3 2025"
        />
        <Field
          label="Nombre de la marca"
          name="brand_name"
          required
          placeholder="BBVA"
        />
        <TextArea
          label="Descripción de la marca"
          name="brand_description"
          rows={4}
          required
          minLength={20}
          placeholder="BBVA es un banco global con fuerte presencia en España. Ofrece hipotecas, préstamos personales, cuentas y productos de inversión para particulares y empresas."
        />
      </FieldGroup>

      <FieldGroup
        title="Segmentos de intención (JSON)"
        hint='Array de objetos con "label", "jtbd" y "query". Máximo 10 segmentos.'
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            name="segments_json"
            rows={18}
            required
            defaultValue={SEGMENT_PLACEHOLDER}
            spellCheck={false}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "#fff",
              fontSize: 12,
              outline: "none",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.5,
              colorScheme: "dark",
              resize: "vertical",
            }}
          />
        </label>
      </FieldGroup>

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
            lineHeight: 1.5,
          }}
        >
          {state.error}
        </div>
      )}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-pill solid"
      disabled={pending}
      style={{ alignSelf: "flex-start" }}
    >
      {pending ? "Creando..." : "Crear análisis"}
    </button>
  );
}

function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
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
          color: "var(--accent-500)",
        }}
      >
        {title}
      </legend>
      {hint && (
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {hint}
        </p>
      )}
      {children}
    </fieldset>
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
  colorScheme: "dark",
};

function Field(props: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel label={props.label} />
      <input
        name={props.name}
        type="text"
        required={props.required}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        style={inputStyle}
      />
    </label>
  );
}

function TextArea(props: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel label={props.label} />
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        required={props.required}
        placeholder={props.placeholder}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function FieldLabel({ label }: { label: string }) {
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
      {label}
    </span>
  );
}
