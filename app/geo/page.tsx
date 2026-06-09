import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { MigrationNeeded } from "@/components/migration-needed";
import { listGeoAnalyses, type GeoAnalysis } from "@/lib/geo";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando...",
  done: "Completado",
  error: "Error",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(255,255,255,0.45)",
  running: "#facc15",
  done: "#4ade80",
  error: "#f87171",
};

export default async function GeoListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="GEO" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }

  let analyses: GeoAnalysis[] = [];
  let err: string | null = null;
  let missingMigration = false;
  try {
    analyses = await listGeoAnalyses();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="GEO · Generative Engine Optimization"
        title="Visibilidad de tu marca en buscadores con IA."
        description="Simula cómo Perplexity, Google AI Overview o ChatGPT Search describe tu marca ante cada segmento de intención (JTBD). Detecta huecos antes de que los detecte el mercado."
        descriptionVariant="panel"
        actions={
          <Link href="/geo/new" className="btn-pill solid">
            Nuevo análisis
          </Link>
        }
      />

      {missingMigration && (
        <MigrationNeeded
          migration="0015_gravity_model.sql"
          feature="GEO"
          details="Crea la tabla geo_analyses y añade intent_context a profiles."
        />
      )}
      {err && (
        <div
          role="alert"
          style={{
            padding: 16,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 14,
          }}
        >
          Error: {err}
        </div>
      )}

      {!err && !missingMigration && analyses.length === 0 && (
        <div
          style={{
            padding: "48px 32px",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Todavía no hay análisis GEO.{" "}
          <Link href="/geo/new" style={{ color: "var(--accent-400)", textDecoration: "underline" }}>
            Crea el primero.
          </Link>
        </div>
      )}

      {!err && !missingMigration && analyses.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {analyses.map((a) => (
            <GeoCard key={a.id} analysis={a} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function GeoCard({ analysis }: { analysis: GeoAnalysis }) {
  const color = STATUS_COLOR[analysis.status] ?? "rgba(255,255,255,0.45)";
  const segCount = analysis.segments?.length ?? 0;
  const doneCount =
    analysis.results?.filter((r) => r.brand_mentioned !== undefined).length ?? 0;
  const visAvg =
    analysis.results && analysis.results.length > 0
      ? analysis.results.reduce((s, r) => s + r.visibility_score, 0) /
        analysis.results.length
      : null;

  return (
    <Link
      href={`/geo/${analysis.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="surface-feature"
        style={{
          padding: 24,
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          cursor: "pointer",
          transition: "border-color var(--dur-micro)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 18,
              color: "#fff",
              lineHeight: 1.2,
            }}
          >
            {analysis.name}
          </span>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color,
              flexShrink: 0,
            }}
          >
            {STATUS_LABEL[analysis.status] ?? analysis.status}
          </span>
        </div>

        <span
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.4,
          }}
        >
          {analysis.brand_name}
        </span>

        <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
          <Stat label="Segmentos" value={String(segCount)} />
          {analysis.status === "done" && visAvg !== null && (
            <Stat label="Visibilidad media" value={`${Math.round(visAvg * 100)}%`} color={color} />
          )}
          {analysis.status === "running" && (
            <Stat label="Analizados" value={`${doneCount}/${segCount}`} color="#facc15" />
          )}
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 15, color: color ?? "rgba(255,255,255,0.85)", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}
