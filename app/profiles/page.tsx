import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listProfiles } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Perfiles · usuarios sintéticos"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel del proyecto suaas. Tras instalarlo, vuelve a esta página."
        />
        <Notice>
          Pasos: Vercel dashboard → proyecto suaas → Integrations → Supabase → Add.
          Después aplicar <code>supabase/migrations/0001_initial.sql</code> en el
          SQL editor de Supabase.
        </Notice>
      </AppShell>
    );
  }

  let profiles: Awaited<ReturnType<typeof listProfiles>> = [];
  let err: string | null = null;
  try {
    profiles = await listProfiles();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Perfiles · usuarios sintéticos"
        title="Vignettes grounded para experimentación."
        description="Cada perfil combina demografía, Big Five, barreras COM-B y un backstory. Lo usa el agente como system prompt al simular conversaciones, tests de 5 segundos o embudos."
        actions={
          <Link href="/profiles/new" className="btn-pill solid">
            Crear perfil
          </Link>
        }
      />

      {err && <Notice tone="error">Error consultando perfiles: {err}</Notice>}

      {!err && profiles.length === 0 && (
        <Notice>
          Todavía no hay perfiles. Empieza creando uno desde "Crear perfil".
        </Notice>
      )}

      {!err && profiles.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            maxWidth: 1100,
          }}
        >
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profiles/${p.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  transition: "border-color var(--dur-short) var(--ease-out)",
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
                  {p.demographics.age} · {p.demographics.gender} · {p.demographics.occupation}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: 28,
                    lineHeight: 1.1,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {p.name}
                </h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 14,
                    lineHeight: 1.5,
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.backstory}
                </p>
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
