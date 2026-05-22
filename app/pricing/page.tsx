import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityCard } from "@/components/entity-card";
import { MigrationNeeded } from "@/components/migration-needed";
import { listPricingOffers } from "@/lib/pricing";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

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
  let missingMigration = false;
  try {
    offers = await listPricingOffers();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
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
      {missingMigration && (
        <MigrationNeeded
          migration="0006_ab_copy_pricing.sql"
          feature="Pricing"
          details="Crea las tablas pricing_offers, pricing_prices, pricing_responses y la columna runs.pricing_offer_id."
        />
      )}
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && !missingMigration && offers.length === 0 && (
        <Notice>Aún no hay ofertas. Crea la primera.</Notice>
      )}
      {!err && !missingMigration && offers.length > 0 && (
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
            <EntityCard
              key={o.id}
              href={`/pricing/${o.id}`}
              trash={{ type: "pricing", id: o.id, name: o.name }}
              eyebrow={`${o.price_count} ${o.price_count === 1 ? "precio" : "precios"} · ${o.currency}`}
              title={o.name}
              description={o.description}
              createdAt={o.created_at}
              stats={[
                { label: "Runs", value: o.run_count },
                { label: "Perfiles", value: o.user_count },
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
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
