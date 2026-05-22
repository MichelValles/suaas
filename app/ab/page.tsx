import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { MigrationNeeded } from "@/components/migration-needed";
import { listAbTests } from "@/lib/ab";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AbListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="A/B tests" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  let tests: Awaited<ReturnType<typeof listAbTests>> = [];
  let err: string | null = null;
  let missingMigration = false;
  try {
    tests = await listAbTests();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="A/B tests · comparar dos tests de claridad"
        title="Enfrenta dos pantallas con el mismo set de perfiles."
        description="Cada A/B test reutiliza dos tests de claridad existentes y lanza el experimento sobre ambos en paralelo. La página de resultados muestra deltas y ganador."
        actions={
          <Link href="/ab/new" className="btn-pill solid">
            Crear A/B test
          </Link>
        }
      />
      {missingMigration && (
        <MigrationNeeded
          migration="0006_ab_copy_pricing.sql"
          feature="A/B tests"
          details="Crea las tablas ab_tests y ab_test_runs y la columna runs.ab_test_id."
        />
      )}
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && !missingMigration && (
        <EntityListView
          items={tests.map<EntityListItem>((t) => ({
            id: t.id,
            href: `/ab/${t.id}`,
            trash: { type: "ab", id: t.id, name: t.name },
            title: t.name,
            description: t.hypothesis,
            createdAt: t.created_at,
            runs: t.run_count,
            users: t.user_count,
            stats: [
              { label: "Runs", value: t.run_count },
              { label: "Perfiles", value: t.user_count },
              { label: "Variantes", value: 2 },
            ],
          }))}
          emptyHint="Todavía no hay A/B tests. Crea el primero."
          noMatchHint="Ningún A/B test coincide con la búsqueda."
        />
      )}
    </AppShell>
  );
}

function Notice({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "error";
}) {
  const color = tone === "error" ? "var(--error-500)" : "var(--accent-500)";
  return (
    <div
      style={{
        padding: 24,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        color: "rgba(255,255,255,0.85)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
