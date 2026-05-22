import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listTargets } from "@/lib/targets";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Claridad 5s · qué se evalúa"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel y aplica las migraciones."
        />
      </AppShell>
    );
  }

  let targets: Awaited<ReturnType<typeof listTargets>> = [];
  let err: string | null = null;
  try {
    targets = await listTargets();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Targets · qué se evalúa"
        title="Pantallas que ponemos delante de los usuarios sintéticos."
        actions={
          <Link href="/targets/new" className="btn-pill solid">
            Nuevo test
          </Link>
        }
      />

      {err && <Notice tone="error">Error consultando tests: {err}</Notice>}

      {!err && (
        <EntityListView
          minCardWidth={300}
          items={targets.map<EntityListItem>((t) => ({
            id: t.id,
            href: `/targets/${t.id}`,
            trash: { type: "targets", id: t.id, name: t.name },
            title: t.name,
            description: t.payload.main_promise,
            createdAt: t.created_at,
            runs: t.run_count,
            users: t.user_count,
            media: { src: t.payload.image_url, alt: t.name },
            stats: [
              { label: "Runs", value: t.run_count },
              { label: "Perfiles", value: t.user_count },
              { label: "Tipo", value: t.kind === "5s_test" ? "5 s" : t.kind },
            ],
          }))}
          emptyHint="Todavía no hay tests de claridad. Empieza creando uno desde «Nuevo test»."
          noMatchHint="Ningún test coincide con la búsqueda."
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
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
