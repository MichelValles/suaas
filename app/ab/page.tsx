import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityCard } from "@/components/entity-card";
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
      {!err && !missingMigration && tests.length === 0 && (
        <Notice>Todavía no hay A/B tests. Crea el primero.</Notice>
      )}
      {!err && !missingMigration && tests.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {tests.map((t) => (
            <EntityCard
              key={t.id}
              href={`/ab/${t.id}`}
              trash={{ type: "ab", id: t.id, name: t.name }}
              eyebrow="A/B · 2 variantes"
              title={t.name}
              description={t.hypothesis}
              createdAt={t.created_at}
              stats={[
                { label: "Runs", value: t.run_count },
                { label: "Perfiles", value: t.user_count },
              ]}
            />
          ))}
        </ul>
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
