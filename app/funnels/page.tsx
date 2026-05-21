import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
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
            <li key={f.id}>
              <Link
                href={`/funnels/${f.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
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
                  {f.step_count} {f.step_count === 1 ? "paso" : "pasos"}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 24,
                    lineHeight: 1.15,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {f.name}
                </h2>
                {f.description && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {f.description}
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
        maxWidth: 720,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
