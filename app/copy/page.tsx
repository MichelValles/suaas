import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
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
            <li key={d.id}>
              <Link
                href={`/copy/${d.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {d.block_count} {d.block_count === 1 ? "bloque" : "bloques"}
                  {d.context ? ` · ${d.context}` : ""}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 22,
                    lineHeight: 1.15,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {d.name}
                </h2>
                {d.description && (
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: 0 }}>
                    {d.description}
                  </p>
                )}
              </Link>
            </li>
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
