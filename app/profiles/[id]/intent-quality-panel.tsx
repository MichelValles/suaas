"use client";

import { useState, useTransition } from "react";
import {
  judgeIntentQualityAction,
  type IntentQualityState,
} from "./intent-quality-actions";

const FAILURE_LABEL: Record<string, string> = {
  ninguno: "Sin fallo",
  rompe_rol: "Rompe rol",
  generico: "Genérico",
  complaciente: "Complaciente",
  robotico: "Robótico",
  otro: "Otro fallo",
};

function pctText(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * Muestra el JTBD (intent_context) del perfil en la ficha, con un botón para
 * evaluar su calidad on-demand con el juez independiente (fidelidad del JTBD:
 * ¿ancla en este perfil y suena a su voz, o es fórmula de manual?).
 */
export function IntentQualityPanel({
  profileId,
  jtbd,
}: {
  profileId: string;
  jtbd: string | null;
}) {
  const [state, setState] = useState<IntentQualityState | null>(null);
  const [pending, start] = useTransition();

  function evaluate() {
    start(async () => setState(await judgeIntentQualityAction(profileId)));
  }

  const clean = jtbd?.trim();

  return (
    <section
      aria-label="Intención del perfil (JTBD)"
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
          }}
        >
          Intención · JTBD
        </span>
        {clean && (
          <button
            type="button"
            onClick={evaluate}
            disabled={pending}
            className="btn-pill"
            style={{ fontSize: 12 }}
          >
            {pending ? "Evaluando…" : "Evaluar calidad"}
          </button>
        )}
      </div>

      {clean ? (
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "rgba(var(--fg),0.85)",
            margin: 0,
            fontStyle: "italic",
            borderLeft: "2px solid rgba(var(--fg),0.14)",
            paddingLeft: 16,
          }}
        >
          «{clean}»
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "rgba(var(--fg),0.5)", margin: 0 }}>
          Este perfil no tiene JTBD todavía. Se genera desde el editor o con la
          tanda de intents.
        </p>
      )}

      {state && !state.ok && state.error && (
        <span style={{ color: "var(--error-text)", fontSize: 12 }}>
          {state.error}
        </span>
      )}

      {state?.ok && state.scores && (
        <QualityResult scores={state.scores} judge={state.judge ?? null} />
      )}
    </section>
  );
}

function QualityResult({
  scores,
  judge,
}: {
  scores: NonNullable<IntentQualityState["scores"]>;
  judge: string | null;
}) {
  const judgeShort = judge ? (judge.split("/").pop() ?? judge) : "otra familia";
  const dims: [string, number][] = [
    ["Global", scores.overall],
    ["Fidelidad", scores.role_fidelity],
    ["Anclaje", scores.grounding],
    ["No complac.", scores.non_sycophancy],
    ["Naturalidad", scores.naturalness],
  ];
  const flagged = scores.failure_mode && scores.failure_mode !== "ninguno";
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
        }}
      >
        Calidad del JTBD · juez independiente ({judgeShort})
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {dims.map(([label, value]) => (
          <span key={label} style={{ fontSize: 12, color: "rgba(var(--fg),0.7)" }}>
            <span style={{ color: "rgba(var(--fg),0.45)" }}>{label} </span>
            <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>
              {pctText(value)}
            </span>
          </span>
        ))}
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "rgba(var(--fg),0.75)",
          margin: 0,
          fontStyle: "italic",
        }}
      >
        “{scores.verdict}”
      </p>
      {flagged && (
        <span
          className="mono"
          style={{
            alignSelf: "flex-start",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "var(--radius-pill)",
            background: "var(--warning-text)22",
            color: "var(--warning-text)",
            border: "1px solid var(--warning-text)55",
          }}
        >
          {FAILURE_LABEL[scores.failure_mode] ?? scores.failure_mode}
        </span>
      )}
    </div>
  );
}
