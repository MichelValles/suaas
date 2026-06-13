"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, Upload } from "lucide-react";
import {
  BRAND_DOCUMENT_KINDS,
  type Brand,
  type BrandDocument,
} from "@/lib/cerebro";
import {
  addBrandDocumentAction,
  deleteBrandDocumentAction,
  updateBrandAction,
  type DetailState,
} from "./actions";

const initial: DetailState = { ok: false };

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

export function BrandDetail({
  brand,
  documents,
}: {
  brand: Brand;
  documents: BrandDocument[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 36,
        maxWidth: 880,
        width: "100%",
      }}
    >
      <IdentitySection brand={brand} />
      <DocumentsSection brandId={brand.id} documents={documents} />
    </div>
  );
}

// ── Identidad ──────────────────────────────────────────────────

function IdentitySection({ brand }: { brand: Brand }) {
  const [state, formAction] = useActionState(updateBrandAction, initial);
  return (
    <Section
      title="Identidad"
      subtitle="Nombre y descripción reutilizables. La descripción es lo que el selector vuelca en los campos de marca de los módulos."
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <input type="hidden" name="id" value={brand.id} />
        <Labeled label="Nombre">
          <input name="name" defaultValue={brand.name} required style={inputStyle} />
        </Labeled>
        <Labeled label="Descripción">
          <textarea
            name="description"
            defaultValue={brand.description ?? ""}
            rows={5}
            placeholder="Qué es la marca, a quién se dirige y su propuesta de valor."
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </Labeled>
        {state.error && <ErrorBox>{state.error}</ErrorBox>}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <SaveButton />
          {state.ok && (
            <span
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--success-text)" }}
            >
              Guardado
            </span>
          )}
        </div>
      </form>
    </Section>
  );
}

// ── Documentos ─────────────────────────────────────────────────

function DocumentsSection({
  brandId,
  documents,
}: {
  brandId: string;
  documents: BrandDocument[];
}) {
  return (
    <Section
      title={`Documentos · ${documents.length}`}
      subtitle="Ficheros .md con información de la marca. Pueden incluir datos privados (analytics, informes, VoC) que no están en buscadores. Se concatenan a la descripción cuando seleccionas la marca en un módulo."
    >
      <AddDocumentForm brandId={brandId} />
      {documents.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "rgba(var(--fg),0.5)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Aún no hay documentos. Sube un .md o pega su contenido arriba.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {documents.map((d) => (
            <DocumentCard key={d.id} doc={d} brandId={brandId} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function AddDocumentForm({ brandId }: { brandId: string }) {
  const [state, formAction] = useActionState(addBrandDocumentAction, initial);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const lastDone = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.ok && state.doneAt && state.doneAt !== lastDone.current) {
      lastDone.current = state.doneAt;
      setTitle("");
      setContent("");
    }
  }, [state]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result ?? ""));
      setTitle((t) => t || file.name.replace(/\.(md|markdown|txt)$/i, ""));
    };
    reader.readAsText(file);
  }

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: 18,
        background: "rgba(var(--fg),0.015)",
      }}
    >
      <input type="hidden" name="brand_id" value={brandId} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (Posicionamiento, Analytics Q2, Tono de voz…)"
          required
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
        <select name="kind" defaultValue="nota" style={{ ...inputStyle, width: 160, cursor: "pointer" }}>
          {BRAND_DOCUMENT_KINDS.map((k) => (
            <option
              key={k}
              value={k}
              style={{ background: "var(--surface-app)", color: "var(--text-strong)" }}
            >
              {k}
            </option>
          ))}
        </select>
        <label className="btn-pill" style={{ cursor: "pointer", fontSize: 11, whiteSpace: "nowrap" }}>
          <Upload size={14} /> Subir .md
          <input
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={onFile}
            style={{ display: "none" }}
          />
        </label>
      </div>
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        required
        placeholder="# Markdown del documento. Información de la marca, datos de analytics, informes, objeciones del VoC…"
        style={{
          ...inputStyle,
          resize: "vertical",
          lineHeight: 1.5,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      />
      {state.error && <ErrorBox>{state.error}</ErrorBox>}
      <AddButton />
    </form>
  );
}

function DocumentCard({ doc, brandId }: { doc: BrandDocument; brandId: string }) {
  const preview =
    doc.content.length > 240 ? `${doc.content.slice(0, 240)}…` : doc.content;
  return (
    <li
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "rgba(var(--fg),0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ color: "var(--text-strong)", fontWeight: 700, fontSize: 14 }}>
            {doc.title}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-pill)",
              padding: "2px 8px",
            }}
          >
            {doc.kind}
          </span>
        </span>
        <form action={deleteBrandDocumentAction}>
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="brand_id" value={brandId} />
          <DeleteButton title={doc.title} />
        </form>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.55,
          color: "rgba(var(--fg),0.6)",
          whiteSpace: "pre-wrap",
        }}
      >
        {preview}
      </p>
    </li>
  );
}

// ── Primitivos ─────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: "rgba(var(--fg),0.5)", margin: 0, lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        padding: 14,
        border: "1px solid var(--error-500)",
        borderRadius: "var(--radius-md)",
        color: "rgba(var(--fg),0.9)",
        background: "rgba(180,35,24,0.12)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-pill" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Guardando..." : "Guardar identidad"}
    </button>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-pill solid" disabled={pending} style={{ alignSelf: "flex-start" }}>
      {pending ? "Añadiendo..." : "Añadir documento"}
    </button>
  );
}

function DeleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Eliminar documento ${title}`}
      title="Eliminar documento"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(var(--fg),0.12)",
        background: "transparent",
        color: "rgba(var(--fg),0.55)",
        cursor: "pointer",
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
