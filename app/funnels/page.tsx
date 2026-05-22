import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { isSupabaseConfigured } from "@/lib/supabase";
import { listFunnels } from "@/lib/funnels";

export const dynamic = "force-dynamic";

export default async function FunnelsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Embudos · simulación de recorrido"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel y aplica las migraciones."
        />
      </AppShell>
    );
  }

  let funnels: Awaited<ReturnType<typeof listFunnels>> = [];
  let err: string | null = null;
  try {
    funnels = await listFunnels();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Embudos · simulación de recorrido"
        title="Pantallas encadenadas que un perfil recorre paso a paso."
        actions={
          <Link href="/funnels/new" className="btn-pill solid">
            Crear embudo
          </Link>
        }
      />

      {err && <Notice tone="error">Error consultando embudos: {err}</Notice>}


      {!err && (
        <EntityListView
          items={funnels.map<EntityListItem>((f) => ({
            id: f.id,
            href: `/funnels/${f.id}`,
            trash: { type: "funnels", id: f.id, name: f.name },
            title: f.name,
            description: f.description,
            createdAt: f.created_at,
            runs: f.run_count,
            users: f.user_count,
            stats: [
              { label: "Runs", value: f.run_count },
              { label: "Perfiles", value: f.user_count },
              { label: f.step_count === 1 ? "Paso" : "Pasos", value: f.step_count },
            ],
          }))}
          emptyHint="Todavía no hay embudos. Empieza creando uno desde «Crear embudo»."
          noMatchHint="Ningún embudo coincide con la búsqueda."
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
