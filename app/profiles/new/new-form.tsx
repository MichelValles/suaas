"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { InfoTooltip } from "@/components/info-tooltip";
import { BIG_FIVE_TRAITS } from "@/lib/big-five";
import { COM_B_BARRIERS, COM_B_INTRO } from "@/lib/com-b";
import { createProfileAction, type CreateProfileState } from "./actions";

const initial: CreateProfileState = { ok: false };

export function NewProfileForm() {
  const [state, formAction] = useActionState(createProfileAction, initial);
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
      <Field label="Nombre" name="name" required defaultValue="Lucía 34" />

      <FieldGroup title="Demografía">
        <Row>
          <Field label="Edad" name="age" type="number" step={1} min={18} max={99} required defaultValue="34" />
          <SelectField
            label="Género"
            name="gender"
            required
            defaultValue="mujer"
            options={[
              { value: "hombre", label: "Hombre" },
              { value: "mujer", label: "Mujer" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <Field label="Ocupación" name="occupation" required defaultValue="diseñadora freelance" />
        </Row>
        <Row>
          <Field label="Banda de ingresos" name="income_band" defaultValue="25-35k" />
          <Field label="Geo" name="geo" defaultValue="Barcelona, ES" />
        </Row>
      </FieldGroup>

      <FieldGroup title="Big Five (0..1)">
        <Row>
          <Field label="Apertura" name="openness" type="number" step={0.05} min={0} max={1} required defaultValue="0.7" tooltip={BIG_FIVE_TRAITS.openness.description} />
          <Field label="Conciencia" name="conscientiousness" type="number" step={0.05} min={0} max={1} required defaultValue="0.55" tooltip={BIG_FIVE_TRAITS.conscientiousness.description} />
          <Field label="Extraversión" name="extraversion" type="number" step={0.05} min={0} max={1} required defaultValue="0.4" tooltip={BIG_FIVE_TRAITS.extraversion.description} />
          <Field label="Amabilidad" name="agreeableness" type="number" step={0.05} min={0} max={1} required defaultValue="0.65" tooltip={BIG_FIVE_TRAITS.agreeableness.description} />
          <Field label="Neuroticismo" name="neuroticism" type="number" step={0.05} min={0} max={1} required defaultValue="0.5" tooltip={BIG_FIVE_TRAITS.neuroticism.description} />
        </Row>
      </FieldGroup>

      <FieldGroup title="Barreras COM-B" hint={COM_B_INTRO}>
        <TextArea
          label="Capacidad"
          name="capability"
          rows={3}
          placeholder="Planning fallacy&#10;Baja alfabetización digital"
          tooltip={COM_B_BARRIERS.capability.description}
        />
        <TextArea
          label="Oportunidad"
          name="opportunity"
          rows={3}
          placeholder="Falta de apoyo social&#10;Solo dispone del móvil"
          tooltip={COM_B_BARRIERS.opportunity.description}
        />
        <TextArea
          label="Motivación"
          name="motivation"
          rows={3}
          placeholder="Escepticismo ante el marketing&#10;Miedo a fallar a su familia"
          tooltip={COM_B_BARRIERS.motivation.description}
        />
      </FieldGroup>

      <FieldGroup title="Backstory" hint="Narrativa que conecta metas y miedos. Mínimo 20 caracteres.">
        <TextArea
          name="backstory"
          rows={6}
          required
          minLength={20}
          defaultValue="Trabaja como diseñadora freelance desde casa. Su última factura llegó tarde y arrastra estrés económico. Teme fallar a su familia y por eso no tolera procesos opacos: si una herramienta no le ahorra tiempo en los primeros 30 segundos, la abandona."
        />
      </FieldGroup>

      <input type="hidden" name="source" value="manual" />

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
    <button type="submit" className="btn-pill solid" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Creando…" : "Crear perfil"}
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
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
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
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {props.label}
        </span>
        {props.tooltip && (
          <InfoTooltip text={props.tooltip} label={`Sobre ${props.label}`} />
        )}
      </span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        defaultValue={props.defaultValue}
        step={props.step}
        min={props.min}
        max={props.max}
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
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {props.label && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {props.label}
          </span>
          {props.tooltip && (
            <InfoTooltip text={props.tooltip} label={`Sobre ${props.label}`} />
          )}
        </span>
      )}
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          {props.label}
        </span>
        {props.tooltip && (
          <InfoTooltip text={props.tooltip} label={`Sobre ${props.label}`} />
        )}
      </span>
      <select
        name={props.name}
        required={props.required}
        defaultValue={props.defaultValue}
        style={inputStyle}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
