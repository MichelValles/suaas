"use client";

import { useMemo, useState } from "react";

type Row = {
  profileId: string;
  profileName: string;
  profileDemo: string;
  recall: string;
  perceived_offer: string;
  clarity: number;
  comprehension_rate: number | null;
  barriers_detected: string[];
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
          color: active ? "var(--accent-500)" : "rgba(255,255,255,0.55)",
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
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-md)",
          color: "rgba(255,255,255,0.55)",
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
          color: "var(--accent-500)",
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
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>{header("profile", "Perfil")}</Th>
              <Th>{header("clarity", "Claridad")}</Th>
              <Th>{header("comprehension", "Comprensión")}</Th>
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
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <Td>
                    <button
                      type="button"
                      onClick={() => toggle(row.profileId)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            fontSize: 16,
                          }}
                        >
                          {row.profileName}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {row.profileDemo}
                        </span>
                      </span>
                    </button>
                  </Td>
                  <Td>{fmtPct(row.clarity)}</Td>
                  <Td>
                    {row.comprehension_rate === null
                      ? "—"
                      : fmtPct(row.comprehension_rate)}
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {row.barriers_detected.length === 0
                        ? "—"
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
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "var(--radius-pill)",
                        color: "rgba(255,255,255,0.75)",
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
                      colSpan={5}
                      style={{
                        padding: 0,
                        background: "rgba(255,255,255,0.02)",
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
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.9)",
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
