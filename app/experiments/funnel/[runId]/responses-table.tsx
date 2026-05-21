"use client";

import { Fragment, useState } from "react";

type StepCell = {
  stepId: string;
  stepName: string;
  position: number;
  perception: string;
  intent_match: number;
  effort: number;
  friction: string[];
  would_continue: boolean;
  reasoning: string;
};

type Row = {
  profileId: string;
  profileName: string;
  profileDemo: string;
  steps: StepCell[];
  dropoff_step: number | null;
};

type StepHeader = { id: string; position: number; name: string };

export function FunnelResponsesTable({
  steps,
  rows,
}: {
  steps: StepHeader[];
  rows: Row[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
            margin: 0,
          }}
        >
          Recorridos por perfil
        </h2>
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          Sin respuestas registradas.
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
          margin: 0,
        }}
      >
        Recorridos por perfil
      </h2>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.55)" }}>
              <Th>Perfil</Th>
              {steps.map((s) => (
                <Th key={s.id}>{`P${s.position}`}</Th>
              ))}
              <Th>Dropoff</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = expanded === row.profileId;
              return (
                <Fragment key={row.profileId}>
                  <tr
                    onClick={() => setExpanded(open ? null : row.profileId)}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      background: open ? "rgba(255,255,255,0.03)" : "transparent",
                    }}
                  >
                    <Td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ color: "#fff" }}>{row.profileName}</span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          {row.profileDemo}
                        </span>
                      </div>
                    </Td>
                    {steps.map((s) => {
                      const cell = row.steps.find((c) => c.stepId === s.id);
                      return (
                        <Td key={s.id}>
                          <StepBadge cell={cell ?? null} dropoffAt={row.dropoff_step} position={s.position} />
                        </Td>
                      );
                    })}
                    <Td>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color:
                            row.dropoff_step === null
                              ? "var(--accent-500)"
                              : "var(--error-500)",
                        }}
                      >
                        {row.dropoff_step === null ? "completó" : `paso ${row.dropoff_step}`}
                      </span>
                    </Td>
                  </tr>
                  {open && (
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <td colSpan={steps.length + 2} style={{ padding: 16 }}>
                        <ExpandedDetail steps={row.steps} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StepBadge({
  cell,
  dropoffAt,
  position,
}: {
  cell: StepCell | null;
  dropoffAt: number | null;
  position: number;
}) {
  if (!cell) {
    const skipped = dropoffAt !== null && position > dropoffAt;
    return (
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
        }}
        title={skipped ? "Paso no alcanzado por dropoff previo" : "Sin respuesta"}
      >
        {skipped ? "—" : "?"}
      </span>
    );
  }
  const effortPct = Math.round(cell.effort * 100);
  const tone = cell.would_continue ? "var(--accent-500)" : "var(--error-500)";
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 2 }}
      title={`intent ${Math.round(cell.intent_match * 100)}% · effort ${effortPct}% · ${cell.would_continue ? "continúa" : "abandona"}`}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: tone,
        }}
      >
        {cell.would_continue ? "✓" : "✕"} e{effortPct}
      </span>
    </div>
  );
}

function ExpandedDetail({ steps }: { steps: StepCell[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {steps.map((s) => (
        <div
          key={s.stepId}
          style={{
            display: "grid",
            gridTemplateColumns: "120px minmax(0, 1fr)",
            gap: 16,
            padding: 12,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Paso {s.position}
            </span>
            <span style={{ color: "#fff", fontSize: 13 }}>{s.stepName}</span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: s.would_continue ? "var(--accent-500)" : "var(--error-500)",
              }}
            >
              {s.would_continue ? "continúa" : "abandona"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Block label="Percepción">{s.perception}</Block>
            <Block label="Por qué decide eso">{s.reasoning}</Block>
            <Stats intent={s.intent_match} effort={s.effort} />
            {s.friction.length > 0 && (
              <Block label="Fricción">
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.friction.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        padding: "2px 10px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "var(--radius-pill)",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </span>
              </Block>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.5 }}>
        {children}
      </span>
    </div>
  );
}

function Stats({ intent, effort }: { intent: number; effort: number }) {
  return (
    <div
      className="mono"
      style={{
        display: "flex",
        gap: 16,
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.65)",
      }}
    >
      <span>intent {Math.round(intent * 100)}%</span>
      <span>effort {Math.round(effort * 100)}%</span>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>
  );
}
