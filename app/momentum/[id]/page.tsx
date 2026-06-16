import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { BrandContextBox } from "@/components/brand-context-box";
import { estimateAction, partsForKind } from "@/lib/estimate";
import {
  getMomentumChallenge,
  type MomentumChallenge,
  type ProfileMomentumResult,
} from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MomentumRunButton } from "./run-button";

export const dynamic = "force-dynamic";

const DIRECTION_LABEL: Record<string, string> = {
  approaching: "Activo",
  stable: "Latente",
  drifting: "Inactivo",
};
const DIRECTION_COLOR: Record<string, string> = {
  approaching: "var(--success-text)",
  stable: "var(--warning-text)",
  drifting: "var(--error-text)",
};
const DIRECTION_TOOLTIP: Record<string, string> = {
  approaching: "El perfil se mueve activamente hacia buscar una solución.",
  stable: "El perfil es consciente del Trigger pero no toma acción todavía.",
  drifting: "El perfil lo pospone indefinidamente o lo descarta.",
};
const VELOCITY_LABEL: Record<string, string> = {
  accelerating: "Acelerando",
  steady: "Constante",
  decelerating: "Decelerando",
};
const VELOCITY_TOOLTIP: Record<string, string> = {
  accelerating: "La urgencia crece con el tiempo: cada semana más activo.",
  steady: "El ritmo de aproximación al Trigger se mantiene estable.",
  decelerating: "La urgencia se disipa: pierde prioridad frente a otras cosas.",
};

