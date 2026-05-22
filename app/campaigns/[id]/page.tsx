import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ChannelIcon } from "@/components/channel-icon";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { RunsPreviousGrid } from "@/components/runs-previous";
import { CHANNEL_LABEL, getCampaign, type Creative } from "@/lib/campaigns";
import { listProfiles } from "@/lib/profiles";
import { getMetricsForRun, listRunsByCampaign } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

function creativeKindLabel(kind: Creative["kind"]): string {
  switch (kind) {
    case "youtube":
      return "YouTube";
    case "video":
      return "Vídeo";
    default:
      return "Imagen";
  }
}

function CreativeRender({ creative, index }: { creative: Creative; index: number }) {
  const alt = creative.label ?? `Creatividad ${index + 1}`;
  if (creative.kind === "youtube" && creative.youtube_id) {
    return (
      <iframe
        title={alt}
        src={`https://www.youtube.com/embed/${creative.youtube_id}`}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          border: 0,
          borderRadius: "var(--radius-sm)",
        }}
      />
    );
  }
  if (creative.kind === "video") {
    /* eslint-disable-next-line jsx-a11y/media-has-caption */
    return (
      <video
        src={creative.url}
        controls
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          background: "rgba(0,0,0,0.4)",
        }}
      />
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return (
    <img
      src={creative.url}
      alt={alt}
      style={{
        width: "100%",
        height: 140,
        objectFit: "cover",
        borderRadius: "var(--radius-sm)",
        display: "block",
      }}
    />
  );
}

export const dynamic = "force-dynamic";

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Campaña" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const [profiles, runs] = await Promise.all([
    listProfiles(),
    listRunsByCampaign(id),
  ]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Campaña · ${campaign.queries.length} ${campaign.queries.length === 1 ? "query" : "queries"} · ${campaign.headlines.length} titulares`}
        title={campaign.name}
        description={campaign.brief ?? undefined}
        descriptionVariant="panel"
        actions={
          <Link href="/campaigns" className="btn-pill">
            Volver
          </Link>
        }
      />

      {/* Canales */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>
          Canales · {campaign.channels.length}
        </SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {campaign.channels.map((ch) => (
            <span
              key={ch}
              className="mono"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <ChannelIcon channel={ch} size={14} />
              {CHANNEL_LABEL[ch]}
            </span>
          ))}
        </div>
      </section>

      {/* Vista tipo SERP: el primer titular + primera descripción como snippet representativo. */}
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
          padding: "26px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Vista previa · primer titular
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        >
          Anuncio · {displayUrl(campaign.final_url)}
        </span>
        <p
          style={{
            color: "rgba(132, 192, 255, 0.95)",
            fontSize: 20,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {campaign.headlines[0]}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.78)",
            fontSize: 14,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {campaign.descriptions[0]}
        </p>
      </section>

      {/* Queries */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Queries objetivo</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {campaign.queries.map((q) => (
            <span
              key={q}
              className="mono"
              style={{
                padding: "6px 12px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "var(--radius-pill)",
                fontSize: 12,
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.85)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {q}
            </span>
          ))}
        </div>
      </section>

      {/* Headlines */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Titulares · {campaign.headlines.length}</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {campaign.headlines.map((h, i) => (
            <div key={i} style={cardStyle}>
              <span className="mono" style={chipMonoStyle}>
                H{i + 1} · {h.length}/30
              </span>
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.4 }}>
                {h}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Descriptions */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Descripciones · {campaign.descriptions.length}</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {campaign.descriptions.map((d, i) => (
            <div key={i} style={cardStyle}>
              <span className="mono" style={chipMonoStyle}>
                D{i + 1} · {d.length}/90
              </span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.55 }}>
                {d}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Creatividades */}
      {campaign.creatives.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Creatividades · {campaign.creatives.length}</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {campaign.creatives.map((c, i) => (
              <div key={i} style={{ ...cardStyle, padding: 12 }}>
                <CreativeRender creative={c} index={i} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="mono" style={chipMonoStyle}>
                    {creativeKindLabel(c.kind)}
                  </span>
                  {c.label && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {c.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Landing */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Landing</SectionLabel>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.02)",
            padding: 16,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 12,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.landing_image_url}
            alt="Landing"
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: "var(--radius-sm)",
              display: "block",
            }}
          />
          <a
            href={campaign.final_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{
              color: "var(--accent-500)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              wordBreak: "break-all",
            }}
          >
            {campaign.final_url} →
          </a>
        </div>
      </section>

      <RunsPreviousGrid
        runs={runsWithMetrics}
        resultsBase="/experiments/campaign"
        emptyHint="Sin runs todavía. Lanza el primer test desde el panel de abajo."
        metrics={[
          { key: "mean_intent_to_click", label: "Intent click medio" },
          { key: "click_rate", label: "Tasa click" },
          { key: "mean_landing_match", label: "Match landing" },
        ]}
      />

      <ProfileLaunchPanel
        title="Lanzar campaign test"
        endpoint="/api/runs/campaign"
        extraBody={{ campaignId: campaign.id }}
        progressLabel={`Cada perfil evaluará el anuncio bajo ${campaign.channels.length} ${campaign.channels.length === 1 ? "canal" : "canales"} × ${campaign.queries.length} ${campaign.queries.length === 1 ? "query" : "queries"} (snippet + landing condicional + versión ideal). Estimado ~${Math.ceil(campaign.channels.length * campaign.queries.length * 18)}s por perfil.`}
        kind="campaign"
        profiles={profiles}
      />
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        color: "var(--accent-500)",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "var(--radius-md)",
  background: "rgba(255,255,255,0.02)",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const chipMonoStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--accent-500)",
};
