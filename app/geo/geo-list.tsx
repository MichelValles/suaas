"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { SendToTrashButton } from "@/components/trash-button";
import type { GeoAnalysis } from "@/lib/geo";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando...",
  done: "Completado",
  error: "Error",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(var(--fg),0.45)",
  running: "var(--warning-text)",
  done: "var(--success-text)",
  error: "var(--error-text)",
};
const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

const ORDERS = [
  { value: "recent", label: "Más recientes" },
  { value: "oldest", label: "Más antiguos" },
  { value: "az", label: "A-Z" },
];

export function GeoList({ analyses }: { analyses: GeoAnalysis[] }) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("recent");

  const filtered = analyses
    .filter((a) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.brand_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (order === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (order === "az") return a.name.localeCompare(b.name, "es");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Barra de herramientas */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(var(--fg),0.04)",
            border: "1px solid rgba(var(--fg),0.1)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
          }}
        >
          <Search size={14} style={{ color: "rgba(var(--fg),0.35)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-strong)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              flex: 1,
              minWidth: 0,
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "rgba(var(--fg),0.35)",
              letterSpacing: "0.12em",
              flexShrink: 0,
            }}
          >
            {filtered.length}/{analyses.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: "rgba(var(--fg),0.4)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Orden
          </span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            style={{
              background: "rgba(var(--fg),0.04)",
              border: "1px solid rgba(var(--fg),0.1)",
              borderRadius: "var(--radius-pill)",
              color: "rgba(var(--fg),0.8)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              padding: "7px 14px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {ORDERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estados vacíos y grid */}
      {analyses.length === 0 ? (
        <div
          style={{
            padding: "48px 32px",
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.5)",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Todavía no hay análisis GEO.{" "}
          <Link href="/geo/new" style={{ color: "var(--accent-400)", textDecoration: "underline" }}>
            Crea el primero.
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "32px",
            border: "1px dashed rgba(var(--fg),0.1)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.4)",
            textAlign: "center",
            fontSize: 14,
          }}
        >
          Ningún análisis coincide con la búsqueda.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((a) => (
            <GeoCard key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeoCard({ analysis }: { analysis: GeoAnalysis }) {
  const color = STATUS_COLOR[analysis.status] ?? "rgba(var(--fg),0.45)";
  const segCount = analysis.segments?.length ?? 0;
  const doneCount =
    analysis.results?.filter(
      (r) => (r.engines?.length ?? 0) > 0 || r.brand_mentioned !== undefined,
    ).length ?? 0;
  // Visibilidad media del análisis: en v2 (sondas reales) promedia los
  // motores con métricas de cada segmento; en v1 usa el score plano.
  const segmentScores = (analysis.results ?? [])
    .map((r) => {
      if (r.engines && r.engines.length > 0) {
        const scored = r.engines.filter((e) => e.metrics);
        return scored.length > 0
          ? scored.reduce((s, e) => s + (e.metrics?.visibility_score ?? 0), 0) /
              scored.length
          : null;
      }
      return r.visibility_score ?? null;
    })
    .filter((v): v is number => v !== null);
  const visAvg =
    segmentScores.length > 0
      ? Math.round(
          (segmentScores.reduce((s, v) => s + v, 0) / segmentScores.length) * 100,
        )
      : null;
  const descPreview =
    analysis.brand_description.length > 130
      ? analysis.brand_description.slice(0, 127) + "..."
      : analysis.brand_description;

  return (
    <div
      className="surface-feature"
      style={{
        padding: 20,
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Fila superior: fecha + botón eliminar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(var(--fg),0.35)" }}
        >
          {formatDate(analysis.created_at)}
        </span>
        <SendToTrashButton type="geo" id={analysis.id} name={analysis.name} variant="inline" />
      </div>

      {/* Nombre y descripción (área clicable) */}
      <Link href={`/geo/${analysis.id}`} style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--text-strong)",
              lineHeight: 1.25,
            }}
          >
            {analysis.name}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(var(--fg),0.5)",
              lineHeight: 1.55,
            }}
          >
            {descPreview}
          </span>
        </div>
      </Link>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 20,
          paddingTop: 12,
          borderTop: "1px solid rgba(var(--fg),0.06)",
        }}
      >
        <Stat label="Segmentos" value={String(segCount)} />
        {analysis.status === "done" && visAvg !== null && (
          <Stat label="Visibilidad" value={`${visAvg}%`} color={color} />
        )}
        {analysis.status === "running" && (
          <Stat label="Analizados" value={`${doneCount}/${segCount}`} color="var(--warning-text)" />
        )}
        <Stat
          label="Estado"
          value={STATUS_LABEL[analysis.status] ?? analysis.status}
          color={color}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.35)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: color ?? "rgba(var(--fg),0.85)", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
