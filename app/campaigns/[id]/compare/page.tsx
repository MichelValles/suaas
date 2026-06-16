import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import {
  CompareCard,
  DeltaBar,
  fmtComparePct,
  pickCompareWinner,
} from "@/components/compare-blocks";
import { getCampaignWithTrashed } from "@/lib/campaigns";
import {
  listCampaignResponses,
  summarizeCampaignResponses,
} from "@/lib/experiments/campaign";
import { listRunsByCampaign, type Run } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function runProfileIds(run: Run): string[] {
  return (run.params?.profileIds as string[] | undefined) ?? [];
}

export default async function CampaignComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION · Campañas" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  // Vista de análisis histórico: la campaña se carga aunque esté en papelera.
  const campaign = await getCampaignWithTrashed(id);
  if (!campaign) notFound();

  const runs = (await listRunsByCampaign(id)).filter((r) => r.status === "done");
  if (runs.length < 2) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="ACCELERATION · Campañas"
          title="Hacen falta al menos 2 runs completados para comparar."
          actions={
            <Link href={`/campaigns/${campaign.id}`} className="btn-pill">
              Volver a la campaña
            </Link>
          }
        />
      </AppShell>
    );
  }

  // a = run base (más antiguo de los dos por defecto), b = run a comparar
  // (el más reciente). listRunsByCampaign devuelve descendente.
  const { a: aParam, b: bParam } = await searchParams;
  const runB = runs.find((r) => r.id === bParam) ?? runs[0];
  const runA =
    runs.find((r) => r.id === aParam && r.id !== runB.id) ??
    runs.find((r) => r.id !== runB.id) ??
    runs[1];

  const [respA, respB] = await Promise.all([
    listCampaignResponses(runA.id),
    listCampaignResponses(runB.id),
  ]);
  const idsA = runProfileIds(runA);
  const idsB = runProfileIds(runB);
  const sumA = summarizeCampaignResponses(campaign, idsA.length, respA);
  const sumB = summarizeCampaignResponses(campaign, idsB.length, respB);

  const sameSample =
    idsA.length === idsB.length &&
    new Set([...idsA, ...idsB]).size === idsA.length;

  const winner = pickCompareWinner(sumA.mean_intent_to_click, sumB.mean_intent_to_click);

  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCELERATION · Campañas"
        title="Comparativa"
        actions={
          <Link href={`/campaigns/${campaign.id}`} className="btn-pill">
            Volver a la campaña
          </Link>
        }
      />

      {/* Selector de runs (form GET, sin JS) */}
      <form
        method="get"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <RunSelect name="a" label="Run base" runs={runs} selected={runA.id} />
        <RunSelect name="b" label="Run a comparar" runs={runs} selected={runB.id} />
        <button type="submit" className="btn-pill" style={{ fontSize: 12 }}>
          Comparar
        </button>
      </form>

      {!sameSample && (
        <div
          style={{
            padding: 16,
            border: "1px solid var(--warning-text)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.03)",
            color: "rgba(var(--fg),0.85)",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "var(--warning-text)" }}>Muestras distintas.</strong>{" "}
          Los dos runs no usaron los mismos perfiles, así que parte de la diferencia
          puede deberse a la muestra y no al anuncio. Para iterar con rigor usa
          «Repetir con esta muestra» desde el run base.
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 28,
        }}
      >
        <CompareCard
          variantLabel={`Run base · ${formatDate(runA.created_at)}`}
          title={`${sumA.n_responses} respuestas`}
          subtitle={`${idsA.length || sumA.n_profiles} perfiles`}
          metrics={[
            { label: "Intent", value: fmtComparePct(sumA.mean_intent_to_click) },
            { label: "Claridad", value: fmtComparePct(sumA.mean_clarity) },
            { label: "Credib.", value: fmtComparePct(sumA.mean_credibility) },
            { label: "Match", value: fmtComparePct(sumA.mean_landing_match) },
          ]}
          detailHref={`/experiments/campaign/${runA.id}`}
          winner={winner === "A"}
        />
        <CompareCard
          variantLabel={`Run comparado · ${formatDate(runB.created_at)}`}
          title={`${sumB.n_responses} respuestas`}
          subtitle={`${idsB.length || sumB.n_profiles} perfiles`}
          metrics={[
            { label: "Intent", value: fmtComparePct(sumB.mean_intent_to_click) },
            { label: "Claridad", value: fmtComparePct(sumB.mean_clarity) },
            { label: "Credib.", value: fmtComparePct(sumB.mean_credibility) },
            { label: "Match", value: fmtComparePct(sumB.mean_landing_match) },
          ]}
          detailHref={`/experiments/campaign/${runB.id}`}
          winner={winner === "B"}
        />
      </section>

      <DeltaBar
        labelA={`Base · ${formatDate(runA.created_at)}`}
        labelB={`Comparado · ${formatDate(runB.created_at)}`}
        valueA={sumA.mean_intent_to_click}
        valueB={sumB.mean_intent_to_click}
        title="Intent to click medio"
      />
      <DeltaBar
        labelA={`Base · ${formatDate(runA.created_at)}`}
        labelB={`Comparado · ${formatDate(runB.created_at)}`}
        valueA={sumA.mean_clarity}
        valueB={sumB.mean_clarity}
        title="Claridad"
      />
      <DeltaBar
        labelA={`Base · ${formatDate(runA.created_at)}`}
        labelB={`Comparado · ${formatDate(runB.created_at)}`}
        valueA={sumA.mean_credibility}
        valueB={sumB.mean_credibility}
        title="Credibilidad"
      />
      <DeltaBar
        labelA={`Base · ${formatDate(runA.created_at)}`}
        labelB={`Comparado · ${formatDate(runB.created_at)}`}
        valueA={sumA.mean_landing_match ?? 0}
        valueB={sumB.mean_landing_match ?? 0}
        title="Match landing"
      />
    </AppShell>
  );
}

function RunSelect({
  name,
  label,
  runs,
  selected,
}: {
  name: string;
  label: string;
  runs: Run[];
  selected: string;
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
        name={name}
        defaultValue={selected}
        style={{
          background: "rgba(var(--fg),0.03)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "9px 12px",
          color: "var(--text-strong)",
          fontSize: 13,
          fontFamily: "var(--font-sans)",
        }}
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {formatDate(r.created_at)} · {runProfileIds(r).length || "?"} perfiles
          </option>
        ))}
      </select>
    </label>
  );
}
