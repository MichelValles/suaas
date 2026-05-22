import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listPricingOffers } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PricingListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Pricing" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  let offers: Awaited<ReturnType<typeof listPricingOffers>> = [];
  let err: string | null = null;
  try {
    offers = await listPricingOffers();
  } catch (e) {
    err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Pricing · elasticidad por precio"
        title="Cómo reacciona el público a diferentes niveles."
        description="Cada oferta tiene una descripción común y 2..8 precios candidatos. Los perfiles deciden por cada precio si comprarían, su WTP y el valor percibido."
        actions={
          <Link href="/pricing/new" className="btn-pill solid">
            Crear oferta
          </Link>
        }
      />
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && offers.length === 0 && (
        <Notice>Aún no hay ofertas. Crea la primera.</Notice>
      )}
      {!err && offers.length > 0 && (
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
          {offers.map((o) => (
            <li key={o.id}>
              <Link
                href={`/pricing/${o.id}`}
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
                  {o.price_count} {o.price_count === 1 ? "precio" : "precios"} · {o.currency}
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
                  {o.name}
                </h2>
                {o.description && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      fontSize: 13,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {o.description}
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
