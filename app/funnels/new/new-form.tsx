"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { RemoveIconButton } from "@/components/remove-icon-button";
import { createFunnelAction, type CreateFunnelState } from "./actions";

const initial: CreateFunnelState = { ok: false };

type Mode = "url" | "upload";

type Step = {
  name: string;
  intent: string;
  mode: Mode;
  source_url: string;
  image_url_data: string;
  preview: string;
};

const emptyStep = (): Step => ({
  name: "",
  intent: "",
  mode: "url",
  source_url: "",
  image_url_data: "",
  preview: "",
});

export function NewFunnelForm() {
  const [state, formAction] = useActionState(createFunnelAction, initial);
  const [steps, setSteps] = useState<Step[]>([
    { ...emptyStep(), name: "Paso 1" },
    { ...emptyStep(), name: "Paso 2" },
  ]);

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) =>
      prev.length >= 12
        ? prev
        : [...prev, { ...emptyStep(), name: `Paso ${prev.length + 1}` }],
    );
  }

  function removeStep(idx: number) {
    setSteps((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function moveStep(idx: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function onFile(idx: number, file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      updateStep(idx, { image_url_data: "", preview: "" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      updateStep(idx, { image_url_data: result, preview: result });
    };
    reader.readAsDataURL(file);
  }

  const stepsForSubmit = steps.map((s) => ({
    name: s.name,
    intent: s.intent,
    mode: s.mode,
    source_url: s.source_url,
    image_url_data: s.image_url_data,
  }));

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
      <Field
        label="Nombre del embudo"
        name="name"
        required
        placeholder="Onboarding de préstamo personal"
      />

      <TextArea
        label="Descripción (opcional)"
        name="description"
        rows={2}
        placeholder="Recorrido desde la landing hasta la firma del contrato."
      />

      <input type="hidden" name="steps_json" value={JSON.stringify(stepsForSubmit)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            Pasos del embudo · {steps.length} / 12
          </span>
          <button
            type="button"
            onClick={addStep}
            disabled={steps.length >= 12}
            className="btn-pill"
            style={{ fontSize: 11 }}
          >
            + Añadir paso
          </button>
        </div>

        {steps.map((step, idx) => (
          <StepCard
            key={idx}
            index={idx}
            total={steps.length}
            step={step}
            onChange={(patch) => updateStep(idx, patch)}
            onRemove={() => removeStep(idx)}
            onMoveUp={() => moveStep(idx, -1)}
            onMoveDown={() => moveStep(idx, 1)}
            onFile={(file) => onFile(idx, file)}
          />
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

function StepCard({
  index,
  total,
  step,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onFile,
}: {
  index: number;
  total: number;
  step: Step;
  onChange: (patch: Partial<Step>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFile: (file: File | null) => void;
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
        Paso {index + 1}
      </legend>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          className="btn-pill"
          onClick={onMoveUp}
          disabled={index === 0}
          style={{ fontSize: 11 }}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn-pill"
          onClick={onMoveDown}
          disabled={index === total - 1}
          style={{ fontSize: 11 }}
        >
          ↓
        </button>
        {total > 2 && (
          <RemoveIconButton
            onClick={onRemove}
            label={`Eliminar paso ${index + 1}`}
          />
        )}
      </div>

      <ControlledField
        label="Nombre del paso"
        value={step.name}
        onChange={(v) => onChange({ name: v })}
        placeholder="Hero · landing"
        required
      />

      <ControlledTextArea
        label="Intent (qué debería hacer el usuario aquí)"
        value={step.intent}
        onChange={(v) => onChange({ intent: v })}
        placeholder="Hacer click en «Solicitar» o entender la propuesta."
        rows={2}
        required
        minLength={3}
      />

      <ModeSelector
        mode={step.mode}
        onChange={(m) => onChange({ mode: m })}
      />

      {step.mode === "url" && (
        <ControlledField
          label="URL fuente"
          type="url"
          value={step.source_url}
          onChange={(v) => onChange({ source_url: v })}
          placeholder="https://landing.example.com/paso-1"
        />
      )}

      {step.mode === "upload" && (
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
            Screenshot
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
            style={{ ...inputStyle, padding: 10, cursor: "pointer" }}
          />
        </label>
      )}

      {step.mode === "upload" && step.preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={step.preview}
          alt={`preview paso ${index + 1}`}
          style={{
            maxWidth: 320,
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(var(--fg),0.08)",
          }}
        />
      )}
    </fieldset>
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
      {pending ? "Creando…" : "Crear embudo"}
    </button>
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
      <FieldLabel>{props.label}</FieldLabel>
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
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel>{props.label}</FieldLabel>
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        placeholder={props.placeholder}
        required={props.required}
        defaultValue={props.defaultValue}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function ControlledField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel>{props.label}</FieldLabel>
      <input
        type={props.type ?? "text"}
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
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
      <FieldLabel>{props.label}</FieldLabel>
      <textarea
        rows={props.rows ?? 3}
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
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
