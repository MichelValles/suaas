"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChannelIcon } from "@/components/channel-icon";
import { CHANNEL_LABEL } from "@/lib/campaigns";
import { GENERAL_CONTEXT_QUERY } from "@/lib/experiments/campaign-shared";
import type { CampaignResponse } from "@/lib/experiments/campaign";

/**
 * Tabla interactiva de respuestas de un run de campaña (clon estructural de
 * la responses-table de five-second): ordenable por score, filtrable por
 * query y canal, con drill-down por fila (razonamiento, barreras, crítica
 * de landing y versión ideal). Campañas es el módulo con mayor cardinalidad
 * (hasta 200 filas): los <details> server-rendered no escalaban.
 */

type SortKey = "intent" | "clarity" | "credibility" | "match" | "comprehension";

function fmtPct(v: number | null): string {
  if (v === null) return "·";
  return `${Math.round(v * 100)}%`;
}

function queryLabel(query: string): string {
  return query === GENERAL_CONTEXT_QUERY ? "Contexto general" : query;
}

function sortValue(r: CampaignResponse, key: SortKey): number {
  switch (key) {
    case "intent":
      return r.intent_to_click;
    case "clarity":
      return r.clarity;
    case "credibility":
      return r.credibility;
    case "match":
      return r.landing_match ?? -1;
    case "comprehension":
      return r.comprehension_rate ?? -1;
  }
}

const BEHAVIOR_LABEL: Record<string, { text: string; color: string }> = {
  optima: { text: "Óptima", color: "var(--success-text)" },
  repesca: { text: "Repesca", color: "var(--warning-text)" },
  fuga: { text: "Fuga", color: "var(--error-text)" },
};

