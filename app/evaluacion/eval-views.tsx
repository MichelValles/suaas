// Componentes de presentación compartidos entre la ejecución en vivo
// (evaluacion-client.tsx, cliente) y el detalle de un eval guardado
// (evaluacion/[id]/page.tsx, servidor). Sin "use client" ni hooks: son puros
// (props -> JSX), así los usan ambos contextos. Solo tipos de @/lib/eval.
import type {
  EvalAggregate,
  EvalCaseResult,
  EvalModelResult,
} from "@/lib/eval";

export const EVAL_DIMENSIONS = [
  { key: "role_fidelity", label: "Fidelidad de rol" },
  { key: "grounding", label: "Anclaje en el perfil" },
  { key: "non_sycophancy", label: "No complacencia" },
  { key: "naturalness", label: "Naturalidad" },
] as const;

const FAILURE_LABEL: Record<string, string> = {
  ninguno: "sin fallo",
  rompe_rol: "rompe rol",
  generico: "genérico",
  complaciente: "complaciente",
  robotico: "robótico",
  otro: "otro",
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
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

export function AggCard({ model, agg }: { model: string; agg: EvalAggregate }) {
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
      <div style={{ flex: 1, height: 6, background: "rgba(var(--fg),0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(value * 100)}%`, background: "var(--accent-500)" }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.7)", width: 30, textAlign: "right" }}>
        {score100(value)}
      </span>
    </div>
  );
}

export function CaseCard({ c }: { c: EvalCaseResult }) {
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, paddingTop: 6 }}>
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
        style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)" }}
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

export function ModelResultDetail({ result }: { result: EvalModelResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {result.cases.map((c) => (
        <CaseCard key={c.id} c={c} />
      ))}
    </div>
  );
}

export function modelShort(model: string): string {
  return model.split("/").pop() ?? model;
}

export function score100(v: number | null): string {
  return v == null ? "·" : String(Math.round(v * 100));
}
