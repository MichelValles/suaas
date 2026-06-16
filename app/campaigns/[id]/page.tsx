import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ChannelIcon } from "@/components/channel-icon";
import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import { RunsPreviousGrid } from "@/components/runs-previous";
import { StrategyIcon } from "@/components/strategy-icon";
import {
  CHANNEL_LABEL,
  META_OBJECTIVE_LABEL,
  META_PLACEMENT_LABEL,
  STRATEGY_LABEL,
  TIKTOK_OBJECTIVE_LABEL,
  getCampaign,
  isMetaStrategy,
  isTikTokStrategy,
  metaSpecOf,
  tiktokSpecOf,
  type Creative,
} from "@/lib/campaigns";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ profiles?: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION · Campañas" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const metaSpec = metaSpecOf(campaign);
  const tiktokSpec = tiktokSpecOf(campaign);
  const [profiles, runs] = await Promise.all([
    listProfiles(),
    listRunsByCampaign(id),
  ]);
  const runsWithMetrics = await Promise.all(
    runs.map(async (r) => ({ run: r, metrics: await getMetricsForRun(r.id) })),
  );

  // ?profiles=id1,id2 («Repetir con esta muestra» desde un run previo):
  // preselecciona esos perfiles en el panel de lanzamiento. Se filtra contra
  // los perfiles vivos por si alguno fue borrado desde aquel run.
  const { profiles: profilesParam } = await searchParams;
  const aliveIds = new Set(profiles.map((p) => p.id));
  const initialSelected = (profilesParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((pid) => aliveIds.has(pid));

  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCELERATION · Campañas"
        title={campaign.name}
        description={campaign.brief ?? undefined}
        descriptionVariant="panel"
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {runs.filter((r) => r.status === "done").length >= 2 && (
              <Link
                href={`/campaigns/${campaign.id}/compare`}
                className="btn-pill"
                title="Compara los dos últimos runs completados, métrica a métrica"
              >
                Comparar runs
              </Link>
            )}
            <Link href={`/campaigns/new?from=${campaign.id}`} className="btn-pill">
              Duplicar
            </Link>
            <Link href="/campaigns" className="btn-pill">
              Volver
            </Link>
          </div>
        }
      />

      {/* Canales y estrategia */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Canal y estrategia</SectionLabel>
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
                border: "1px solid rgba(var(--fg),0.18)",
                background: "rgba(var(--fg),0.04)",
                color: "rgba(var(--fg),0.85)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <ChannelIcon channel={ch} size={14} />
              {CHANNEL_LABEL[ch]}
            </span>
          ))}
          <span
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--accent-500)",
              background: "rgba(250,204,13,0.08)",
              color: "var(--accent-text)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            <StrategyIcon strategy={campaign.strategy} size={14} />
            {STRATEGY_LABEL[campaign.strategy]}
          </span>
          {isMetaStrategy(campaign.strategy) && metaSpec && (
            <>
              <span className="mono" style={metaChipStyle}>
                Objetivo · {META_OBJECTIVE_LABEL[metaSpec.objective]}
              </span>
              <span className="mono" style={metaChipStyle}>
                {META_PLACEMENT_LABEL[metaSpec.placement]}
              </span>
            </>
          )}
          {isTikTokStrategy(campaign.strategy) && tiktokSpec && (
            <>
              <span className="mono" style={metaChipStyle}>
                Objetivo · {TIKTOK_OBJECTIVE_LABEL[tiktokSpec.objective]}
              </span>
              <span className="mono" style={metaChipStyle}>
                Feed «Para ti»
              </span>
            </>
          )}
        </div>
      </section>

      {/* Identidad y textos del anuncio (solo TikTok) */}
      {isTikTokStrategy(campaign.strategy) && tiktokSpec && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Anuncio de TikTok</SectionLabel>
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {campaign.company_name && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Nombre visible · {campaign.company_name.length}/40
                  {campaign.company_name.length > 20 ? " · en pantalla se ven ~20" : ""}
                </span>
                <p style={{ color: "rgba(var(--fg),0.9)", fontSize: 18, margin: "4px 0 0" }}>
                  {campaign.company_name}
                </p>
              </div>
            )}
            {tiktokSpec.identity_handle && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Usuario
                </span>
                <p
                  style={{
                    color: "rgba(var(--fg),0.7)",
                    fontSize: 13,
                    margin: "4px 0 0",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  @{tiktokSpec.identity_handle}
                </p>
              </div>
            )}
            {tiktokSpec.music_name && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Música
                </span>
                <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, margin: "4px 0 0" }}>
                  ♫ {tiktokSpec.music_name}
                </p>
              </div>
            )}
            {campaign.cta && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  CTA
                </span>
                <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, margin: "4px 0 0" }}>
                  [{campaign.cta}]
                </p>
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {tiktokSpec.ad_texts.map((t, i) => (
              <div key={i} style={cardStyle}>
                <span className="mono" style={chipMonoStyle}>
                  Texto del anuncio {i + 1} · {t.length}c
                  {t.length > 80 ? " · se trunca con «más»" : ""}
                </span>
                <span style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, lineHeight: 1.55 }}>
                  {t}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Identidad y textos principales (solo Meta) */}
      {isMetaStrategy(campaign.strategy) && metaSpec && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Anuncio de Meta</SectionLabel>
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {campaign.company_name && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Página · {campaign.company_name.length}/75
                </span>
                <p style={{ color: "rgba(var(--fg),0.9)", fontSize: 18, margin: "4px 0 0" }}>
                  {campaign.company_name}
                </p>
              </div>
            )}
            {metaSpec.display_link && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Enlace visible
                </span>
                <p
                  style={{
                    color: "rgba(var(--fg),0.7)",
                    fontSize: 13,
                    margin: "4px 0 0",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {metaSpec.display_link}
                </p>
              </div>
            )}
            {campaign.cta && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  CTA
                </span>
                <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, margin: "4px 0 0" }}>
                  [{campaign.cta}]
                </p>
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {metaSpec.primary_texts.map((t, i) => (
              <div key={i} style={cardStyle}>
                <span className="mono" style={chipMonoStyle}>
                  Texto principal {i + 1} · {t.length}c
                  {t.length > 125 ? " · se trunca con «Ver más»" : ""}
                </span>
                <span style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, lineHeight: 1.55 }}>
                  {t}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empresa y titular largo (sólo Display) */}
      {campaign.strategy === "display" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Empresa</SectionLabel>
          <div
            style={{
              border: "1px solid rgba(var(--fg),0.08)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {campaign.company_name && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Nombre · {campaign.company_name.length}/25
                </span>
                <p
                  style={{
                    color: "rgba(var(--fg),0.9)",
                    fontSize: 18,
                    margin: "4px 0 0",
                  }}
                >
                  {campaign.company_name}
                </p>
              </div>
            )}
            {campaign.long_headline && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  Titular largo · {campaign.long_headline.length}/90
                </span>
                <p
                  style={{
                    color: "var(--serp-link)",
                    fontSize: 18,
                    margin: "4px 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {campaign.long_headline}
                </p>
              </div>
            )}
            {campaign.cta && (
              <div>
                <span className="mono" style={chipMonoStyle}>
                  CTA
                </span>
                <p
                  style={{
                    color: "rgba(var(--fg),0.85)",
                    fontSize: 14,
                    margin: "4px 0 0",
                  }}
                >
                  [{campaign.cta}]
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Vista previa: ficha de producto en Shopping; snippet SERP en el resto. */}
      {campaign.strategy === "shopping" && campaign.product ? (
        <section
          style={{
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
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
              color: "var(--accent-text)",
            }}
          >
            Ficha de producto · feed
          </span>
          <p className="serp-link" style={{ fontSize: 18, margin: 0, lineHeight: 1.35 }}>
            {campaign.product.title}
          </p>
          <p
            style={{
              color: "var(--text-strong)",
              fontSize: 16,
              margin: 0,
              fontFamily: "var(--font-mono)",
            }}
          >
            {campaign.product.price}
            {campaign.product.brand ? ` · ${campaign.product.brand}` : ""}
          </p>
          <p
            style={{
              color: "rgba(var(--fg),0.78)",
              fontSize: 13,
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {campaign.product.description.length > 220
              ? `${campaign.product.description.slice(0, 220)}…`
              : campaign.product.description}
          </p>
          <span
            style={{
              color: "rgba(var(--fg),0.55)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            {displayUrl(campaign.final_url)} · {campaign.product.availability}
          </span>
        </section>
      ) : campaign.headlines.length > 0 && !isMetaStrategy(campaign.strategy) ? (
        <section
          style={{
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
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
              color: "var(--accent-text)",
            }}
          >
            Vista previa · primer titular
          </span>
          <span
            style={{
              color: "rgba(var(--fg),0.55)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            Anuncio · {displayUrl(campaign.final_url)}
          </span>
          <p
            style={{
              color: "var(--serp-link)",
              fontSize: 20,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {campaign.headlines[0]}
          </p>
          <p
            style={{
              color: "rgba(var(--fg),0.78)",
              fontSize: 14,
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {campaign.descriptions[0]}
          </p>
        </section>
      ) : null}

      {/* Queries / intereses */}
      {campaign.queries.length > 0 && (
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>
          {campaign.strategy === "display" ||
          isMetaStrategy(campaign.strategy) ||
          isTikTokStrategy(campaign.strategy)
            ? "Intereses / contexto"
            : "Queries objetivo"}
        </SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {campaign.queries.map((q) => (
            <span
              key={q}
              className="mono"
              style={{
                padding: "6px 12px",
                border: "1px solid rgba(var(--fg),0.12)",
                borderRadius: "var(--radius-pill)",
                fontSize: 12,
                letterSpacing: "0.08em",
                color: "rgba(var(--fg),0.85)",
                background: "rgba(var(--fg),0.03)",
              }}
            >
              {q}
            </span>
          ))}
        </div>
      </section>
      )}

      {/* Headlines */}
      {campaign.headlines.length > 0 && (
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
                H{i + 1} ·{" "}
                {isMetaStrategy(campaign.strategy)
                  ? `${h.length}c${h.length > 40 ? " · se trunca (~40 visibles)" : ""}`
                  : `${h.length}/30`}
              </span>
              <span style={{ color: "rgba(var(--fg),0.9)", fontSize: 14, lineHeight: 1.4 }}>
                {h}
              </span>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Descriptions */}
      {campaign.descriptions.length > 0 && (
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
                D{i + 1} ·{" "}
                {isMetaStrategy(campaign.strategy)
                  ? `${d.length}c${d.length > 30 ? " · se trunca (~30 visibles)" : ""}`
                  : `${d.length}/90`}
              </span>
              <span style={{ color: "rgba(var(--fg),0.85)", fontSize: 14, lineHeight: 1.55 }}>
                {d}
              </span>
            </div>
          ))}
        </div>
      </section>
      )}

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
                    {c.role === "card"
                      ? `Tarjeta · ${creativeKindLabel(c.kind)}`
                      : c.role === "cover"
                        ? `Portada · ${creativeKindLabel(c.kind)}`
                        : creativeKindLabel(c.kind)}
                  </span>
                  {c.label && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(var(--fg),0.6)",
                      }}
                    >
                      {c.label}
                    </span>
                  )}
                </div>
                {c.card_headline && (
                  <span style={{ color: "rgba(var(--fg),0.9)", fontSize: 13, lineHeight: 1.4 }}>
                    {c.card_headline}
                    {c.card_description ? (
                      <span style={{ color: "rgba(var(--fg),0.55)" }}>
                        {" "}
                        · {c.card_description}
                      </span>
                    ) : null}
                  </span>
                )}
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
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
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
              color: "var(--accent-text)",
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
        repeatSampleBase={`/campaigns/${campaign.id}`}
        emptyHint="Sin runs todavía. Lanza el primer test desde el panel de abajo."
        metrics={[
          { key: "mean_intent_to_click", label: "Intent click medio" },
          { key: "click_rate", label: "Intent ≥ 0,5" },
          { key: "mean_landing_match", label: "Match landing" },
        ]}
      />

      <ProfileLaunchPanel
        title="Lanzar campaign test"
        endpoint="/api/runs/campaign"
        extraBody={{ campaignId: campaign.id }}
        initialSelected={initialSelected}
        combosPerProfile={campaign.channels.length * Math.max(1, campaign.queries.length)}
        estimateEndpoint={`/api/estimate/run?kind=campaign&perProfile=${campaign.channels.length * Math.max(1, campaign.queries.length)}${campaign.intended_message ? "&judge=1" : ""}`}
        progressLabel={`Cada perfil evaluará el anuncio bajo ${campaign.channels.length} ${campaign.channels.length === 1 ? "canal" : "canales"} × ${Math.max(1, campaign.queries.length)} ${campaign.queries.length > 1 ? "queries" : campaign.queries.length === 1 ? "query" : "contexto de interés"} (snippet + landing condicional + versión ideal). Estimado ~${Math.ceil(campaign.channels.length * Math.max(1, campaign.queries.length) * 18)}s por perfil.`}
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
        color: "var(--accent-text)",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(var(--fg),0.08)",
  borderRadius: "var(--radius-md)",
  background: "rgba(var(--fg),0.02)",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const chipMonoStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--accent-text)",
};

const metaChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: "var(--radius-pill)",
  border: "1px solid rgba(var(--fg),0.18)",
  background: "rgba(var(--fg),0.04)",
  color: "rgba(var(--fg),0.85)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};
