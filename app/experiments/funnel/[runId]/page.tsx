import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ResultBar } from "@/components/result-bar";
import { getFunnel } from "@/lib/funnels";
import {
  listFunnelStepResponses,
  summarizeFunnelResponses,
} from "@/lib/experiments/funnel";
import { listProfilesByIds } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { FunnelResponsesTable } from "./responses-table";

export const dynamic = "force-dynamic";

export default async function FunnelRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Resultados · funnel"
          title="Supabase aún no está conectado."
        />
        <Link href="/funnels" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const run = await getRun(runId);
  if (!run || run.kind !== "funnel") notFound();

  const funnelId = run.funnel_id ?? (run.params?.funnelId as string | undefined);
  if (!funnelId) notFound();

  const [funnel, responses] = await Promise.all([
    getFunnel(funnelId),
    listFunnelStepResponses(runId),
  ]);
  if (!funnel) notFound();

  const profileIdsRequested = (run.params?.profileIds as string[] | undefined) ?? [];
  const totalProfiles = profileIdsRequested.length || new Set(responses.map((r) => r.profileId)).size;

  const profiles = await listProfilesByIds(
    Array.from(new Set([...profileIdsRequested, ...responses.map((r) => r.profileId)])),
  );
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  const summary = summarizeFunnelResponses(funnel, totalProfiles, responses);
  const stepsByPosition = new Map(funnel.steps.map((s) => [s.position, s]));
  const maxFrictionCount = summary.top_friction_overall[0]?.count ?? 1;

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Run · ${run.status}`}
        title={funnel.name}
        description={`Recorrido de ${funnel.steps.length} pasos sobre ${summary.n} ${summary.n === 1 ? "perfil" : "perfiles"}.`}
        actions={
          <Link href={`/funnels/${funnel.id}`} className="btn-pill">
            Volver al embudo
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        <SummaryCard
          label="Completion"
          value={summary.completion_rate}
          hint="% perfiles que llegan al último paso y siguen."
        />
        <SummaryCard
          label="Esfuerzo medio"
          value={summary.mean_effort}
          hint="Lower is better. Media sobre todos los pasos vistos."
          invert
        />
        <SummaryCard
          label="Claridad de intent"
          value={summary.mean_intent_match}
          hint="Cuán claro está qué hacer en cada paso."
        />
        <NumberCard label="Perfiles" value={summary.n} />
      </section>

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
          Embudo paso a paso
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {summary.dropoff_by_step.map((step) => {
            const dropped = step.reached - step.continued;
            return (
              <div
                key={step.position}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 420px",
                  gap: 16,
                  padding: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  alignItems: "center",
                }}
              >
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
                    Paso {step.position} · {step.reached}/{summary.n} alcanzados
                  </span>
                  <span style={{ fontSize: 15, color: "#fff" }}>{step.name}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                    {step.continued} continuó · {dropped} abandonó
                    {step.top_friction.length > 0
                      ? ` · fricción: ${step.top_friction.map((f) => f.label).join(", ")}`
                      : ""}
                  </span>
                </div>
                <FunnelBar
                  total={summary.n}
                  reached={step.reached}
                  continued={step.continued}
                />
              </div>
            );
          })}
        </div>
      </section>

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
          Top fricciones agregadas
        </h2>
        {summary.top_friction_overall.length === 0 ? (
          <div
            style={{
              padding: 16,
              border: "1px dashed rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
            }}
          >
            Ningún perfil reportó fricciones explícitas.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {summary.top_friction_overall.map((f) => (
              <ResultBar
                key={f.label}
                label={f.label}
                value={f.count / maxFrictionCount}
                hint={`citado ${f.count}×`}
              />
            ))}
          </div>
        )}
      </section>

      <FunnelResponsesTable
        steps={funnel.steps.map((s) => ({ id: s.id, position: s.position, name: s.name }))}
        rows={Array.from(new Set(responses.map((r) => r.profileId))).map((pid) => {
          const profile = profilesById.get(pid);
          const profileResponses = responses.filter((r) => r.profileId === pid);
          return {
            profileId: pid,
            profileName: profile?.name ?? pid.slice(0, 8),
            profileDemo: profile
              ? `${profile.demographics.age} · ${profile.demographics.gender} · ${profile.demographics.occupation}`
              : "",
            steps: profileResponses.map((r) => ({
              stepId: r.stepId,
              stepName: stepsByPosition.get(r.position)?.name ?? `Paso ${r.position}`,
              position: r.position,
              perception: r.perception,
              intent_match: r.intent_match,
              effort: r.effort,
              friction: r.friction,
              would_continue: r.would_continue,
              reasoning: r.reasoning,
            })),
            dropoff_step:
              profileResponses.find((r) => !r.would_continue)?.position ?? null,
          };
        })}
      />
    </AppShell>
  );
}

function FunnelBar({
  total,
  reached,
  continued,
}: {
  total: number;
  reached: number;
  continued: number;
}) {
  const reachedPct = total === 0 ? 0 : reached / total;
  const continuedPct = total === 0 ? 0 : continued / total;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          height: 14,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${reachedPct * 100}%`,
            background: "rgba(255,255,255,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${continuedPct * 100}%`,
            background: "var(--accent-500)",
          }}
        />
      </div>
      <div
        className="mono"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        <span>llegó {Math.round(reachedPct * 100)}%</span>
        <span>siguió {Math.round(continuedPct * 100)}%</span>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  invert,
}: {
  label: string;
  value: number;
  hint?: string;
  invert?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
        {invert ? " ↓" : ""}
      </span>
      <span
        className="display"
        style={{ fontSize: 36, lineHeight: 1, color: "#fff" }}
      >
        {`${Math.round(value * 100)}%`}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

function NumberCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="display"
        style={{ fontSize: 36, lineHeight: 1, color: "#fff" }}
      >
        {value}
      </span>
    </div>
  );
}
