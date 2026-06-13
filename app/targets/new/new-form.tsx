"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { BrandPicker } from "@/components/brand-picker";
import { createTargetAction, type CreateTargetState } from "./actions";

const initial: CreateTargetState = { ok: false };

type Mode = "url" | "upload";

export function NewTargetForm() {
  const [state, formAction] = useActionState(createTargetAction, initial);
  const [mode, setMode] = useState<Mode>("url");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [mainPromise, setMainPromise] = useState(
    "Préstamo personal sin papeleo, respuesta en 2 minutos.",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | null) {
    if (!file) {
      setDataUrl("");
      setPreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setDataUrl("");
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      setDataUrl(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
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
      <Field
        label="Nombre del test"
        name="name"
        required
        defaultValue="Landing préstamo personal"
      />

      <BrandPicker
        onPick={(b) => setMainPromise(b.description || b.context)}
        hint="Rellena la promesa con la descripción de una marca de Cerebro y recórtala a la promesa concreta de esta pantalla. Solo la usa el juez para puntuar el recuerdo, nunca el perfil (que ve la pantalla a ciegas)."
      />
      <TextArea
        label="Promesa principal"
        name="main_promise"
        rows={3}
        required
        minLength={3}
        placeholder="Préstamo personal sin papeleo, respuesta en 2 minutos."
        value={mainPromise}
        onChange={setMainPromise}
      />

      <FieldGroup
        title="Captura de la pantalla"
        hint="Pega la URL de la landing y resolvemos su og:image, o sube un screenshot manual."
      >
        <ModeSelector mode={mode} onChange={setMode} />
        <input type="hidden" name="mode" value={mode} />

        {mode === "url" && (
          <Field
            label="URL fuente"
            name="source_url"
            type="url"
            placeholder="https://landing.example.com/prestamos"
          />
        )}

        {mode === "upload" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.55)",
              }}
            >
              Screenshot (JPG/PNG, <span style={{ textTransform: "none", letterSpacing: 0 }}>&lt;2 MB recomendado</span>)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
              style={{
                ...inputStyle,
                padding: 10,
                cursor: "pointer",
              }}
            />
            <input type="hidden" name="image_url_data" value={dataUrl} />
          </label>
        )}

        {preview && mode === "upload" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            style={{
              maxWidth: 320,
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(var(--fg),0.08)",
            }}
          />
        )}
      </FieldGroup>

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

function ModeSelector({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: "flex",
        gap: 8,
        padding: 4,
        border: "1px solid rgba(var(--fg),0.12)",
        borderRadius: "var(--radius-pill)",
        width: "fit-content",
      }}
    >
      {(["url", "upload"] as const).map((m) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className="mono"
            style={{
              padding: "8px 16px",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: selected ? "var(--accent-500)" : "transparent",
              color: selected ? "var(--ink-900)" : "rgba(var(--fg),0.7)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {m === "url" ? "URL pública" : "Subir imagen"}
          </button>
        );
      })}
    </div>
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
      {pending ? "Creando…" : "Crear test"}
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
        border: "1px solid rgba(var(--fg),0.08)",
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
          color: "var(--accent-text)",
        }}
      >
        {title}
      </legend>
      {hint && (
        <p
          style={{
            color: "rgba(var(--fg),0.55)",
            fontSize: 13,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
      {children}
    </fieldset>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {props.label}
      </span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function TextArea(props: {
  label?: string;
  name: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = props.onChange !== undefined;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {props.label && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.55)",
          }}
        >
          {props.label}
        </span>
      )}
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5, resize: "vertical" }}
        {...(controlled
          ? { value: props.value ?? "", onChange: (e) => props.onChange!(e.currentTarget.value) }
          : { defaultValue: props.defaultValue })}
      />
    </label>
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