export function CampaignResponsesTable({
  responses,
  names,
}: {
  responses: CampaignResponse[];
  names: Record<string, string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("intent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [queryFilter, setQueryFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const queries = useMemo(
    () => [...new Set(responses.map((r) => r.query))],
    [responses],
  );
  const channels = useMemo(
    () => [...new Set(responses.map((r) => r.channel))],
    [responses],
  );

  const rows = useMemo(() => {
    const filtered = responses.filter(
      (r) =>
        (queryFilter === "all" || r.query === queryFilter) &&
        (channelFilter === "all" || r.channel === channelFilter),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => dir * (sortValue(a, sortKey) - sortValue(b, sortKey)),
    );
  }, [responses, queryFilter, channelFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleRow(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (responses.length === 0) {
    return (
      <div
        style={{
          padding: "26px 24px",
          border: "1px dashed rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-md)",
          color: "rgba(var(--fg),0.55)",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Sin respuestas todavía.
      </div>
    );
  }

  const hasComprehension = responses.some((r) => r.comprehension_rate !== null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {(queries.length > 1 || channels.length > 1) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {queries.length > 1 && (
            <FilterSelect
              label="Query"
              value={queryFilter}
              onChange={setQueryFilter}
              options={[
                { value: "all", label: "Todas las queries" },
                ...queries.map((q) => ({ value: q, label: queryLabel(q) })),
              ]}
            />
          )}
          {channels.length > 1 && (
            <FilterSelect
              label="Canal"
              value={channelFilter}
              onChange={setChannelFilter}
              options={[
                { value: "all", label: "Todos los canales" },
                ...channels.map((c) => ({ value: c, label: CHANNEL_LABEL[c] })),
              ]}
            />
          )}
          <span
            className="mono"
            style={{
              alignSelf: "flex-end",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "rgba(var(--fg),0.45)",
              paddingBottom: 9,
            }}
          >
            {rows.length} de {responses.length}
          </span>
        </div>
      )}

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
            <tr>
              <Th>Perfil</Th>
              <Th>Canal · query</Th>
              <SortTh label="Intent" active={sortKey === "intent"} dir={sortDir} onClick={() => toggleSort("intent")} />
              <SortTh label="Claridad" active={sortKey === "clarity"} dir={sortDir} onClick={() => toggleSort("clarity")} />
              <SortTh label="Credib." active={sortKey === "credibility"} dir={sortDir} onClick={() => toggleSort("credibility")} />
              <SortTh label="Match" active={sortKey === "match"} dir={sortDir} onClick={() => toggleSort("match")} />
              {hasComprehension && (
                <SortTh label="Compr." active={sortKey === "comprehension"} dir={sortDir} onClick={() => toggleSort("comprehension")} />
              )}
              <Th>Conducta</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const key = `${r.profileId}|${r.channel}|${r.query}`;
              const open = expanded.has(key);
              const behavior = r.behavior_class
                ? BEHAVIOR_LABEL[r.behavior_class]
                : null;
              const colSpan = hasComprehension ? 9 : 8;
              return (
                <Fragment key={key}>
                  <tr
                    onClick={() => toggleRow(key)}
                    style={{
                      borderTop: "1px solid rgba(var(--fg),0.06)",
                      cursor: "pointer",
                      background: open ? "rgba(var(--fg),0.03)" : "transparent",
                    }}
                  >
                    <Td>
                      <Link
                        href={`/profiles/${r.profileId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          color: "var(--text-strong)",
                          textDecoration: "none",
                          borderBottom: "1px dotted rgba(var(--fg),0.25)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {names[r.profileId] ?? r.profileId.slice(0, 8)}
                      </Link>
                    </Td>
                    <Td>
                      <span
                        className="mono"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "rgba(var(--fg),0.7)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <ChannelIcon channel={r.channel} size={12} />
                        {queryLabel(r.query)}
                      </span>
                    </Td>
                    <Td>{fmtPct(r.intent_to_click)}</Td>
                    <Td>{fmtPct(r.clarity)}</Td>
                    <Td>{fmtPct(r.credibility)}</Td>
                    <Td>{fmtPct(r.landing_match)}</Td>
                    {hasComprehension && <Td>{fmtPct(r.comprehension_rate)}</Td>}
                    <Td>
                      {behavior ? (
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: behavior.color, whiteSpace: "nowrap" }}
                        >
                          {behavior.text}
                        </span>
                      ) : (
                        <span style={{ color: "rgba(var(--fg),0.3)" }}>·</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "rgba(var(--fg),0.45)" }}
                      >
                        {open ? "−" : "+"}
                      </span>
                    </Td>
                  </tr>
                  {open && (
                    <tr style={{ background: "rgba(var(--fg),0.02)" }}>
                      <td colSpan={colSpan} style={{ padding: "14px 16px 18px" }}>
                        <ResponseDetail response={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResponseDetail({ response: r }: { response: CampaignResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
        «{r.perceived_offer}»
      </p>
      {r.reasoning && (
        <p
          style={{
            color: "rgba(var(--fg),0.65)",
            fontSize: 12,
            margin: 0,
            lineHeight: 1.55,
            fontStyle: "italic",
          }}
        >
          Razonamiento: {r.reasoning}
        </p>
      )}
      {r.barriers.length > 0 && (
        <p style={{ color: "rgba(var(--fg),0.6)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Barreras: {r.barriers.join(", ")}
        </p>
      )}
      {r.landing_evaluated && (
        <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          Landing match {fmtPct(r.landing_match)}: {r.landing_critique}
        </p>
      )}
      <div
        style={{
          borderTop: "1px dashed rgba(var(--fg),0.1)",
          paddingTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(var(--fg),0.55)" }}
        >
          Como yo lo veo
        </span>
        <p className="serp-link" style={{ fontSize: 14, margin: 0, lineHeight: 1.4 }}>
          {r.ideal_headline}
        </p>
        <p style={{ color: "rgba(var(--fg),0.78)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          {r.ideal_description}
        </p>
        <p style={{ color: "rgba(var(--fg),0.6)", fontSize: 11, margin: 0, fontStyle: "italic" }}>
          «{r.ideal_promise}»
        </p>
        {r.ideal_free_text && (
          <p style={{ color: "rgba(var(--fg),0.55)", fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            {r.ideal_free_text}
          </p>
        )}
      </div>
      {r.quality && <QualityBlock q={r.quality} />}
    </div>
  );
}

const FAILURE_LABEL: Record<string, string> = {
  ninguno: "Sin fallo",
  rompe_rol: "Rompe rol",
  generico: "Genérico",
  complaciente: "Complaciente",
  robotico: "Robótico",
  otro: "Otro fallo",
};

function QualityBlock({ q }: { q: NonNullable<CampaignResponse["quality"]> }) {
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
        borderTop: "1px dashed rgba(var(--fg),0.1)",
        paddingTop: 8,
        marginTop: 2,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--accent-text)" }}
      >
        Calidad · juez independiente
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {dims.map(([label, value]) => (
          <span key={label} style={{ fontSize: 12, color: "rgba(var(--fg),0.7)" }}>
            <span style={{ color: "rgba(var(--fg),0.45)" }}>{label} </span>
            <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>
              {fmtPct(value)}
            </span>
          </span>
        ))}
      </div>
      <p
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: "rgba(var(--fg),0.7)",
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
            background: "color-mix(in srgb, var(--warning-text) 13%, transparent)",
            color: "var(--warning-text)",
            border: "1px solid color-mix(in srgb, var(--warning-text) 33%, transparent)",
          }}
        >
          {FAILURE_LABEL[q.failure_mode] ?? q.failure_mode}
        </span>
      )}
    </div>
  );
}

function FilterSelect({
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
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{
          background: "rgba(var(--fg),0.03)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 10px",
          color: "var(--text-strong)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textAlign: "left",
        color: "rgba(var(--fg),0.55)",
        fontWeight: 400,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th
      className="mono"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textAlign: "left",
        color: active ? "var(--accent-text)" : "rgba(var(--fg),0.55)",
        fontWeight: 400,
        whiteSpace: "nowrap",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {label} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "10px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {children}
    </td>
  );
}
