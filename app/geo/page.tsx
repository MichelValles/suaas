import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { MigrationNeeded } from "@/components/migration-needed";
import { GeoList } from "./geo-list";
import { listGeoAnalyses, type GeoAnalysis } from "@/lib/geo";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function GeoListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION" title="Supabase aún no está conectado." />
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
        eyebrow="ACCELERATION"
        title="GEO Tester"
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
            color: "rgba(var(--fg),0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 14,
          }}
        >
          Error: {err}
        </div>
      )}

      {!err && !missingMigration && <GeoList analyses={analyses} />}
    </AppShell>
  );
}
