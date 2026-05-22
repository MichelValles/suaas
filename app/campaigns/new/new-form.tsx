"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createCampaignAction,
  type CreateCampaignState,
} from "./actions";

const initial: CreateCampaignState = { ok: false };

type LandingMode = "og" | "upload";
type CreativeMode = "url" | "upload";
type Creative = {
  mode: CreativeMode;
  url: string;
  upload_data: string;
  label: string;
};
const emptyCreative = (): Creative => ({
  mode: "url",
  url: "",
  upload_data: "",
  label: "",
});

const HEADLINE_MAX = 30;
const DESCRIPTION_MAX = 90;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function NewCampaignForm() {
  const [state, formAction] = useActionState(createCampaignAction, initial);

  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [finalUrl, setFinalUrl] = useState("");
  const [landingMode, setLandingMode] = useState<LandingMode>("og");
  const [landingUpload, setLandingUpload] = useState<string>("");
  const [landingPreviewName, setLandingPreviewName] = useState<string>("");
  const [queries, setQueries] = useState<string[]>([""]);
  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  function updateAt<T>(arr: T[], i: number, value: T): T[] {
    return arr.map((v, idx) => (idx === i ? value : v));
  }

  // ============ queries ============
  function addQuery() {
    if (queries.length >= 5) return;
    setQueries([...queries, ""]);
  }
  function removeQuery(i: number) {
    if (queries.length <= 1) return;
    setQueries(queries.filter((_, idx) => idx !== i));
  }

  // ============ headlines ============
  function addHeadline() {
    if (headlines.length >= 15) return;
    setHeadlines([...headlines, ""]);
  }
  function removeHeadline(i: number) {
    if (headlines.length <= 3) return;
    setHeadlines(headlines.filter((_, idx) => idx !== i));
  }

  // ============ descriptions ============
  function addDescription() {
    if (descriptions.length >= 4) return;
    setDescriptions([...descriptions, ""]);
  }
  function removeDescription(i: number) {
    if (descriptions.length <= 2) return;
    setDescriptions(descriptions.filter((_, idx) => idx !== i));
  }

  // ============ creatives ============
  function addCreative() {
    if (creatives.length >= 6) return;
    setCreatives([...creatives, emptyCreative()]);
  }
  function removeCreative(i: number) {
    setCreatives(creatives.filter((_, idx) => idx !== i));
  }
  function patchCreative(i: number, patch: Partial<Creative>) {
    setCreatives((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function onLandingFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setLandingUpload(dataUrl);
    setLandingPreviewName(file.name);
  }
  async function onCreativeFile(
    i: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    patchCreative(i, { upload_data: dataUrl, label: creatives[i]?.label ?? file.name });
  }

  const payload = {
    name,
    brief: brief.trim() || null,
    final_url: finalUrl,
    landing_mode: landingMode,
    landing_upload_data: landingUpload,
    queries,
    headlines,
    descriptions,
    creatives,
  };

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
      <input type="hidden" name="payload_json" value={JSON.stringify(payload)} />

      <Section title="Identidad">
        <Controlled label="Nombre" value={name} onChange={setName} required placeholder="Hipoteca fija agosto 2026" />
        <ControlledTextArea
          label="Brief interno (opcional, no se muestra al perfil)"
          rows={2}
          value={brief}
          onChange={setBrief}
          placeholder="Promesa diferencial vs ING. Limitaciones legales: no decir TAE."
        />
      </Section>

      <Section title="Landing">
        <Controlled
          label="URL final del anuncio"
          value={finalUrl}
          onChange={setFinalUrl}
          required
          placeholder="https://miweb.com/landing-hipoteca"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ToggleButton
            active={landingMode === "og"}
            onClick={() => setLandingMode("og")}
            label="Resolver og:image"
          />
          <ToggleButton
            active={landingMode === "upload"}
            onClick={() => setLandingMode("upload")}
            label="Subir screenshot"
          />
        </div>
        {landingMode === "upload" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Screenshot de la landing</Label>
            <input
              type="file"
              accept="image/*"
              onChange={onLandingFile}
              style={inputStyle}
            />
            {landingPreviewName && (
              <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                {landingPreviewName} cargado.
              </span>
            )}
          </label>
        )}
      </Section>

      <Section title={`Queries · ${queries.length} / 5`} onAdd={addQuery} addLabel="+ Añadir query" canAdd={queries.length < 5}>
        {queries.map((q, i) => (
          <RowWithRemove key={i} canRemove={queries.length > 1} onRemove={() => removeQuery(i)}>
            <Controlled
              label={`Query ${i + 1}`}
              value={q}
              onChange={(v) => setQueries(updateAt(queries, i, v))}
              required
              placeholder="hipoteca fija madrid"
            />
          </RowWithRemove>
        ))}
      </Section>

      <Section
        title={`Titulares · ${headlines.length} / 15`}
        onAdd={addHeadline}
        addLabel="+ Añadir titular"
        canAdd={headlines.length < 15}
      >
        {headlines.map((h, i) => (
          <RowWithRemove
            key={i}
            canRemove={headlines.length > 3}
            onRemove={() => removeHeadline(i)}
          >
            <CharCountedInput
              label={`Titular ${i + 1}`}
              value={h}
              onChange={(v) => setHeadlines(updateAt(headlines, i, v))}
              max={HEADLINE_MAX}
              required
              placeholder="Hipoteca fija al 2,90% TAE"
            />
          </RowWithRemove>
        ))}
      </Section>

      <Section
        title={`Descripciones · ${descriptions.length} / 4`}
        onAdd={addDescription}
        addLabel="+ Añadir descripción"
        canAdd={descriptions.length < 4}
      >
        {descriptions.map((d, i) => (
          <RowWithRemove
            key={i}
            canRemove={descriptions.length > 2}
            onRemove={() => removeDescription(i)}
          >
            <CharCountedTextarea
              label={`Descripción ${i + 1}`}
              value={d}
              onChange={(v) => setDescriptions(updateAt(descriptions, i, v))}
              max={DESCRIPTION_MAX}
              required
              placeholder="Sin comisiones de apertura. Decisión en 48h. Trato personal en tu sucursal."
            />
          </RowWithRemove>
        ))}
      </Section>

      <Section
        title={`Creatividades · ${creatives.length} / 6 (opcional)`}
        onAdd={addCreative}
        addLabel="+ Añadir creatividad"
        canAdd={creatives.length < 6}
      >
        {creatives.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, margin: 0 }}>
            Las creatividades son opcionales. Súbelas si el anuncio incluye banners
            o si testeas Display / Performance Max.
          </p>
        )}
        {creatives.map((c, i) => (
          <fieldset key={i} style={fieldsetStyle}>
            <legend className="mono" style={legendStyle}>
              Creatividad {i + 1}
            </legend>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => removeCreative(i)}
                className="btn-pill"
                style={{ fontSize: 11 }}
              >
                Eliminar
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ToggleButton
                active={c.mode === "url"}
                onClick={() => patchCreative(i, { mode: "url" })}
                label="URL"
              />
              <ToggleButton
                active={c.mode === "upload"}
                onClick={() => patchCreative(i, { mode: "upload" })}
                label="Subir imagen"
              />
            </div>
            {c.mode === "url" ? (
              <Controlled
                label="URL de la creatividad"
                value={c.url}
                onChange={(v) => patchCreative(i, { url: v })}
                placeholder="https://cdn.miweb.com/banner-300x250.png"
              />
            ) : (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Imagen</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onCreativeFile(i, e)}
                  style={inputStyle}
                />
                {c.upload_data && (
                  <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                    Imagen cargada.
                  </span>
                )}
              </label>
            )}
            <Controlled
              label="Etiqueta interna (opcional)"
              value={c.label}
              onChange={(v) => patchCreative(i, { label: v })}
              placeholder="Banner 300x250 v1"
            />
          </fieldset>
        ))}
      </Section>

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

