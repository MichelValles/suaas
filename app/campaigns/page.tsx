import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { MigrationNeeded } from "@/components/migration-needed";
import { CHANNEL_LABEL, listCampaigns } from "@/lib/campaigns";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CampaignsListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Campañas" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  let err: string | null = null;
  let missingMigration = false;
  try {
    campaigns = await listCampaigns();
  } catch (e) {
    if (isMissingTableError(e)) missingMigration = true;
    else err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Campañas · Paid Search tester"
        title="Cómo reaccionan los perfiles a tu anuncio bajo cada query."
        description="Cada campaña reúne titulares, descripciones, landing y creatividades de un anuncio RSA. Los perfiles lo evalúan bajo varias queries objetivo: intent-to-click, claridad, credibilidad, diferenciación y su versión ideal en su voz."
        actions={
          <Link href="/campaigns/new" className="btn-pill solid">
            Crear campaña
          </Link>
        }
      />
      {missingMigration && (
        <MigrationNeeded
          migration="0008_campaigns.sql"
          feature="Campañas"
          details="Crea las tablas campaigns y campaign_responses y la columna runs.campaign_id."
        />
      )}
      {err && <Notice tone="error">Error: {err}</Notice>}
      {!err && !missingMigration && (
        <EntityListView
          items={campaigns.map<EntityListItem>((c) => ({
            id: c.id,
            href: `/campaigns/${c.id}`,
            trash: { type: "campaign", id: c.id, name: c.name },
            title: c.name,
            description: c.brief ?? null,
            createdAt: c.created_at,
            runs: c.run_count,
            users: c.user_count,
            stats: [
              {
                label: c.channels.length === 1 ? "Canal" : "Canales",
                value:
                  c.channels.length <= 2
                    ? c.channels.map((ch) => CHANNEL_LABEL[ch].split(" ")[0]).join(" + ")
                    : `${c.channels.length} redes`,
              },
              { label: "Runs", value: c.run_count },
              { label: "Perfiles", value: c.user_count },
              { label: "Titulares", value: c.headlines.length },
            ],
          }))}
          emptyHint="Todavía no hay campañas. Crea la primera."
          noMatchHint="Ninguna campaña coincide con la búsqueda."
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
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
