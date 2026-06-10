import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import {
  CompareCard,
  DeltaBar,
  fmtComparePct,
  pickCompareWinner,
} from "@/components/compare-blocks";
import { getAbTestWithTrashed, listAbTestRuns } from "@/lib/ab";
import {
  listFiveSecondResponses,
  summarizeResponses,
} from "@/lib/experiments/five-second";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTargetWithTrashed } from "@/lib/targets";

export const dynamic = "force-dynamic";

export default async function AbResultsPage({
  params,
}: {
  params: Promise<{ abTestId: string }>;
}) {
  const { abTestId } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Resultados A/B" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  // Vista de resultados históricos: el A/B y sus targets se cargan aunque
  // estén en la papelera. Sólo 404 si ya no existen (hard delete).
  const ab = await getAbTestWithTrashed(abTestId);
  if (!ab) notFound();

  const links = await listAbTestRuns(ab.id);
  // Tomamos el par de runs más reciente (último launch).
  const sorted = [...links].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const lastA = sorted.find((l) => l.variant === "A");
  const lastB = sorted.find((l) => l.variant === "B");

  if (!lastA || !lastB) {
    return (
      <AppShell>
        <PageHeading
          eyebrow={`A/B · ${ab.name}`}
          title="Sin runs comparables todavía."
          actions={
            <Link href={ab.deleted_at ? "/ab" : `/ab/${ab.id}`} className="btn-pill">
              {ab.deleted_at ? "Volver al listado" : "Volver al A/B"}
            </Link>
          }
        />
      </AppShell>
    );
  }

  const [targetA, targetB, respA, respB] = await Promise.all([
    getTargetWithTrashed(ab.target_a_id),
    getTargetWithTrashed(ab.target_b_id),
    listFiveSecondResponses(lastA.run_id),
    listFiveSecondResponses(lastB.run_id),
  ]);
  if (!targetA || !targetB) notFound();

  const sumA = summarizeResponses(respA);
  const sumB = summarizeResponses(respB);
  // Métrica de decisión: comprensión LLM-as-judge, con claridad de respaldo.
  const winner = pickCompareWinner(
    sumA.mean_comprehension ?? sumA.mean_clarity,
    sumB.mean_comprehension ?? sumB.mean_clarity,
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`A/B · ${ab.name}`}
        title="Comparativa por variante."
        description={ab.hypothesis ?? undefined}
        descriptionVariant="panel"
        actions={
          <Link href={ab.deleted_at ? "/ab" : `/ab/${ab.id}`} className="btn-pill">
            {ab.deleted_at ? "Volver al listado" : "Volver al A/B"}
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 28,
        }}
      >
        <CompareCard
          variantLabel="Variante A"
          title={targetA.name}
          subtitle={targetA.payload.main_promise}
          metrics={[
            { label: "Compr.", value: fmtComparePct(sumA.mean_comprehension) },
            { label: "Claridad", value: fmtComparePct(sumA.mean_clarity) },
            { label: "N", value: String(sumA.n) },
          ]}
          detailHref={`/experiments/five-second/${lastA.run_id}`}
          winner={winner === "A"}
        />
        <CompareCard
          variantLabel="Variante B"
          title={targetB.name}
          subtitle={targetB.payload.main_promise}
          metrics={[
            { label: "Compr.", value: fmtComparePct(sumB.mean_comprehension) },
            { label: "Claridad", value: fmtComparePct(sumB.mean_clarity) },
            { label: "N", value: String(sumB.n) },
          ]}
          detailHref={`/experiments/five-second/${lastB.run_id}`}
          winner={winner === "B"}
        />
      </section>

      <DeltaBar
        labelA={`A · ${targetA.name}`}
        labelB={`B · ${targetB.name}`}
        valueA={sumA.mean_comprehension ?? 0}
        valueB={sumB.mean_comprehension ?? 0}
        title="Comprehensión (LLM-as-judge)"
      />
      <DeltaBar
        labelA={`A · ${targetA.name}`}
        labelB={`B · ${targetB.name}`}
        valueA={sumA.mean_clarity}
        valueB={sumB.mean_clarity}
        title="Claridad subjetiva"
      />
    </AppShell>
  );
}
