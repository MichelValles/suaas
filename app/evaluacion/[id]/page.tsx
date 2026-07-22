import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getEval } from "@/lib/eval";
import { AggCard, modelShort, ModelResultDetail, SectionLabel } from "../eval-views";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gravity · Evaluación guardada" };

export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getEval(id);
  if (!ev) notFound();

  const agg = {
    role_fidelity: ev.role_fidelity ?? 0,
    grounding: ev.grounding ?? 0,
    non_sycophancy: ev.non_sycophancy ?? 0,
    naturalness: ev.naturalness ?? 0,
    overall: ev.overall ?? 0,
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA"
        title="Evaluación guardada"
        description={`${fmtDate(ev.created_at)} · versión ${ev.app_version ?? "?"} · juez ${modelShort(ev.judge)} · ${ev.n_cases} casos`}
        actions={
          <Link href="/evaluacion" className="btn-pill">
            Volver
          </Link>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionLabel>Resumen</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <AggCard model={ev.model} agg={agg} />
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionLabel>Detalle por caso</SectionLabel>
          <ModelResultDetail result={{ model: ev.model, cases: ev.cases, aggregate: agg }} />
        </section>
      </div>
    </AppShell>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
