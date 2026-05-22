import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityCard } from "@/components/entity-card";
import { MigrationNeeded } from "@/components/migration-needed";
import { listCopyDecks } from "@/lib/copy";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CopyListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Copy" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  let decks: Awaited<ReturnType<typeof listCopyDecks>> = [];
  let err: string | null = null;
  let missingMigration = false;
  try {
    decks = await listCopyDecks();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Copy · resonancia de texto"
        title="Cómo reaccionan los perfiles a un copy puro."
        description="Cada deck agrupa 2..10 variantes de texto evaluadas contra el mismo set de perfiles. Resultados por bloque: sentimiento, claridad, persuasión y CTR estimado."
        actions={
          <Link href="/copy/new" className="btn-pill solid">
            Crear deck
          </Link>
        }
      />
      {missingMigration && (
        <MigrationNeeded
          migration="0006_ab_copy_pricing.sql"
          feature="Copy resonance"
          details="Crea las tablas copy_decks, copy_blocks, copy_responses y la columna runs.copy_deck_id."
        />
      )}
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && !missingMigration && decks.length === 0 && (
        <Notice>Todavía no hay decks. Crea el primero.</Notice>
      )}
      {!err && !missingMigration && decks.length > 0 && (
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
          {decks.map((d) => (
            <EntityCard
              key={d.id}
              href={`/copy/${d.id}`}
              trash={{ type: "copy", id: d.id, name: d.name }}
              eyebrow={`${d.block_count} ${d.block_count === 1 ? "versión" : "versiones"}${d.context ? ` · ${d.context}` : ""}`}
              title={d.name}
              description={d.description}
              createdAt={d.created_at}
              stats={[
                { label: "Runs", value: d.run_count },
                { label: "Perfiles", value: d.user_count },
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
