import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listAbTests } from "@/lib/ab";
import { isSupabaseConfigured } from "@/lib/supabase";

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
  try {
    tests = await listAbTests();
  } catch (e) {
    err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="A/B tests · comparar dos targets"
        title="Enfrenta dos pantallas con el mismo set de perfiles."
        description="Cada A/B test reutiliza dos targets existentes y lanza el test de 5 segundos sobre ambos en paralelo. La página de resultados muestra deltas y ganador."
        actions={
          <Link href="/ab/new" className="btn-pill solid">
            Crear A/B test
          </Link>
        }
      />
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && tests.length === 0 && (
        <Notice>Todavía no hay A/B tests. Crea el primero.</Notice>
      )}
      {!err && tests.length > 0 && (
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
            <li key={t.id}>
              <Link
                href={`/ab/${t.id}`}
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
                  A/B
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
                  {t.name}
                </h2>
                {t.hypothesis && (
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: 0 }}>
                    {t.hypothesis}
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
