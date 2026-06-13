"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { InfoTooltip } from "@/components/info-tooltip";
import { BIG_FIVE_INTRO, BIG_FIVE_TRAITS } from "@/lib/big-five";
import { COM_B_BARRIERS, COM_B_INTRO } from "@/lib/com-b";

export type ProfileFormState = { ok: boolean; error?: string };

export type ProfileFormInitial = {
  name: string;
  age: number;
  gender: string;
  occupation: string;
  income_band: string;
  geo: string;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  capability: string;
  opportunity: string;
  motivation: string;
  backstory: string;
  source: string;
  intent_context: string;
};

export const DEFAULT_PROFILE_INITIAL: ProfileFormInitial = {
  name: "Lucía 34",
  age: 34,
  gender: "mujer",
  occupation: "diseñadora freelance",
  income_band: "25-35k",
  geo: "Barcelona, ES",
  openness: 0.7,
  conscientiousness: 0.55,
  extraversion: 0.4,
  agreeableness: 0.65,
  neuroticism: 0.5,
  capability: "",
  opportunity: "",
  motivation: "",
  backstory:
    "Trabaja como diseñadora freelance desde casa. Su última factura llegó tarde y arrastra estrés económico. Teme fallar a su familia y por eso no tolera procesos opacos: si una herramienta no le ahorra tiempo en los primeros 30 segundos, la abandona.",
  source: "manual",
  intent_context: "",
};

export function ProfileForm({
  initial,
  action,
  submitLabel,
  hiddenInputs,
}: {
  initial: ProfileFormInitial;
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  submitLabel: string;
  hiddenInputs?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, { ok: false } as ProfileFormState);
  return (
    <form
      action={formAction}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 24,
        width: "100%",
        marginInline: "auto",
      }}
    >
      <Field label="Nombre" name="name" required defaultValue={initial.name} />

      <FieldGroup title="Demografía">
        <Row>
          <Field
            label="Edad"
            name="age"
            type="number"
            step={1}
            min={18}
            max={99}
            required
            defaultValue={String(initial.age)}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <SelectField
            label="Género"
            name="gender"
            required
            defaultValue={initial.gender}
            options={[
              { value: "hombre", label: "Hombre" },
              { value: "mujer", label: "Mujer" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <Field
            label="Ocupación"
            name="occupation"
            required
            defaultValue={initial.occupation}
          />
        </Row>
        <Row>
          <Field label="Banda de ingresos" name="income_band" defaultValue={initial.income_band} />
          <Field label="Geo" name="geo" defaultValue={initial.geo} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Big Five (0..1)" hint={BIG_FIVE_INTRO}>
        <Row>
          <BigFive name="openness" label="Apertura" value={initial.openness} tooltip={BIG_FIVE_TRAITS.openness.description} />
          <BigFive name="conscientiousness" label="Conciencia" value={initial.conscientiousness} tooltip={BIG_FIVE_TRAITS.conscientiousness.description} />
          <BigFive name="extraversion" label="Extraversión" value={initial.extraversion} tooltip={BIG_FIVE_TRAITS.extraversion.description} />
          <BigFive name="agreeableness" label="Amabilidad" value={initial.agreeableness} tooltip={BIG_FIVE_TRAITS.agreeableness.description} />
          <BigFive name="neuroticism" label="Neuroticismo" value={initial.neuroticism} tooltip={BIG_FIVE_TRAITS.neuroticism.description} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Barreras COM-B" hint={COM_B_INTRO}>
        <TextArea
          label="Capacidad"
          name="capability"
          rows={3}
          defaultValue={initial.capability}
          placeholder="Planning fallacy&#10;Baja alfabetización digital"
          tooltip={COM_B_BARRIERS.capability.description}
        />
        <TextArea
          label="Oportunidad"
          name="opportunity"
          rows={3}
          defaultValue={initial.opportunity}
          placeholder="Falta de apoyo social&#10;Solo dispone del móvil"
          tooltip={COM_B_BARRIERS.opportunity.description}
        />
        <TextArea
          label="Motivación"
          name="motivation"
          rows={3}
          defaultValue={initial.motivation}
          placeholder="Escepticismo ante el marketing&#10;Miedo a fallar a su familia"
          tooltip={COM_B_BARRIERS.motivation.description}
        />
      </FieldGroup>

      <FieldGroup title="Backstory" hint="Narrativa que conecta metas y miedos. Mínimo 20 caracteres. Se muestra en cursiva como cita del perfil.">
        <TextArea
          name="backstory"
          rows={6}
          required
          minLength={20}
          defaultValue={initial.backstory}
          className="backstory-input"
        />
      </FieldGroup>

      <FieldGroup
        title="Contexto de intención (JTBD)"
        hint="Opcional. Describe el trabajo que quiere hacer: «Cuando [situación] quiero [motivación] para poder [resultado]». Se inyecta en el system prompt de todas las llamadas con este perfil."
      >
        <TextArea
          name="intent_context"
          rows={4}
          defaultValue={initial.intent_context}
          placeholder={"Cuando me llega una factura inesperada quiero entender si tengo margen para aplazarla para poder evitar el corte de suministro sin pedir prestado."}
        />
      </FieldGroup>

      <input type="hidden" name="source" value={initial.source} />
      {hiddenInputs &&
        Object.entries(hiddenInputs).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

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

      <Submit label={submitLabel} />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-pill solid" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Guardando…" : label}
    </button>
  );
}

function BigFive({
  name,
  label,
  value,
  tooltip,
}: {
  name: string;
  label: string;
  value: number;
  tooltip?: string;
}) {
  return (
    <Field
      label={label}
      name={name}
      type="number"
      step={0.01}
      min={0}
      max={1}
      required
      defaultValue={String(value)}
      tooltip={tooltip}
      inputMode="decimal"
    />
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
        <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {hint}
        </p>
      )}
      {children}
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: number;
  min?: number;
  max?: number;
  tooltip?: string;
  inputMode?: "numeric" | "decimal" | "text";
  pattern?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel label={props.label} tooltip={props.tooltip} />
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        defaultValue={props.defaultValue}
        step={props.step}
        min={props.min}
        max={props.max}
        inputMode={props.inputMode}
        pattern={props.pattern}
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
  tooltip?: string;
  className?: string;
}) {
  const useDefaultStyle = !props.className;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {props.label && <FieldLabel label={props.label} tooltip={props.tooltip} />}
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        placeholder={props.placeholder}
        required={props.required}
        defaultValue={props.defaultValue}
        minLength={props.minLength}
        className={props.className}
        style={
          useDefaultStyle
            ? { ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }
            : undefined
        }
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string }[];
  tooltip?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel label={props.label} tooltip={props.tooltip} />
      <select
        name={props.name}
        required={props.required}
        defaultValue={props.defaultValue}
        style={inputStyle}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "var(--surface-app)", color: "var(--text-strong)" }}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldLabel({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
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
      {tooltip && <InfoTooltip text={tooltip} label={`Sobre ${label}`} />}
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
