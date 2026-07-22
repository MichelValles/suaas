"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EvalModelResult } from "@/lib/eval";
import { AggCard, CaseCard, modelShort, SectionLabel } from "./eval-views";

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

export function EvaluacionClient({ defaultTarget }: { defaultTarget: string }) {
  const [targetA, setTargetA] = useState(
    TARGETS.some((t) => t.value === defaultTarget) ? defaultTarget : TARGETS[0].value,
  );
  const [targetB, setTargetB] = useState("");
  const [judge, setJudge] = useState(JUDGES[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const router = useRouter();

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
      router.refresh(); // refresca el historial de evaluaciones (server)
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
        Cada ejecución corre 4 casos por modelo (una generación + un juicio por caso), se guarda en el
        historial de abajo y se registra en Observabilidad (dentro de Tokens). El juez es de otra familia de
        modelo a propósito: juzgar a Claude con Claude mediría su opinión sobre sí mismo. Es medición
        declarativa simulada; no sustituye la validación con humanos.
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
            <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>Juez: {data.judge}</span>
          </section>

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
        style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--fg),0.5)" }}
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
