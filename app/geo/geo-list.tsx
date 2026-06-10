"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { deleteGeoAnalysisAction } from "./actions";
import type { GeoAnalysis } from "@/lib/geo";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando...",
  done: "Completado",
  error: "Error",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(255,255,255,0.45)",
  running: "#facc15",
  done: "#4ade80",
  error: "#f87171",
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
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 16px",
          }}
        >
          <Search size={14} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
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
              color: "rgba(255,255,255,0.35)",
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
              color: "rgba(255,255,255,0.4)",
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-pill)",
              color: "rgba(255,255,255,0.8)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              padding: "7px 14px",
              outline: "none",
              cursor: "pointer",
              colorScheme: "dark",
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
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.5)",
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
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.4)",
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
  const color = STATUS_COLOR[analysis.status] ?? "rgba(255,255,255,0.45)";
  const segCount = analysis.segments?.length ?? 0;
  const doneCount =
    analysis.results?.filter((r) => r.brand_mentioned !== undefined).length ?? 0;
  const visAvg =
    analysis.results && analysis.results.length > 0
      ? Math.round(
          (analysis.results.reduce((s, r) => s + r.visibility_score, 0) /
            analysis.results.length) * 100,
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
          style={{ fontSize: 10, letterSpacing: "0.16em", color: "rgba(255,255,255,0.35)" }}
        >
          {formatDate(analysis.created_at)}
        </span>
        <form action={deleteGeoAnalysisAction}>
          <input type="hidden" name="id" value={analysis.id} />
          <button
            type="submit"
            aria-label="Enviar análisis a la papelera"
            title="Enviar a papelera"
            onClick={(e) => {
              if (
                !window.confirm(
                  `¿Enviar «${analysis.name}» a la papelera? Podrás restaurarlo desde Sistema → Papelera.`,
                )
              ) {
                e.preventDefault();
              }
            }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-sm)",
              color: "rgba(255,255,255,0.3)",
              padding: "4px 7px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              lineHeight: 1,
              transition: "color var(--dur-micro), border-color var(--dur-micro)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248,113,113,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <Trash2 size={13} />
          </button>
        </form>
      </div>

      {/* Nombre y descripción (área clicable) */}
      <Link href={`/geo/${analysis.id}`} style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              color: "#fff",
              lineHeight: 1.25,
            }}
          >
            {analysis.name}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
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
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Stat label="Segmentos" value={String(segCount)} />
        {analysis.status === "done" && visAvg !== null && (
          <Stat label="Visibilidad" value={`${visAvg}%`} color={color} />
        )}
        {analysis.status === "running" && (
          <Stat label="Analizados" value={`${doneCount}/${segCount}`} color="#facc15" />
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
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: color ?? "rgba(255,255,255,0.85)", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
