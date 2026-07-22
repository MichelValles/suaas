"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Forma local del veredicto del juez (sin importar de @/lib/eval, que arrastra
// código de servidor y rompería la hidratación del client component).
type QualityCell = {
  overall: number;
  role_fidelity: number;
  grounding: number;
  non_sycophancy: number;
  naturalness: number;
  failure_mode: string;
  verdict: string;
};

type Row = {
  profileId: string;
  profileName: string;
  profileDemo: string;
  recall: string;
  perceived_offer: string;
  clarity: number;
  comprehension_rate: number | null;
  barriers_detected: string[];
  behavior_class: "optima" | "fuga" | "repesca" | null;
  quality?: QualityCell | null;
};

const BEHAVIOR_LABEL: Record<string, string> = {
  optima: "Óptima",
  fuga: "Fuga",
  repesca: "Repesca",
};
const BEHAVIOR_COLOR: Record<string, string> = {
  optima: "var(--success-text)",
  repesca: "var(--warning-text)",
  fuga: "var(--error-text)",
};

type SortKey = "profile" | "clarity" | "comprehension";
type SortDir = "asc" | "desc";

export function ResponsesTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("comprehension");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function header(key: SortKey, label: string) {
    const active = sortKey === key;
    return (
      <button
        type="button"
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else {
            setSortKey(key);
            setSortDir("desc");
          }
        }}
        className="mono"
        style={{
          background: "transparent",
          border: "none",
          color: active ? "var(--accent-500)" : "rgba(var(--fg),0.55)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 400,
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        {label}
        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    );
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "profile") {
        cmp = a.profileName.localeCompare(b.profileName, "es");
      } else if (sortKey === "clarity") {
        cmp = a.clarity - b.clarity;
      } else {
        const av = a.comprehension_rate ?? -1;
        const bv = b.comprehension_rate ?? -1;
        cmp = av - bv;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          border: "1px dashed rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-md)",
          color: "rgba(var(--fg),0.55)",
          fontSize: 13,
        }}
      >
        Aún no hay respuestas para este run.
      </div>
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
          color: "var(--accent-text)",
          margin: 0,
        }}
      >
        Respuestas por perfil
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            color: "rgba(var(--fg),0.85)",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>{header("profile", "Perfil")}</Th>
              <Th>{header("clarity", "Claridad")}</Th>
              <Th>{header("comprehension", "Comprensión")}</Th>
              <Th>Conducta</Th>
              <Th>Barreras</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isOpen = expanded.has(row.profileId);
              return (
                <tr
                  key={row.profileId}
                  style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}
                >
                  <Td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "flex-start",
                      }}
                    >
                      <Link
                        href={`/profiles/${row.profileId}`}
                        title={`Ver perfil de ${row.profileName}`}
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "var(--text-strong)",
                          textDecoration: "none",
                          borderBottom: "1px dotted rgba(var(--fg),0.25)",
                        }}
                      >
                        {row.profileName}
                      </Link>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "rgba(var(--fg),0.5)",
                        }}
                      >
                        {row.profileDemo}
                      </span>
                    </div>
                  </Td>
                  <Td>{fmtPct(row.clarity)}</Td>
                  <Td>
                    {row.comprehension_rate === null
                      ? "·"
                      : fmtPct(row.comprehension_rate)}
                  </Td>
                  <Td>
                    {row.behavior_class ? (
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "var(--radius-pill)",
                          background: `${BEHAVIOR_COLOR[row.behavior_class]}22`,
                          color: BEHAVIOR_COLOR[row.behavior_class],
                          border: `1px solid ${BEHAVIOR_COLOR[row.behavior_class]}55`,
                        }}
                      >
                        {BEHAVIOR_LABEL[row.behavior_class]}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "rgba(var(--fg),0.3)" }}>·</span>
                    )}
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(var(--fg),0.6)",
                      }}
                    >
                      {row.barriers_detected.length === 0
                        ? "·"
                        : `${row.barriers_detected.length}`}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => toggle(row.profileId)}
                      className="mono"
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(var(--fg),0.12)",
                        borderRadius: "var(--radius-pill)",
                        color: "rgba(var(--fg),0.75)",
                        padding: "4px 12px",
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {isOpen ? "Cerrar" : "Detalle"}
                    </button>
                  </Td>
                  {isOpen && (
                    <td
                      colSpan={6}
                      style={{
                        padding: 0,
                        background: "rgba(var(--fg),0.02)",
                      }}
                    >
                      <div
                        style={{
                          padding: 20,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <Detail label="Recall" value={row.recall} />
                        <Detail
                          label="Oferta percibida"
                          value={row.perceived_offer}
                        />
                        <Detail
                          label="Barreras"
                          value={
                            row.barriers_detected.length
                              ? row.barriers_detected.join(" · ")
                              : "Ninguna reportada"
                          }
                        />
                        {row.quality && <QualityBlock q={row.quality} />}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: "8px 12px", fontWeight: 400 }}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: "rgba(var(--fg),0.9)",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

const FAILURE_LABEL: Record<string, string> = {
  ninguno: "Sin fallo",
  rompe_rol: "Rompe rol",
  generico: "Genérico",
  complaciente: "Complaciente",
  robotico: "Robótico",
  otro: "Otro fallo",
};

function QualityBlock({ q }: { q: QualityCell }) {
  const dims: [string, number][] = [
    ["Global", q.overall],
    ["Fidelidad", q.role_fidelity],
    ["Anclaje", q.grounding],
    ["No complac.", q.non_sycophancy],
    ["Naturalidad", q.naturalness],
  ];
  const flagged = q.failure_mode && q.failure_mode !== "ninguno";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginTop: 4,
        paddingTop: 14,
        borderTop: "1px solid rgba(var(--fg),0.08)",
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
        Calidad · juez independiente
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {dims.map(([label, value]) => (
          <span
            key={label}
            style={{ fontSize: 12, color: "rgba(var(--fg),0.7)" }}
          >
            <span style={{ color: "rgba(var(--fg),0.45)" }}>{label} </span>
            <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>
              {fmtPct(value)}
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
        “{q.verdict}”
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
          {FAILURE_LABEL[q.failure_mode] ?? q.failure_mode}
        </span>
      )}
    </div>
  );
}
