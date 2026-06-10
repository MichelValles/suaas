"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { MomentumChallenge } from "@/lib/momentum";
import { deleteMomentumChallengeAction } from "./actions";

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando",
  done: "Completado",
  error: "Error",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(var(--fg),0.35)",
  running: "var(--warning-text)",
  done: "var(--success-text)",
  error: "var(--error-text)",
};

export function MomentumList({ challenges }: { challenges: MomentumChallenge[] }) {
  const [search, setSearch] = useState("");

  const filtered = challenges.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.trigger_scenario.toLowerCase().includes(search.toLowerCase()),
  );

  if (challenges.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <p style={{ color: "rgba(var(--fg),0.4)", fontSize: 14, margin: 0 }}>
          Todavía no hay Triggers de Momentum.
        </p>
        <Link href="/momentum/new" className="btn-pill solid" style={{ fontSize: 13 }}>
          Crear el primero
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(var(--fg),0.35)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Buscar Triggers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: 36,
              paddingRight: 12,
              height: 36,
              background: "rgba(var(--fg),0.04)",
              border: "1px solid rgba(var(--fg),0.1)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-strong)",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.14em", color: "rgba(var(--fg),0.35)", whiteSpace: "nowrap" }}
        >
          {filtered.length}/{challenges.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "rgba(var(--fg),0.35)", fontSize: 13, textAlign: "center", padding: "32px 0", margin: 0 }}>
          Ningún Trigger coincide con la búsqueda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => (
            <MomentumCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function MomentumCard({ challenge: c }: { challenge: MomentumChallenge }) {
  const dist = c.results
    ? {
        approaching: c.results.filter((r) => r.direction === "approaching").length,
        stable: c.results.filter((r) => r.direction === "stable").length,
        drifting: c.results.filter((r) => r.direction === "drifting").length,
      }
    : null;

  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(var(--fg),0.35)", textTransform: "uppercase" }}>
          {formatDate(c.created_at)}
        </span>
        <form action={deleteMomentumChallengeAction}>
          <input type="hidden" name="id" value={c.id} />
          <button
            type="submit"
            aria-label="Enviar Trigger a la papelera"
            title="Enviar a papelera"
            onClick={(e) => {
              if (
                !window.confirm(
                  `¿Enviar «${c.name}» a la papelera? Podrás restaurarlo desde Sistema → Papelera.`,
                )
              )
                e.preventDefault();
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(var(--fg),0.25)", padding: 4, display: "flex", alignItems: "center" }}
          >
            <Trash2 size={14} />
          </button>
        </form>
      </div>

      <Link href={`/momentum/${c.id}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-strong)", lineHeight: 1.2 }}>
          {c.name}
        </span>
        <span style={{ fontSize: 13, color: "rgba(var(--fg),0.5)", lineHeight: 1.5 }}>
          {c.trigger_scenario.length > 120
            ? c.trigger_scenario.slice(0, 120) + "..."
            : c.trigger_scenario}
        </span>
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          paddingTop: 10,
          borderTop: "1px solid rgba(var(--fg),0.06)",
          flexWrap: "wrap",
        }}
      >
        <StatChip label="Perfiles" value={String(c.profile_ids.length)} />
        <StatChip
          label="Estado"
          value={STATUS_LABEL[c.status] ?? c.status}
          color={STATUS_COLOR[c.status]}
        />
        {dist && c.results && c.results.length > 0 && (
          <>
            <StatChip label="Activos" value={String(dist.approaching)} color="var(--success-text)" />
            <StatChip label="Latentes" value={String(dist.stable)} color="var(--warning-text)" />
            <StatChip label="Inactivos" value={String(dist.drifting)} color="var(--error-text)" />
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="mono" style={{ fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--fg),0.3)" }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 13, color: color ?? "rgba(var(--fg),0.7)" }}>
        {value}
      </span>
    </div>
  );
}
