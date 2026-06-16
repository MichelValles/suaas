import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { MigrationNeeded } from "@/components/migration-needed";
import { listBrandsWithCounts } from "@/lib/cerebro";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CerebroPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="KNOWLEDGE" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }

  let brands: Awaited<ReturnType<typeof listBrandsWithCounts>> = [];
  let err: string | null = null;
  let missingMigration = false;
  try {
    brands = await listBrandsWithCounts();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="KNOWLEDGE"
        title="Cerebro"
        actions={
          <Link href="/cerebro/new" className="btn-pill solid">
            Crear marca
          </Link>
        }
      />
      {missingMigration && (
        <MigrationNeeded
          migration="0025_cerebro.sql"
          feature="Cerebro"
          details="Crea las tablas brands y brand_documents."
        />
      )}
      {err && (
        <div
          style={{
            padding: 24,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
            color: "rgba(var(--fg),0.85)",
            lineHeight: 1.6,
          }}
        >
          Error: {err}
        </div>
      )}
      {!err && !missingMigration && (
        <EntityListView
          items={brands.map<EntityListItem>((b) => ({
            id: b.id,
            href: `/cerebro/${b.id}`,
            trash: { type: "brand", id: b.id, name: b.name },
            title: b.name,
            description: b.description ?? null,
            createdAt: b.created_at,
            runs: 0,
            users: 0,
            stats: [
              {
                label: b.doc_count === 1 ? "Documento" : "Documentos",
                value: b.doc_count,
              },
            ],
          }))}
          emptyHint="Todavía no hay marcas. Crea la primera para reutilizar su información en los módulos."
          noMatchHint="Ninguna marca coincide con la búsqueda."
        />
      )}
    </AppShell>
  );
}
