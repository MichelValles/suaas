"use client";

import { useMemo, useState } from "react";
import {
  AI_PROVIDERS,
  EUR_PER_USD,
  FIXED_OVERHEAD_EUR,
  INFRA_PER_CLIENT_EUR,
  type AiModel,
  TIERS,
  runCostEur,
  runsForBudget,
} from "@/lib/landing-pricing";

const ALL_MODELS: { provider: string; model: AiModel }[] = AI_PROVIDERS.flatMap(
  (p) => p.models.map((model) => ({ provider: p.provider, model })),
);

function eur(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}

function pct(n: number): string {
  return `${(n * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })} %`;
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const captionStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(var(--fg),0.45)",
};
const fieldStyle: React.CSSProperties = {
  background: "rgba(var(--fg),0.05)",
  border: "1px solid rgba(var(--fg),0.14)",
  borderRadius: "var(--radius-sm)",
  padding: "11px 13px",
  color: "var(--text-strong)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-sans)",
};

export function PricingCalculator() {
  // Por defecto modo cliente (seguro): los márgenes no aparecen hasta que se
  // cambia explícitamente a interno. Evita enseñar rentabilidad por accidente.
  const [mode, setMode] = useState<"cliente" | "interno">("cliente");
  const [tierId, setTierId] = useState("pro");
  const [clients, setClients] = useState(5);
  const [modelId, setModelId] = useState("anthropic/claude-sonnet-4.6");
  const [runsPerClient, setRunsPerClient] = useState(150);
  const [gestionEur, setGestionEur] = useState(150);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[1];
  const model =
    ALL_MODELS.find((m) => m.model.id === modelId)?.model ?? ALL_MODELS[0].model;

  const calc = useMemo(() => {
    const price = customPrice ?? tier.priceMonth;
    const costPerRun = runCostEur(model);
    const runsIncluded = runsForBudget(model, tier.apiBudgetUsd);
    // El budget de la key es el corte duro: no se pueden correr más runs que
    // los incluidos en el plan.
    const effectiveRuns = Math.min(runsPerClient, runsIncluded);
    const overBudget = runsPerClient > runsIncluded;
    const apiCogs = effectiveRuns * costPerRun;
    const cogsPerClient = INFRA_PER_CLIENT_EUR + apiCogs;
    const grossPerClient = price - cogsPerClient;

    const revenueMrr = clients * price;
    const variableCogs = clients * cogsPerClient;
    const grossProfit = revenueMrr - variableCogs;
    const netProfit = grossProfit - FIXED_OVERHEAD_EUR - gestionEur;
    const setupRevenue = clients * tier.setup;

    return {
      price,
      costPerRun,
      runsIncluded,
      effectiveRuns,
      overBudget,
      apiCogs,
      cogsPerClient,
      grossPerClient,
      revenueMrr,
      grossProfit,
      netProfit,
      grossMargin: revenueMrr > 0 ? grossProfit / revenueMrr : 0,
      netMargin: revenueMrr > 0 ? netProfit / revenueMrr : 0,
      setupRevenue,
    };
  }, [tier, model, clients, runsPerClient, gestionEur, customPrice]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Toggle modo */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={captionStyle}>Vista</span>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid rgba(var(--fg),0.14)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          {(["cliente", "interno"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="mono"
              style={{
                padding: "8px 18px",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: mode === m ? "var(--accent-500)" : "transparent",
                color: mode === m ? "var(--ink-900)" : "rgba(var(--fg),0.6)",
                fontWeight: 700,
              }}
            >
              {m === "cliente" ? "Cliente" : "Interno"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "rgba(var(--fg),0.4)" }}>
          {mode === "interno"
            ? "Muestra coste, rentabilidad bruta y neta. No compartir con el cliente."
            : "Sólo tarifa y lo que incluye. Modo seguro para presentar."}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ── Inputs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={labelStyle}>
            <span style={captionStyle}>Paquete</span>
            <select
              value={tierId}
              onChange={(e) => {
                setTierId(e.target.value);
                setCustomPrice(null);
              }}
              style={fieldStyle}
            >
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {eur(t.priceMonth)}/mes
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span style={captionStyle}>
              Precio al cliente (€/mes){customPrice !== null ? " · personalizado" : ""}
            </span>
            <input
              type="number"
              min={0}
              value={calc.price}
              onChange={(e) => {
                const v = e.target.value;
                // Campo vacío vuelve al precio del tier; entrada inválida no
                // propaga NaN al resto de la calculadora.
                setCustomPrice(v === "" ? null : Math.max(0, Number(v) || 0));
              }}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={captionStyle}>Nº de clientes</span>
            <input
              type="number"
              min={1}
              value={clients}
              onChange={(e) => setClients(Math.max(1, Number(e.target.value)))}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={captionStyle}>Motor de IA</span>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              style={fieldStyle}
            >
              {AI_PROVIDERS.map((p) => (
                <optgroup key={p.provider} label={p.provider}>
                  {p.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {m.current ? " (actual)" : ""} · {eur(runCostEur(m), 3)}/run
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span style={captionStyle}>Runs/mes por cliente</span>
            <input
              type="number"
              min={0}
              value={runsPerClient}
              onChange={(e) => setRunsPerClient(Math.max(0, Number(e.target.value)))}
              style={fieldStyle}
            />
            <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>
              Incluidos en el plan: ~{calc.runsIncluded.toLocaleString("es-ES")} runs/mes
              {calc.overBudget ? " · pides más de los incluidos (subir tier)" : ""}
            </span>
          </label>

          {mode === "interno" && (
            <label style={labelStyle}>
              <span style={captionStyle}>Coste de gestión (€/mes)</span>
              <input
                type="number"
                min={0}
                value={gestionEur}
                onChange={(e) => setGestionEur(Math.max(0, Number(e.target.value)))}
                style={fieldStyle}
              />
              <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)" }}>
                Tu tiempo de mantenimiento amortizado sobre la flota.
              </span>
            </label>
          )}
        </div>

        {/* ── Outputs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Por cliente */}
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.1)",
              borderRadius: "var(--radius-md)",
              padding: "20px 22px",
              background: "rgba(var(--fg),0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span style={captionStyle}>Por cliente</span>
            <Row label="Tarifa mensual" value={eur(calc.price)} strong />
            <Row label="Setup (una vez)" value={eur(tier.setup)} />
            <Row
              label="Runs/mes incluidos"
              value={`~${calc.runsIncluded.toLocaleString("es-ES")}`}
            />
            {mode === "interno" && (
              <>
                <Divider />
                <Row label="Coste infra" value={eur(INFRA_PER_CLIENT_EUR)} dim />
                <Row label="Coste IA estimado" value={eur(calc.apiCogs, 2)} dim />
                <Row label="Coste total/cliente" value={eur(calc.cogsPerClient, 2)} dim />
                <Row
                  label="Margen bruto/cliente"
                  value={`${eur(calc.grossPerClient)} · ${pct(
                    calc.price > 0 ? calc.grossPerClient / calc.price : 0,
                  )}`}
                  accent
                />
              </>
            )}
          </div>

          {/* Flota */}
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.1)",
              borderRadius: "var(--radius-md)",
              padding: "20px 22px",
              background: "rgba(var(--fg),0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span style={captionStyle}>
              {clients} cliente{clients === 1 ? "" : "s"}
            </span>
            <Row label="Ingreso recurrente (MRR)" value={eur(calc.revenueMrr)} strong />
            <Row label="Setup total (una vez)" value={eur(calc.setupRevenue)} />
            {mode === "interno" && (
              <>
                <Divider />
                <Row
                  label="Rentabilidad bruta"
                  value={`${eur(calc.grossProfit)}/mes · ${pct(calc.grossMargin)}`}
                  accent
                />
                <Row
                  label="Overhead fijo + gestión"
                  value={`− ${eur(FIXED_OVERHEAD_EUR + gestionEur)}`}
                  dim
                />
                <Row
                  label="Rentabilidad neta"
                  value={`${eur(calc.netProfit)}/mes · ${pct(calc.netMargin)}`}
                  accent
                  strong
                />
                <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)", lineHeight: 1.5 }}>
                  Bruta = ingresos − (infra + IA). Neta = bruta − seat Vercel y base
                  Supabase ({eur(FIXED_OVERHEAD_EUR)}) − gestión. La IA está capada por
                  el budget de la key: el coste nunca supera lo incluido.
                </span>
              </>
            )}
            {mode === "cliente" && (
              <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)", lineHeight: 1.5 }}>
                Instancia dedicada con tu marca, aislamiento de datos y presupuesto de IA
                incluido. Sin coste por participante ni esperas de reclutamiento.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <span
        style={{
          fontSize: 13,
          color: dim ? "rgba(var(--fg),0.45)" : "rgba(var(--fg),0.65)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: strong ? 17 : 14,
          fontWeight: strong ? 700 : 500,
          color: accent
            ? "var(--accent-text)"
            : dim
              ? "rgba(var(--fg),0.6)"
              : "var(--text-strong)",
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
