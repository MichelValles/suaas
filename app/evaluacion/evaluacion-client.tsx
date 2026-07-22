"use client";

import Link from "next/link";
import { useState } from "react";
// Solo tipos de @/lib/eval (se borran en compilación): importar un valor
// runtime de ahí arrastraría código de servidor (ai, recordUsage → supabase)
// al bundle del cliente y rompería la hidratación.
import type { EvalAggregate, EvalModelResult } from "@/lib/eval";

const EVAL_DIMENSIONS = [
  { key: "role_fidelity", label: "Fidelidad de rol" },
  { key: "grounding", label: "Anclaje en el perfil" },
  { key: "non_sycophancy", label: "No complacencia" },
  { key: "naturalness", label: "Naturalidad" },
] as const;

const TARGETS = [
  { value: "anthropic/claude-sonnet-4.6", label: "Sonnet 4.6" },
  { value: "anthropic/claude-opus-4.8", label: "Opus 4.8" },
  { value: "anthropic/claude-haiku-4.5", label: "Haiku 4.5" },
];
const JUDGES = [
  { value: "openai/gpt-5.4", label: "GPT-5.4 · OpenAI (independiente)" },
  { value: "openai/gpt-5.5", label: "GPT-5.5 · OpenAI (independiente)" },
];

type ApiResponse = { judge: string; results: EvalModelResult[] };

const FAILURE_LABEL: Record<string, string> = {
  ninguno: "sin fallo",
  rompe_rol: "rompe rol",
  generico: "genérico",
  complaciente: "complaciente",
  robotico: "robótico",
  otro: "otro",
};

export function EvaluacionClient({ defaultTarget }: { defaultTarget: string }) {
  const [targetA, setTargetA] = useState(
    TARGETS.some((t) => t.value === defaultTarget) ? defaultTarget : TARGETS[0].value,
  );
  const [targetB, setTargetB] = useState("");
  const [judge, setJudge] = useState(JUDGES[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const targets = [targetA, targetB].filter(Boolean).filter((t, i, a) => a.indexOf(t) === i);
      const res = await fetch("/api/eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, judge }),
      });
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Controles */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          flexWrap: "wrap",
          padding: 20,
          border: "1px solid rgba(var(--fg),0.1)",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--fg),0.02)",
        }}
      >
        <Sel label="Modelo objetivo" value={targetA} onChange={setTargetA} options={TARGETS} />
        <Sel
          label="Comparar con (opcional)"
          value={targetB}
          onChange={setTargetB}
          options={[{ value: "", label: "Sin comparación" }, ...TARGETS]}
        />
        <Sel label="Juez" value={judge} onChange={setJudge} options={JUDGES} />
        <button
          type="button"
          className="btn-pill solid"
          onClick={run}
          disabled={loading}
          style={{ fontSize: 13 }}
        >
          {loading ? "Ejecutando…" : "Ejecutar evaluación"}
        </button>
      </div>

      <p style={{ color: "rgba(var(--fg),0.5)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
        Cada ejecución corre 4 casos por modelo (una generación + un juicio por caso) y se registra en{" "}
        <Link href="/observabilidad" style={{ color: "var(--accent-text)", textDecoration: "underline" }}>
          Observabilidad
        </Link>
        . El juez es de otra familia de modelo a propósito: juzgar a Claude con Claude mediría su opinión sobre sí mismo. Es medición declarativa simulada; no sustituye la validación con humanos.
      </p>

      {error && (
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
          Error: {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            padding: "36px 32px",
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 14,
          }}
        >
          Generando y juzgando las salidas… puede tardar un minuto (más con Opus o dos modelos).
        </div>
      )}

      {data && (
        <>
          {/* Resumen / comparación */}
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabel>Resumen{data.results.length > 1 ? " · comparación" : ""}</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {data.results.map((r) => (
                <AggCard key={r.model} model={r.model} agg={r.aggregate} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>
              Juez: {data.judge}
            </span>
          </section>

          {/* Detalle por modelo */}
          {data.results.map((r) => (
            <section key={r.model} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SectionLabel>Detalle · {modelShort(r.model)}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {r.cases.map((c) => (
                  <CaseCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

// ── piezas ──────────────────────────────────────────────

function Sel({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{
          background: "var(--surface-panel)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "9px 12px",
          color: "var(--text-strong)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          outline: "none",
          minWidth: 220,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: "var(--surface-panel)", color: "var(--text-strong)" }}
          >
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  );
}

function AggCard({ model, agg }: { model: string; agg: EvalAggregate }) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "rgba(var(--fg),0.02)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)" }}>
          {modelShort(model)}
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent-500)" }}>
          {score100(agg.overall)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EVAL_DIMENSIONS.map((d) => (
          <Bar key={d.key} label={d.label} value={agg[d.key]} />
        ))}
      </div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "rgba(var(--fg),0.6)", width: 130, flexShrink: 0 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(var(--fg),0.08)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(value * 100)}%`,
            background: "var(--accent-500)",
          }}
        />
      </div>
      <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.7)", width: 30, textAlign: "right" }}>
        {score100(value)}
      </span>
    </div>
  );
}

function CaseCard({
  c,
}: {
  c: EvalModelResult["cases"][number];
}) {
  const s = c.scores;
  const fail = s.failure_mode !== "ninguno";
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, color: "var(--text-strong)", fontSize: 15 }}>{c.label}</span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: "var(--radius-pill)",
            border: `1px solid ${fail ? "var(--error-text)" : "var(--success-text)"}`,
            color: fail ? "var(--error-text)" : "var(--success-text)",
          }}
        >
          {FAILURE_LABEL[s.failure_mode] ?? s.failure_mode} · {score100(s.overall)}
        </span>
      </div>

      <p style={{ fontSize: 12, color: "rgba(var(--fg),0.5)", margin: 0, lineHeight: 1.5 }}>{c.probes}</p>

      <Field label="Estímulo">{c.stimulus}</Field>
      <Field label="Respuesta del modelo" strong>
        {c.response}
      </Field>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 8,
          paddingTop: 6,
        }}
      >
        {EVAL_DIMENSIONS.map((d) => (
          <div key={d.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)" }}>
              {d.label}
            </span>
            <span className="mono" style={{ fontSize: 14, color: "var(--text-strong)" }}>
              {score100(s[d.key])}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "rgba(var(--fg),0.75)", margin: 0, lineHeight: 1.5 }}>
        <span style={{ color: "var(--accent-text)" }}>Veredicto: </span>
        {s.verdict}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  strong,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.4)",
        }}
      >
        {label}
      </span>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: strong ? "var(--text-strong)" : "rgba(var(--fg),0.7)",
          background: strong ? "rgba(var(--fg),0.03)" : "transparent",
          padding: strong ? "10px 14px" : 0,
          borderRadius: strong ? "var(--radius-sm)" : 0,
          borderLeft: strong ? "2px solid rgba(var(--fg),0.15)" : "none",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </p>
    </div>
  );
}

function modelShort(model: string): string {
  return model.split("/").pop() ?? model;
}

function score100(v: number): string {
  return String(Math.round(v * 100));
}