// ============================================================
// Subcomponentes locales
// ============================================================

function Section({
  title,
  children,
  onAdd,
  addLabel,
  canAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  canAdd?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          {title}
        </span>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            disabled={canAdd === false}
            className="btn-pill"
            style={{ fontSize: 11 }}
          >
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RowWithRemove({
  children,
  canRemove,
  onRemove,
}: {
  children: React.ReactNode;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
      <div>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="btn-pill"
        style={{ fontSize: 11, alignSelf: "end" }}
      >
        Eliminar
      </button>
    </div>
  );
}

function Controlled(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
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
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function CharCountedInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  placeholder?: string;
}) {
  const over = props.value.length > props.max;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: over ? "var(--error-500)" : "rgba(255,255,255,0.45)",
          }}
        >
          {props.value.length}/{props.max}
        </span>
      </div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        maxLength={props.max}
        required={props.required}
        placeholder={props.placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function CharCountedTextarea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  placeholder?: string;
}) {
  const over = props.value.length > props.max;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Label>{props.label}</Label>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: over ? "var(--error-500)" : "rgba(255,255,255,0.45)",
          }}
        >
          {props.value.length}/{props.max}
        </span>
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        rows={2}
        maxLength={props.max}
        required={props.required}
        placeholder={props.placeholder}
        style={{ ...inputStyle, fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
      />
    </label>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "btn-pill solid" : "btn-pill"}
      style={{ fontSize: 11 }}
    >
      {label}
    </button>
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
      {pending ? "Creando…" : "Crear campaña"}
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

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "var(--radius-md)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  margin: 0,
};

const legendStyle: React.CSSProperties = {
  padding: "0 8px",
  marginLeft: 8,
  fontSize: 10,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--accent-500)",
};
