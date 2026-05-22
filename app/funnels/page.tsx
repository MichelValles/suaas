import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityCard } from "@/components/entity-card";
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
        description="Cada embudo es una secuencia de capturas con un objetivo por paso. En la próxima versión podrás lanzar runs que detecten fricción y abandono."
        actions={
          <Link href="/funnels/new" className="btn-pill solid">
            Crear embudo
          </Link>
        }
      />

      {err && <Notice tone="error">Error consultando embudos: {err}</Notice>}

      {!err && funnels.length === 0 && (
        <Notice>
          Todavía no hay embudos. Empieza creando uno desde «Crear embudo».
        </Notice>
      )}

      {!err && funnels.length > 0 && (
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
          {funnels.map((f) => (
            <EntityCard
              key={f.id}
              href={`/funnels/${f.id}`}
              trash={{ type: "funnels", id: f.id, name: f.name }}
              eyebrow={`${f.step_count} ${f.step_count === 1 ? "paso" : "pasos"}`}
              title={f.name}
              description={f.description}
              createdAt={f.created_at}
              stats={[
                { label: "Runs", value: f.run_count },
                { label: "Perfiles", value: f.user_count },
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
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
