import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
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
  approaching: "#4ade80",
  stable: "#facc15",
  drifting: "#f87171",
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
        <PageHeading eyebrow="Momentum" title="Supabase no configurado." />
        <Link href="/momentum" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  const challenge = await getMomentumChallenge(id);
  if (!challenge) notFound();

  const canRun = challenge.status === "pending" || challenge.status === "error";

  return (
    <AppShell>
      <PageHeading
        eyebrow="Momentum"
        title={challenge.name}
        description={challenge.trigger_scenario}
        descriptionVariant="panel"
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {canRun && <MomentumRunButton challengeId={challenge.id} />}
            <Link href="/momentum" className="btn-pill">Volver</Link>
          </div>
        }
      />

      {challenge.brand_context && (
        <div
          style={{
            padding: "12px 16px",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.025)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
            Contexto de marca
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            {challenge.brand_context}
          </span>
        </div>
      )}

      {challenge.status === "running" && (
        <div style={{ padding: 20, border: "1px solid rgba(250,204,21,0.3)", borderRadius: "var(--radius-md)", background: "rgba(250,204,21,0.06)", color: "#facc15", fontSize: 14 }}>
          Análisis en progreso. Recarga la página para ver los resultados cuando termine.
        </div>
      )}

      {challenge.status === "error" && (
        <div style={{ padding: 20, border: "1px solid rgba(248,113,113,0.3)", borderRadius: "var(--radius-md)", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 14 }}>
          El análisis terminó con error. Puedes relanzarlo con el botón de arriba.
        </div>
      )}

      {challenge.status === "pending" && !challenge.results && (
        <div style={{ padding: 48, border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "var(--radius-md)", color: "rgba(255,255,255,0.5)", textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
          Pulsa «Analizar» para lanzar el análisis contra los {challenge.profile_ids.length} perfiles seleccionados.
        </div>
      )}

      {challenge.results && challenge.results.length > 0 && (
        <>
          <SummaryStrip challenge={challenge} />
          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--accent-500)", margin: 0 }}
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
      ? "#4ade80"
      : avgIntensity !== null && avgIntensity >= 0.3
        ? "#facc15"
        : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        <MetricCard label="Activos" value={String(approaching)} color="#4ade80" />
        <MetricCard label="Latentes" value={String(stable)} color="#facc15" />
        <MetricCard label="Inactivos" value={String(drifting)} color="#f87171" />
        <MetricCard
          label="Intensidad media"
          value={avgIntensity !== null ? `${Math.round(avgIntensity * 100)}%` : "-"}
          color={intensityColor}
        />
      </div>

      {topChannels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            className="mono"
            style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}
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
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.65)",
                  border: "1px solid rgba(255,255,255,0.1)",
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
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
      <span className="display" style={{ fontSize: 28, lineHeight: 1, color: color ?? "#fff" }}>
        {value}
      </span>
    </div>
  );
}

function ProfileCard({ result }: { result: ProfileMomentumResult }) {
  const dirColor = DIRECTION_COLOR[result.direction] ?? "rgba(255,255,255,0.6)";
  const initials = result.profile_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
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
            style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, color: "#fff", lineHeight: 1.2 }}
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
            color="rgba(255,255,255,0.5)"
            tooltip={VELOCITY_TOOLTIP[result.velocity]}
          />
        </div>
      </div>

      {/* Barra de intensidad */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          className="mono"
          style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}
        >
          Intensidad
        </span>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
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
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.8)", fontStyle: "italic", margin: 0 }}>
          «{result.intent_narrative}»
        </p>
      </div>

      {/* Primeros pasos */}
      {result.first_steps.length > 0 && (
        <Section label="Primeros pasos">
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {result.first_steps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
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
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
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
              <li key={i} style={{ fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>
                {b}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* JTBD expresado */}
      {result.jtbd_expressed && (
        <Section label="JTBD en sus palabras">
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
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
        style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}
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
