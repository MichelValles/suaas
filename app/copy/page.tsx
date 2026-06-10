import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
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
      {!err && !missingMigration && (
        <EntityListView
          items={decks.map<EntityListItem>((d) => ({
            id: d.id,
            href: `/copy/${d.id}`,
            trash: { type: "copy", id: d.id, name: d.name },
            title: d.name,
            description: d.description ?? d.context ?? null,
            createdAt: d.created_at,
            runs: d.run_count,
            users: d.user_count,
            stats: [
              { label: "Runs", value: d.run_count },
              { label: "Perfiles", value: d.user_count },
              {
                label: d.block_count === 1 ? "Versión" : "Versiones",
                value: d.block_count,
              },
            ],
          }))}
          emptyHint="Todavía no hay decks. Crea el primero."
          noMatchHint="Ningún deck coincide con la búsqueda."
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
        background: "rgba(var(--fg),0.02)",
        color: "rgba(var(--fg),0.85)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
