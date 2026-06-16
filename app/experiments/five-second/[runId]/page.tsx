import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ResultBar } from "@/components/result-bar";
import {
  listFiveSecondResponses,
  summarizeResponses,
} from "@/lib/experiments/five-second";
import { listProfilesByIds } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTargetWithTrashed } from "@/lib/targets";
import { ResponsesTable } from "./responses-table";

export const dynamic = "force-dynamic";

export default async function FiveSecondRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="CONSTRUCTION · Claridad 5s"
          title="Supabase aún no está conectado."
        />
        <Link href="/targets" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }

  const run = await getRun(runId);
  if (!run || run.kind !== "5s_test") notFound();

  // Vista de resultados históricos: el target se carga aunque esté en la
  // papelera para no romper runs antiguos.
  const [target, responses] = await Promise.all([
    run.target_id ? getTargetWithTrashed(run.target_id) : Promise.resolve(null),
    listFiveSecondResponses(runId),
  ]);

  const profiles = await listProfilesByIds(responses.map((r) => r.profileId));
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  const summary = summarizeResponses(responses);
  const maxBarrierCount = summary.top_barriers[0]?.count ?? 1;

  return (
    <AppShell>
      <PageHeading
        eyebrow="CONSTRUCTION · Claridad 5s"
        title={target?.payload.main_promise ?? "Run de claridad 5s"}
        description={
          target
            ? "Cada perfil ve la pantalla durante 5 segundos y reporta recall, oferta percibida y barreras. Un LLM-as-judge contrasta el recuerdo contra la promesa principal."
            : undefined
        }
        descriptionVariant="panel"
        actions={
          target && (
            <Link
              href={target.deleted_at ? "/targets" : `/targets/${target.id}`}
              className="btn-pill"
            >
              {target.deleted_at ? "Volver al listado" : "Volver al test"}
            </Link>
          )
        }
      />

      {target && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
            gap: 28,
            alignItems: "start",
          }}
        >
          <Hero src={target.payload.image_url} alt={target.name} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
            }}
          >
            <SummaryCard
              label="Comprehensión"
              value={summary.mean_comprehension}
              hint="Media de comprehension_rate del LLM-as-judge."
            />
            <SummaryCard
              label="Claridad"
              value={summary.mean_clarity}
              hint="Media subjetiva declarada por los perfiles."
            />
            <NumberCard label="Perfiles" value={summary.n} />
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            margin: 0,
          }}
        >
          Conducta predicha (Gravity Model)
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          <BehaviorCard label="Óptima" count={summary.behavior_counts.optima} total={summary.n} color="var(--success-text)" hint="Entendió el mensaje y seguiría hacia la acción." />
          <BehaviorCard label="Repesca" count={summary.behavior_counts.repesca} total={summary.n} color="var(--warning-text)" hint="Dudas, pero la intención sigue viva: recuperable con el mensaje correcto." />
          <BehaviorCard label="Fuga" count={summary.behavior_counts.fuga} total={summary.n} color="var(--error-text)" hint="Carga cognitiva o promesa poco clara: abandonaría." />
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            margin: 0,
          }}
        >
          Top barreras detectadas
        </h2>
        {summary.top_barriers.length === 0 ? (
          <div
            style={{
              padding: "28px 24px",
              border: "1px dashed rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-md)",
              color: "rgba(var(--fg),0.55)",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Ningún perfil reportó barreras explícitas.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {summary.top_barriers.map((b) => (
              <ResultBar
                key={b.label}
                label={b.label}
                value={b.count / maxBarrierCount}
                hint={`${b.count} de ${summary.n} perfiles`}
              />
            ))}
          </div>
        )}
      </section>

      <ResponsesTable
        rows={responses.map((r) => {
          const profile = profilesById.get(r.profileId);
          return {
            profileId: r.profileId,
            profileName: profile?.name ?? r.profileId.slice(0, 8),
            profileDemo: profile
              ? `${profile.demographics.age} · ${profile.demographics.gender} · ${profile.demographics.occupation}`
              : "",
            recall: r.recall,
            perceived_offer: r.perceived_offer,
            clarity: r.clarity,
            comprehension_rate: r.comprehension_rate,
            barriers_detected: r.barriers_detected,
            behavior_class: r.behavior_class,
          };
        })}
      />
    </AppShell>
  );
}

function Hero({ src, alt }: { src: string; alt: string }) {
  const isData = src.startsWith("data:");
  if (isData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          objectFit: "cover",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--fg),0.04)",
          border: "1px solid rgba(var(--fg),0.08)",
        }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={960}
      height={600}
      unoptimized
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "16 / 10",
        objectFit: "cover",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.04)",
        border: "1px solid rgba(var(--fg),0.08)",
      }}
    />
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
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
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="display"
        style={{ fontSize: 36, lineHeight: 1, color: "var(--text-strong)" }}
      >
        {value === null ? "·" : `${Math.round(value * 100)}%`}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "rgba(var(--fg),0.5)", lineHeight: 1.4 }}>
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
        border: "1px solid rgba(var(--fg),0.08)",
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
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="display"
        style={{ fontSize: 36, lineHeight: 1, color: "var(--text-strong)" }}
      >
        {value}
      </span>
    </div>
  );
}

function BehaviorCard({
  label,
  count,
  total,
  color,
  hint,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  hint: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      style={{
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: `${color}08`,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="display" style={{ fontSize: 36, lineHeight: 1, color }}>
          {count}
        </span>
        <span style={{ fontSize: 13, color: "rgba(var(--fg),0.45)" }}>
          {pct}%
        </span>
      </div>
      <span style={{ fontSize: 12, color: "rgba(var(--fg),0.45)", lineHeight: 1.4 }}>
        {hint}
      </span>
    </div>
  );
}
