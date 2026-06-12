"use client";

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  EUR_PER_USD,
  SUPABASE_MICRO_EUR,
  SUPABASE_ORG_BASE_EUR,
  TIERS,
  VERCEL_COMPUTE_EUR,
  VERCEL_SEAT_EUR,
  INFRA_PER_CLIENT_EUR,
  FIXED_OVERHEAD_EUR,
} from "@/lib/landing-pricing";

function eur(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}
function pct(n: number): string {
  return `${(n * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })} %`;
}

const captionStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(var(--fg),0.45)",
};
const fieldStyle: CSSProperties = {
  background: "rgba(var(--fg),0.05)",
  border: "1px solid rgba(var(--fg),0.14)",
  borderRadius: "var(--radius-sm)",
  padding: "11px 13px",
  color: "var(--text-strong)",
  fontSize: 15,
  outline: "none",
  fontFamily: "var(--font-mono)",
  width: "100%",
};

const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

export function PricingCalculator({ unlocked = false }: { unlocked?: boolean }) {
  if (!unlocked) {
    return (
      <div
        style={{
          border: "1px dashed rgba(var(--fg),0.16)",
          borderRadius: "var(--radius-md)",
          padding: "28px 26px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "rgba(var(--fg),0.6)",
        }}
      >
        <Lock size={18} color="var(--accent-500)" />
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>
          Herramienta interna de Flat 101. Introduce la contraseña del pie de página y monta
          escenarios: cuántos paquetes de cada tipo y qué margen queda.
        </span>
      </div>
    );
  }
  return <WhatIf />;
}

function WhatIf() {
  const [counts, setCounts] = useState<Record<string, number>>({ starter: 2, pro: 4, agency: 1 });
  const [gestionEur, setGestionEur] = useState(150);

  const set = (id: string, v: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, Math.round(v) || 0) }));

  const r = useMemo(() => {
    const total = TIERS.reduce((s, t) => s + (counts[t.id] ?? 0), 0);
    const mrr = TIERS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.priceMonth, 0);
    const setupTotal = TIERS.reduce((s, t) => s + (counts[t.id] ?? 0) * t.setup, 0);
    // Coste de IA = presupuesto incluido por paquete (tope que se aprovisiona).
    const apiTotal = TIERS.reduce(
      (s, t) => s + (counts[t.id] ?? 0) * t.apiBudgetUsd * EUR_PER_USD,
      0,
    );
    const supaMicro = SUPABASE_MICRO_EUR * total;
    const vercelCompute = VERCEL_COMPUTE_EUR * total;
    const fixed = total > 0 ? SUPABASE_ORG_BASE_EUR + VERCEL_SEAT_EUR : 0;
    const gestion = total > 0 ? gestionEur : 0;

    const infraVariable = supaMicro + vercelCompute;
    const cogsVariable = infraVariable + apiTotal;
    const cogsTotal = cogsVariable + fixed + gestion;
    const gross = mrr - cogsVariable;
    const net = mrr - cogsTotal;

    return {
      total,
      mrr,
      setupTotal,
      apiTotal,
      supaMicro,
      vercelCompute,
      fixed,
      gestion,
      cogsTotal,
      gross,
      net,
      grossMargin: mrr > 0 ? gross / mrr : 0,
      netMargin: mrr > 0 ? net / mrr : 0,
      perInstance: total > 0 ? cogsTotal / total : 0,
    };
  }, [counts, gestionEur]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <span style={{ ...captionStyle, color: "var(--accent-text)" }}>
        Escenario what-if · vista interna
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, alignItems: "start" }}>
        {/* ── Inputs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {TIERS.map((t) => (
            <label key={t.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={captionStyle}>
                {t.name} · {eur(t.priceMonth)}/mes
              </span>
              <input
                type="number"
                min={0}
                value={counts[t.id] ?? 0}
                onChange={(e) => set(t.id, Number(e.target.value))}
                style={fieldStyle}
              />
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={captionStyle}>Coste de gestión (€/mes)</span>
            <input
              type="number"
              min={0}
              value={gestionEur}
              onChange={(e) => setGestionEur(Math.max(0, Number(e.target.value) || 0))}
              style={fieldStyle}
            />
          </label>
        </div>

        {/* ── KPIs + desglose ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={panel}>
            <Row label="Instancias" value={String(r.total)} />
            <Row label="Ingreso recurrente (MRR)" value={`${eur(r.mrr)}/mes`} strong />
            <Row label="Calibración opcional (una vez)" value={eur(r.setupTotal)} dim />
            <Divider />
            <Row label="Rentabilidad bruta" value={`${eur(r.gross)}/mes · ${pct(r.grossMargin)}`} accent />
            <Row label="Rentabilidad neta" value={`${eur(r.net)}/mes · ${pct(r.netMargin)}`} accent strong />
            <Row label="Coste por instancia" value={r.total > 0 ? `${eur(r.perInstance, 0)}/mes` : "-"} dim />
          </div>

          <div style={panel}>
            <span style={captionStyle}>Infraestructura (€/mes)</span>
            <Row
              label={`Supabase (base ${eur(SUPABASE_ORG_BASE_EUR)} + ${r.total}×${eur(SUPABASE_MICRO_EUR)})`}
              value={eur((r.total > 0 ? SUPABASE_ORG_BASE_EUR : 0) + r.supaMicro)}
              dim
            />
            <Row
              label={`Vercel (seat ${eur(VERCEL_SEAT_EUR)} + ${r.total}×${eur(VERCEL_COMPUTE_EUR)})`}
              value={eur((r.total > 0 ? VERCEL_SEAT_EUR : 0) + r.vercelCompute)}
              dim
            />
            <Row label="IA (presupuesto incluido por paquete)" value={eur(r.apiTotal)} dim />
            <Row label="Gestión" value={eur(r.gestion)} dim />
            <Divider />
            <Row label="Coste total" value={`${eur(r.cogsTotal)}/mes`} />
          </div>
        </div>
      </div>

      {/* ── Gráfica de amortización ── */}
      <div style={panel}>
        <span style={captionStyle}>Coste de infraestructura por instancia</span>
        <p style={{ fontSize: 12, color: "rgba(var(--fg),0.5)", lineHeight: 1.5, margin: 0 }}>
          El coste fijo (seat de Vercel y base de Supabase) se reparte entre todas las instancias:
          a más clientes, menos cuesta cada uno. Tiende a {eur(INFRA_PER_CLIENT_EUR)}/mes.
        </p>
        <AmortizationChart current={r.total} />
      </div>
    </div>
  );
}

