import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
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
      {!err && !missingMigration && (
        <EntityListView
          items={offers.map<EntityListItem>((o) => ({
            id: o.id,
            href: `/pricing/${o.id}`,
            trash: { type: "pricing", id: o.id, name: o.name },
            title: o.name,
            description: o.description,
            createdAt: o.created_at,
            runs: o.run_count,
            users: o.user_count,
            stats: [
              { label: "Runs", value: o.run_count },
              { label: "Perfiles", value: o.user_count },
              {
                label: o.price_count === 1 ? "Precio" : "Precios",
                value: `${o.price_count} ${o.currency}`,
              },
            ],
          }))}
          emptyHint="Aún no hay ofertas. Crea la primera."
          noMatchHint="Ninguna oferta coincide con la búsqueda."
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
        background: "rgba(var(--fg),0.02)",
        color: "rgba(var(--fg),0.85)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
