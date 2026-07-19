"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { BrandPicker } from "@/components/brand-picker";
import { InfoTooltip } from "@/components/info-tooltip";
import { RemoveIconButton } from "@/components/remove-icon-button";
import { type GeoFormState, createGeoAnalysisAction } from "./actions";

type SegmentDraft = {
  id: number;
  label: string;
  jtbd: string;
  query: string;
};

let _nextId = 1;
function newSegment(): SegmentDraft {
  return { id: _nextId++, label: "", jtbd: "", query: "" };
}

export function NewGeoForm() {
  const [state, formAction] = useActionState(createGeoAnalysisAction, {
    ok: false,
  } as GeoFormState);

  const [segments, setSegments] = useState<SegmentDraft[]>([newSegment()]);
  const [brandName, setBrandName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  // Marca de Cerebro elegida: viaja como hidden para que el runner recupere
  // los documentos por similitud (RAG) en lugar del volcado íntegro.
  const [brandId, setBrandId] = useState("");

  const segmentsJson = JSON.stringify(
    segments.map(({ label, jtbd, query }) => ({ label, jtbd, query })),
  );

  function update(id: number, field: keyof Omit<SegmentDraft, "id">, value: string) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function addSegment() {
    if (segments.length >= 10) return;
    setSegments((prev) => [...prev, newSegment()]);
  }

  function removeSegment(id: number) {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

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
      <input type="hidden" name="segments_json" value={segmentsJson} />
      <input type="hidden" name="brand_id" value={brandId} />

      <FieldGroup title="Identificación">
        <CField
          label="Nombre del análisis"
          name="name"
          required
          placeholder="GEO · Hipotecas · Q3 2025"
          tooltip="Nombre interno para identificar este análisis en la lista."
        />
        <BrandPicker
          onPick={(b) => {
            setBrandId(b.id);
            setBrandName(b.name);
            // La descripción corta basta: los documentos llegarán por RAG.
            setBrandDescription(b.description || b.context);
          }}
          onClear={() => {
            setBrandId("");
            setBrandName("");
            setBrandDescription("");
          }}
          hint="Rellena nombre y descripción desde Cerebro. Solo alimenta el análisis del juez, nunca la consulta desnuda que se manda al buscador."
        />
        <CField
          label="Nombre de la marca"
          name="brand_name"
          required
          placeholder="BBVA"
          value={brandName}
          onChange={setBrandName}
          tooltip="El nombre exacto de la marca tal como aparece en internet y en los buscadores."
        />
        <CTextArea
          label="Descripción de la marca"
          name="brand_description"
          rows={4}
          required
          minLength={20}
          value={brandDescription}
          onChange={setBrandDescription}
          placeholder="BBVA es un banco global con fuerte presencia en España. Ofrece hipotecas, préstamos personales, cuentas y productos de inversión para particulares y empresas."
          tooltip="Describe la marca en 2-4 frases: qué hace, a quién se dirige y cuál es su propuesta de valor principal. El modelo usará esto para analizar si el buscador la menciona correctamente."
        />
      </FieldGroup>

      <FieldGroup
        title="Segmentos de intención"
        hint={
          <>
            <p style={{ margin: "0 0 10px" }}>
              Un <strong style={{ color: "rgba(var(--fg),0.85)" }}>segmento de intención</strong> es un grupo de usuarios que tienen el mismo trabajo a hacer (JTBD): el problema concreto que quieren resolver en un momento específico. A diferencia de la segmentación demográfica, el JTBD describe <em>por qué</em> alguien busca algo hoy.
            </p>
            <p style={{ margin: 0 }}>
              El GEO Tester lanza la búsqueda de cada segmento contra motores IA <strong style={{ color: "rgba(var(--fg),0.85)" }}>reales</strong> (Claude, ChatGPT y Perplexity, con búsqueda web y citas de fuentes) y analiza si tu marca aparece, con qué posición y con qué tono en cada uno. Puedes añadir hasta 10 segmentos.
            </p>
          </>
        }
      >
        {segments.map((seg, i) => (
          <SegmentBlock
            key={seg.id}
            index={i}
            segment={seg}
            onRemove={segments.length > 1 ? () => removeSegment(seg.id) : undefined}
            onChange={(field, value) => update(seg.id, field, value)}
          />
        ))}

        {segments.length < 10 && (
          <button
            type="button"
            onClick={addSegment}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "1px dashed rgba(var(--fg),0.2)",
              borderRadius: "var(--radius-pill)",
              color: "rgba(var(--fg),0.6)",
              padding: "8px 18px",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              cursor: "pointer",
              transition: "border-color var(--dur-micro), color var(--dur-micro)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-500)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-400)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(var(--fg),0.2)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(var(--fg),0.6)";
            }}
          >
            + Añadir segmento
          </button>
        )}
        {segments.length === 10 && (
          <p
            className="mono"
            style={{ fontSize: 11, color: "rgba(var(--fg),0.4)", margin: 0, letterSpacing: "0.1em" }}
          >
            Límite de 10 segmentos alcanzado.
          </p>
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

function SegmentBlock({
  index,
  segment,
  onRemove,
  onChange,
}: {
  index: number;
  segment: SegmentDraft;
  onRemove?: () => void;
  onChange: (field: keyof Omit<SegmentDraft, "id">, value: string) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-sm)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "rgba(var(--fg),0.015)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Segmento {index + 1}
        </span>
        {onRemove && (
          <RemoveIconButton
            onClick={onRemove}
            label={`Eliminar segmento ${index + 1}`}
          />
        )}
      </div>

      <SegmentField
        label="Etiqueta"
        value={segment.label}
        onChange={(v) => onChange("label", v)}
        placeholder="Autónomo buscando hipoteca"
        tooltip="Nombre corto para identificar este segmento en los resultados. Describe de forma breve quién es el usuario y qué busca."
      />

      <SegmentTextArea
        label="Trabajo a hacer (JTBD)"
        value={segment.jtbd}
        onChange={(v) => onChange("jtbd", v)}
        placeholder="Cuando necesito financiar mi local quiero comparar productos hipotecarios para poder elegir sin depender de un asesor que no me entiende."
        tooltip="Completa la frase: «Cuando [situación] quiero [motivación] para poder [resultado]». Describe el problema real que intenta resolver este usuario en este momento, no su perfil demográfico."
        rows={3}
      />

      <SegmentField
        label="Query al buscador IA"
        value={segment.query}
        onChange={(v) => onChange("query", v)}
        placeholder="hipoteca para autónomos sin nómina fija cuál es mejor 2025"
        tooltip="La búsqueda exacta que este usuario escribiría en Claude, ChatGPT o Perplexity. Se lanza tal cual contra los 3 motores. Escríbela como la escribiría una persona real: en lenguaje natural, sin operadores de búsqueda."
      />
    </div>
  );
}

// ============================================================
// Primitivos de campo controlado (sin name, se serializa via hidden)
// ============================================================

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

function SegmentField({
  label,
  value,
  onChange,
  placeholder,
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tooltip?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FLabel label={label} tooltip={tooltip} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function SegmentTextArea({
  label,
  value,
  onChange,
  placeholder,
  tooltip,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tooltip?: string;
  rows?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FLabel label={label} tooltip={tooltip} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 4}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5, resize: "vertical" }}
      />
    </div>
  );
}

// ============================================================
// Campos con name (para brand fields que sí se envían directamente)
// ============================================================

function CField(props: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  tooltip?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = props.onChange !== undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FLabel label={props.label} tooltip={props.tooltip} />
      <input
        name={props.name}
        type="text"
        required={props.required}
        placeholder={props.placeholder}
        style={inputStyle}
        {...(controlled
          ? { value: props.value ?? "", onChange: (e) => props.onChange!(e.target.value) }
          : {})}
      />
    </div>
  );
}

function CTextArea(props: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
  tooltip?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = props.onChange !== undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FLabel label={props.label} tooltip={props.tooltip} />
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        required={props.required}
        placeholder={props.placeholder}
        minLength={props.minLength}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5, resize: "vertical" }}
        {...(controlled
          ? { value: props.value ?? "", onChange: (e) => props.onChange!(e.target.value) }
          : {})}
      />
    </div>
  );
}

function FLabel({ label, tooltip }: { label: string; tooltip?: string }) {
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

function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
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
        <div style={{ color: "rgba(var(--fg),0.5)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {hint}
        </div>
      )}
      {children}
    </fieldset>
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
