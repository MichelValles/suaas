import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getAbTest, listAbTestRuns } from "@/lib/ab";
import {
  listFiveSecondResponses,
  summarizeResponses,
} from "@/lib/experiments/five-second";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getTarget } from "@/lib/targets";

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
  const ab = await getAbTest(abTestId);
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
            <Link href={`/ab/${ab.id}`} className="btn-pill">
              Volver al A/B
            </Link>
          }
        />
      </AppShell>
    );
  }

  const [targetA, targetB, respA, respB] = await Promise.all([
    getTarget(ab.target_a_id),
    getTarget(ab.target_b_id),
    listFiveSecondResponses(lastA.run_id),
    listFiveSecondResponses(lastB.run_id),
  ]);
  if (!targetA || !targetB) notFound();

  const sumA = summarizeResponses(respA);
  const sumB = summarizeResponses(respB);

  return (
    <AppShell>
      <PageHeading
        eyebrow={`A/B · ${ab.name}`}
        title="Comparativa por variante."
        description={ab.hypothesis ?? undefined}
        actions={
          <Link href={`/ab/${ab.id}`} className="btn-pill">
            Volver al A/B
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
        <VariantBlock
          variant="A"
          name={targetA.name}
          promise={targetA.payload.main_promise}
          clarity={sumA.mean_clarity}
          comprehension={sumA.mean_comprehension}
          n={sumA.n}
          runId={lastA.run_id}
          winner={pickWinner(sumA, sumB) === "A"}
        />
        <VariantBlock
          variant="B"
          name={targetB.name}
          promise={targetB.payload.main_promise}
          clarity={sumB.mean_clarity}
          comprehension={sumB.mean_comprehension}
          n={sumB.n}
          runId={lastB.run_id}
          winner={pickWinner(sumA, sumB) === "B"}
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

function pickWinner(
  a: { mean_comprehension: number | null; mean_clarity: number },
  b: { mean_comprehension: number | null; mean_clarity: number },
): "A" | "B" | "tie" {
  const ka = (a.mean_comprehension ?? a.mean_clarity);
  const kb = (b.mean_comprehension ?? b.mean_clarity);
  if (Math.abs(ka - kb) < 0.02) return "tie";
  return ka > kb ? "A" : "B";
}

function VariantBlock({
  variant,
  name,
  promise,
  clarity,
  comprehension,
  n,
  runId,
  winner,
}: {
  variant: "A" | "B";
  name: string;
  promise: string;
  clarity: number;
  comprehension: number | null;
  n: number;
  runId: string;
  winner: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${winner ? "var(--accent-500)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "var(--radius-md)",
        padding: "28px 32px",
        background: winner ? "rgba(250,204,13,0.06)" : "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Variante {variant}
        </span>
        {winner && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--accent-500)",
            }}
          >
            ★ Ganadora
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 26,
            color: "#fff",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {name}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>
          {promise}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: 28,
          paddingTop: 6,
          paddingBottom: 4,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          marginTop: 4,
        }}
      >
        <Metric label="Compr." value={fmtPct(comprehension)} />
        <Metric label="Claridad" value={fmtPct(clarity)} />
        <Metric label="N" value={String(n)} />
      </div>
      <Link
        href={`/experiments/five-second/${runId}`}
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
          marginTop: 4,
        }}
      >
        Detalle del run →
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 26,
          color: "#fff",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DeltaBar({
  labelA,
  labelB,
  valueA,
  valueB,
  title,
}: {
  labelA: string;
  labelB: string;
  valueA: number;
  valueB: number;
  title: string;
}) {
  const max = Math.max(valueA, valueB, 0.01);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--accent-500)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <Bar label={labelA} value={valueA} max={max} />
      <Bar label={labelB} value={valueB} max={max} />
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 50px", gap: 12, alignItems: "center" }}>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{label}</span>
      <div
        style={{
          height: 10,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / max) * 100}%`,
            height: "100%",
            background: "var(--accent-500)",
          }}
        />
      </div>
      <span className="mono" style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
        {fmtPct(value)}
      </span>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 100)}%`;
}
