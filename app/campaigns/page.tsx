import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { CHANNEL_BRAND, ChannelIcon } from "@/components/channel-icon";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import { MigrationNeeded } from "@/components/migration-needed";
import { StrategyIcon } from "@/components/strategy-icon";
import {
  CHANNEL_LABEL,
  STRATEGY_LABEL,
  listCampaigns,
  type Campaign,
} from "@/lib/campaigns";
import { isMissingTableError, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function CampaignsListPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION" title="Supabase aún no está conectado." />
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
        eyebrow="ACCELERATION"
        title="Campañas"
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
            badges: <CampaignBadges campaign={c} />,
            dateInFooter: true,
            searchExtra: [
              ...c.channels.map((ch) => CHANNEL_LABEL[ch]),
              STRATEGY_LABEL[c.strategy],
            ].join(" "),
            stats: [{ label: "Runs", value: c.run_count }],
          }))}
          emptyHint="Todavía no hay campañas. Crea la primera."
          noMatchHint="Ninguna campaña coincide con la búsqueda."
        />
      )}
    </AppShell>
  );
}

/**
 * Chips de cabecera de la card: canal(es) con su logo en el color de marca
 * de cada red (CHANNEL_BRAND) y estrategia en chip neutro del tema.
 */
function CampaignBadges({ campaign }: { campaign: Campaign }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {campaign.channels.map((ch) => {
        const brand = CHANNEL_BRAND[ch];
        return (
          <span
            key={ch}
            className="mono"
            style={
              brand
                ? {
                    ...badgeStyle,
                    border: `1px solid ${brand.color}`,
                    background: brand.bg,
                    color: brand.color,
                  }
                : badgeStyle
            }
          >
            <ChannelIcon channel={ch} size={12} />
            {CHANNEL_LABEL[ch].split(" ")[0]}
          </span>
        );
      })}
      <span className="mono" style={badgeStyle}>
        <StrategyIcon strategy={campaign.strategy} size={12} />
        {STRATEGY_LABEL[campaign.strategy]}
      </span>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid rgba(var(--fg),0.18)",
  background: "rgba(var(--fg),0.04)",
  color: "rgba(var(--fg),0.85)",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

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