const panel: CSSProperties = {
  border: "1px solid rgba(var(--fg),0.1)",
  borderRadius: "var(--radius-md)",
  padding: "20px 22px",
  background: "rgba(var(--fg),0.02)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

function Row({
  label,
  value,
  strong,
  dim,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontSize: 13, color: dim ? "rgba(var(--fg),0.45)" : "rgba(var(--fg),0.65)" }}>{label}</span>
      <span
        className="mono"
        style={{
          fontSize: strong ? 17 : 14,
          fontWeight: strong ? 700 : 500,
          color: accent ? "var(--accent-text)" : dim ? "rgba(var(--fg),0.6)" : "var(--text-strong)",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(var(--fg),0.08)", margin: "2px 0" }} />;
}

// ── Gráfica de amortización (SVG, sin librerías) ──

function AmortizationChart({ current }: { current: number }) {
  const W = 600;
  const H = 220;
  const m = { left: 42, right: 14, top: 14, bottom: 30 };
  const maxK = Math.max(20, current + 2);
  const yMax = 50;
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const costAt = (k: number) => INFRA_PER_CLIENT_EUR + FIXED_OVERHEAD_EUR / k;
  const xFor = (k: number) => m.left + ((k - 1) / (maxK - 1)) * plotW;
  const yFor = (v: number) => m.top + (1 - Math.min(v, yMax) / yMax) * plotH;

  const pts: string[] = [];
  for (let k = 1; k <= maxK; k += 1) pts.push(`${xFor(k).toFixed(1)},${yFor(costAt(k)).toFixed(1)}`);

  const xTicks = [1, 5, 10, 15, 20].filter((k) => k <= maxK);
  const yTicks = [0, 25, 50];
  const floorY = yFor(INFRA_PER_CLIENT_EUR);
  const showMarker = current >= 1 && current <= maxK;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Coste por instancia según número de instancias" style={{ marginTop: 4 }}>
      {/* Ejes */}
      <line x1={m.left} y1={m.top} x2={m.left} y2={H - m.bottom} stroke="rgba(var(--fg),0.2)" />
      <line x1={m.left} y1={H - m.bottom} x2={W - m.right} y2={H - m.bottom} stroke="rgba(var(--fg),0.2)" />
      {/* Ticks Y */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={m.left - 4} y1={yFor(v)} x2={W - m.right} y2={yFor(v)} stroke="rgba(var(--fg),0.06)" />
          <text x={m.left - 8} y={yFor(v) + 3} textAnchor="end" fontSize="9" fill="rgba(var(--fg),0.4)" fontFamily="var(--font-mono)">
            {v} €
          </text>
        </g>
      ))}
      {/* Suelo (coste marginal) */}
      <line x1={m.left} y1={floorY} x2={W - m.right} y2={floorY} stroke="rgba(var(--fg),0.25)" strokeDasharray="4 4" />
      <text x={W - m.right} y={floorY - 5} textAnchor="end" fontSize="9" fill="rgba(var(--fg),0.4)" fontFamily="var(--font-mono)">
        suelo {INFRA_PER_CLIENT_EUR} €
      </text>
      {/* Curva */}
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent-500)" strokeWidth="2" />
      {/* Ticks X */}
      {xTicks.map((k) => (
        <text key={k} x={xFor(k)} y={H - m.bottom + 16} textAnchor="middle" fontSize="9" fill="rgba(var(--fg),0.4)" fontFamily="var(--font-mono)">
          {k}
        </text>
      ))}
      <text x={(m.left + W - m.right) / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="rgba(var(--fg),0.35)" fontFamily="var(--font-mono)">
        nº de instancias
      </text>
      {/* Marcador del escenario actual */}
      {showMarker && (
        <g>
          <line x1={xFor(current)} y1={m.top} x2={xFor(current)} y2={H - m.bottom} stroke="var(--accent-500)" strokeOpacity="0.35" />
          <circle cx={xFor(current)} cy={yFor(costAt(current))} r="4" fill="var(--accent-500)" />
          <text
            x={xFor(current) + (current <= 2 ? 6 : current >= maxK - 1 ? -6 : 0)}
            y={yFor(costAt(current)) - 9}
            textAnchor={current <= 2 ? "start" : current >= maxK - 1 ? "end" : "middle"}
            fontSize="10"
            fill="var(--accent-text)"
            fontFamily="var(--font-mono)"
          >
            {eur(costAt(current), 0)}/inst.
          </text>
        </g>
      )}
    </svg>
  );
}