export default async function MomentumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="CONSTRUCTION · Momentum" title="Supabase no configurado." />
        <Link href="/momentum" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  const challenge = await getMomentumChallenge(id);
  if (!challenge) notFound();

  const trashed = Boolean(challenge.deleted_at);
  const canRun =
    !trashed && (challenge.status === "pending" || challenge.status === "error");
  // Coste estimado del análisis (1 llamada por perfil asignado), para el botón.
  const runEstimate = canRun
    ? await estimateAction(
        partsForKind("momentum", { profiles: challenge.profile_ids.length }),
      ).catch(() => null)
    : null;

  return (
    <AppShell>
      <PageHeading
        eyebrow="CONSTRUCTION · Momentum"
        title={challenge.name}
        description={challenge.trigger_scenario}
        descriptionVariant="panel"
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {canRun && (
              <MomentumRunButton
                challengeId={challenge.id}
                estimatedUsd={runEstimate?.est_usd ?? null}
              />
            )}
            <Link href="/momentum" className="btn-pill">Volver</Link>
          </div>
        }
      />

      {trashed && (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 13,
          }}
        >
          Este Trigger está en la papelera: se muestra solo como histórico.
          Restáuralo desde Sistema → Papelera para volver a lanzarlo.
        </div>
      )}

      {challenge.brand_context && (
        <BrandContextBox text={challenge.brand_context} />
      )}

      {challenge.status === "running" && (
        <div style={{ padding: 20, border: "1px solid rgba(250, 204, 13, 0.3)", borderRadius: "var(--radius-md)", background: "rgba(250, 204, 13, 0.06)", color: "var(--warning-text)", fontSize: 14 }}>
          Análisis en progreso. Recarga la página para ver los resultados cuando termine.
        </div>
      )}

      {challenge.status === "error" && (
        <div style={{ padding: 20, border: "1px solid rgba(180, 35, 24, 0.4)", borderRadius: "var(--radius-md)", background: "rgba(180, 35, 24, 0.08)", color: "var(--error-text)", fontSize: 14 }}>
          El análisis terminó con error. Puedes relanzarlo con el botón de arriba.
        </div>
      )}

      {challenge.status === "pending" && !challenge.results && (
        <div style={{ padding: 48, border: "1px dashed rgba(var(--fg),0.12)", borderRadius: "var(--radius-md)", color: "rgba(var(--fg),0.5)", textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
          Pulsa «Analizar» para lanzar el análisis contra los {challenge.profile_ids.length} perfiles seleccionados.
        </div>
      )}

      {challenge.results && challenge.results.length > 0 && (
        <>
          <SummaryStrip challenge={challenge} />
          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--accent-text)", margin: 0 }}
            >
              Intent por perfil
            </h2>
            {challenge.results.map((r, i) => (
              <ProfileCard key={i} result={r} />
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}

function SummaryStrip({ challenge }: { challenge: MomentumChallenge }) {
  const results = challenge.results ?? [];
  const approaching = results.filter((r) => r.direction === "approaching").length;
  const stable = results.filter((r) => r.direction === "stable").length;
  const drifting = results.filter((r) => r.direction === "drifting").length;
  const avgIntensity =
    results.length > 0
      ? results.reduce((s, r) => s + r.intensity, 0) / results.length
      : null;

  const channelCounts = new Map<string, number>();
  for (const r of results) {
    for (const ch of r.channels) {
      channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    }
  }
  const topChannels = [...channelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ch]) => ch);

  const intensityColor =
    avgIntensity !== null && avgIntensity >= 0.6
      ? "var(--success-text)"
      : avgIntensity !== null && avgIntensity >= 0.3
        ? "var(--warning-text)"
        : "var(--error-text)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        <MetricCard
          label="Activos"
          value={String(approaching)}
          color="var(--success-text)"
          tooltip="El perfil se mueve hacia una solución: el Trigger tiene suficiente peso para que actúe a corto plazo."
        />
        <MetricCard
          label="Latentes"
          value={String(stable)}
          color="var(--warning-text)"
          tooltip="El perfil es consciente del Trigger pero no actúa todavía: lo tiene en radar, frenado por fricciones o prioridades."
        />
        <MetricCard
          label="Inactivos"
          value={String(drifting)}
          color="var(--error-text)"
          tooltip="El perfil pospone el Trigger indefinidamente o lo descarta: el peso gravitacional no es suficiente para moverle."
        />
        <MetricCard
          label="Intensidad media"
          value={avgIntensity !== null ? `${Math.round(avgIntensity * 100)}%` : "-"}
          color={intensityColor}
          tooltip="Fuerza promedio del intent de 0 a 100. A mayor intensidad, más probable que el perfil busque una solución próximamente."
        />
      </div>

      {topChannels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--fg),0.35)" }}
          >
            Canales más frecuentes
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topChannels.map((ch) => (
              <span
                key={ch}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(var(--fg),0.07)",
                  color: "rgba(var(--fg),0.65)",
                  border: "1px solid rgba(var(--fg),0.1)",
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  tooltip,
}: {
  label: string;
  value: string;
  color?: string;
  tooltip?: string;
}) {
  return (
    <div
      data-tooltip={tooltip}
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: tooltip ? "help" : undefined,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)" }}
      >
        {label}
      </span>
      <span className="display" style={{ fontSize: 28, lineHeight: 1, color: color ?? "var(--text-strong)" }}>
        {value}
      </span>
    </div>
  );
}

function ProfileCard({ result }: { result: ProfileMomentumResult }) {
  const dirColor = DIRECTION_COLOR[result.direction] ?? "rgba(var(--fg),0.6)";
  const initials = result.profile_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Cabecera: avatar + nombre + badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: `${dirColor}22`,
              border: `1px solid ${dirColor}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: dirColor,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <span
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, color: "var(--text-strong)", lineHeight: 1.2 }}
          >
            {result.profile_name}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <Badge
            label={DIRECTION_LABEL[result.direction] ?? result.direction}
            color={dirColor}
            tooltip={DIRECTION_TOOLTIP[result.direction]}
          />
          <Badge
            label={VELOCITY_LABEL[result.velocity] ?? result.velocity}
            color="rgba(var(--fg),0.5)"
            tooltip={VELOCITY_TOOLTIP[result.velocity]}
          />
        </div>
      </div>

      {/* Barra de intensidad */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          className="mono"
          style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)" }}
        >
          Intensidad
        </span>
        <div style={{ flex: 1, height: 4, background: "rgba(var(--fg),0.08)", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{ width: `${Math.round(result.intensity * 100)}%`, height: "100%", background: dirColor, borderRadius: 2 }}
          />
        </div>
        <span style={{ fontSize: 12, color: dirColor, minWidth: 32, textAlign: "right" }}>
          {Math.round(result.intensity * 100)}%
        </span>
      </div>

      {/* Narrativa de intención */}
      <div style={{ borderLeft: `2px solid ${dirColor}44`, paddingLeft: 16 }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(var(--fg),0.8)", fontStyle: "italic", margin: 0 }}>
          «{result.intent_narrative}»
        </p>
      </div>

      {/* Primeros pasos */}
      {result.first_steps.length > 0 && (
        <Section label="Primeros pasos">
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {result.first_steps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: "rgba(var(--fg),0.72)", lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Canales */}
      {result.channels.length > 0 && (
        <Section label="Canales que usaría">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.channels.map((ch, i) => (
              <span
                key={i}
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                  background: "rgba(var(--fg),0.06)",
                  border: "1px solid rgba(var(--fg),0.1)",
                  color: "rgba(var(--fg),0.6)",
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Barreras */}
      {result.barriers.length > 0 && (
        <Section label="Barreras y fricciones">
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
            {result.barriers.map((b, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--error-text)", lineHeight: 1.5 }}>
                {b}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* JTBD expresado */}
      {result.jtbd_expressed && (
        <Section label="JTBD en sus palabras">
          <p style={{ fontSize: 13, color: "rgba(var(--fg),0.55)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
            {result.jtbd_expressed}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(var(--fg),0.4)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Badge({
  label,
  color,
  tooltip,
}: {
  label: string;
  color: string;
  tooltip?: string;
}) {
  return (
    <span
      className="mono"
      data-tooltip={tooltip}
      style={{
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "var(--radius-pill)",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        cursor: tooltip ? "help" : undefined,
      }}
    >
      {label}
    </span>
  );
}
