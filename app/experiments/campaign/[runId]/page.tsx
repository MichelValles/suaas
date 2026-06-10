import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ChannelIcon } from "@/components/channel-icon";
import { CHANNEL_LABEL, getCampaignWithTrashed } from "@/lib/campaigns";
import {
  listCampaignResponses,
  summarizeCampaignResponses,
  type CampaignByChannel,
  type CampaignByQuery,
  type CampaignResponse,
} from "@/lib/experiments/campaign";
import { listProfilesByIds, type Profile } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function fmtPct(v: number | null): string {
  if (v === null) return "·";
  return `${Math.round(v * 100)}%`;
}

export default async function CampaignRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Resultados campaign" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }
  const run = await getRun(runId);
  if (!run || run.kind !== "campaign") notFound();
  const campaignId =
    run.campaign_id ?? (run.params?.campaignId as string | undefined);
  if (!campaignId) notFound();

  // Vista de resultados históricos: la campaña se carga aunque esté en la
  // papelera para no romper runs antiguos.
  const [campaign, responses] = await Promise.all([
    getCampaignWithTrashed(campaignId),
    listCampaignResponses(runId),
  ]);
  if (!campaign) notFound();

  const profileIdsRequested =
    (run.params?.profileIds as string[] | undefined) ?? [];
  const uniqueProfiles = new Set(responses.map((r) => r.profileId));
  const totalProfiles = profileIdsRequested.length || uniqueProfiles.size;
  const summary = summarizeCampaignResponses(campaign, totalProfiles, responses);
  const profiles = await listProfilesByIds(Array.from(uniqueProfiles));
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Run · ${run.status} · ${totalProfiles} ${totalProfiles === 1 ? "perfil" : "perfiles"} · ${summary.n_responses} respuestas`}
        title={campaign.name}
        description={campaign.brief ?? undefined}
        descriptionVariant="panel"
        actions={
          <Link
            href={campaign.deleted_at ? "/campaigns" : `/campaigns/${campaign.id}`}
            className="btn-pill"
          >
            {campaign.deleted_at ? "Volver al listado" : "Volver a la campaña"}
          </Link>
        }
      />

      {/* Summary global */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard label="Intent click" value={fmtPct(summary.mean_intent_to_click)} accent />
        <KpiCard label="Click rate" value={fmtPct(summary.click_rate)} />
        <KpiCard label="Claridad" value={fmtPct(summary.mean_clarity)} />
        <KpiCard label="Credibilidad" value={fmtPct(summary.mean_credibility)} />
        <KpiCard label="Diferenciación" value={fmtPct(summary.mean_differentiation)} />
        <KpiCard label="Match landing" value={fmtPct(summary.mean_landing_match)} />
      </section>

      {/* Por canal (sólo si la campaña tenía más de uno) */}
      {summary.byChannel.length > 1 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Métricas por canal</SectionLabel>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Canal</Th>
                  <Th>N</Th>
                  <Th>Intent</Th>
                  <Th>CTR</Th>
                  <Th>Claridad</Th>
                  <Th>Credibilidad</Th>
                  <Th>Diferenciación</Th>
                  <Th>Match landing</Th>
                  <Th>Top barreras</Th>
                </tr>
              </thead>
              <tbody>
                {summary.byChannel.map((c) => (
                  <ChannelRow key={c.channel} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Por query */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Métricas por query</SectionLabel>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Query</Th>
                <Th>N</Th>
                <Th>Intent</Th>
                <Th>CTR</Th>
                <Th>Claridad</Th>
                <Th>Credibilidad</Th>
                <Th>Diferenciación</Th>
                <Th>Match landing</Th>
                <Th>Top barreras</Th>
              </tr>
            </thead>
            <tbody>
              {summary.byQuery.map((q) => (
                <QueryRow key={q.query} q={q} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top barriers global */}
      {summary.top_barriers.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>Top barreras agregadas</SectionLabel>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {summary.top_barriers.map((b) => (
              <li
                key={b.label}
                className="mono"
                style={{
                  padding: "6px 12px",
                  border: "1px solid rgba(var(--fg),0.12)",
                  borderRadius: "var(--radius-pill)",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  color: "rgba(var(--fg),0.85)",
                  background: "rgba(var(--fg),0.03)",
                }}
              >
                {b.label} <span style={{ color: "var(--accent-text)" }}>· {b.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Versiones ideales */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Como yo lo veo · versiones ideales propuestas</SectionLabel>
        <p
          style={{
            color: "rgba(var(--fg),0.65)",
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 720,
          }}
        >
          Cada fila es la propuesta de un perfil bajo una query, en su voz. Ordenadas por
          intent-to-click descendente del original (los perfiles que más cerca estaban de
          clickar suelen producir variantes más realistas).
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {[...responses]
            .sort((a, b) => b.intent_to_click - a.intent_to_click)
            .slice(0, 24)
            .map((r) => (
              <IdealCard
                key={`${r.profileId}-${r.channel}-${r.query}`}
                resp={r}
                profile={profilesById.get(r.profileId)}
              />
            ))}
        </div>
      </section>

      {/* Detalle por perfil */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Respuestas detalladas por perfil</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map((profile) => {
            const rs = responses.filter((r) => r.profileId === profile.id);
            if (rs.length === 0) return null;
            return (
              <ProfileBlock
                key={profile.id}
                profile={profile}
                responses={rs}
              />
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function ChannelRow({ c }: { c: CampaignByChannel }) {
  return (
    <tr style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}>
      <Td>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "rgba(var(--fg),0.9)",
            fontSize: 13,
          }}
        >
          <ChannelIcon channel={c.channel} size={14} />
          {CHANNEL_LABEL[c.channel]}
        </span>
      </Td>
      <Td>{c.n}</Td>
      <Td>{fmtPct(c.mean_intent_to_click)}</Td>
      <Td>{fmtPct(c.click_rate)}</Td>
      <Td>{fmtPct(c.mean_clarity)}</Td>
      <Td>{fmtPct(c.mean_credibility)}</Td>
      <Td>{fmtPct(c.mean_differentiation)}</Td>
      <Td>{fmtPct(c.mean_landing_match)}</Td>
      <Td>
        <span style={{ color: "rgba(var(--fg),0.7)", fontSize: 12 }}>
          {c.top_barriers.map((b) => b.label).slice(0, 3).join(", ") || "·"}
        </span>
      </Td>
    </tr>
  );
}

function QueryRow({ q }: { q: CampaignByQuery }) {
  return (
    <tr style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}>
      <Td>
        <span className="mono" style={{ fontSize: 12 }}>
          {q.query}
        </span>
      </Td>
      <Td>{q.n}</Td>
      <Td>{fmtPct(q.mean_intent_to_click)}</Td>
      <Td>{fmtPct(q.click_rate)}</Td>
      <Td>{fmtPct(q.mean_clarity)}</Td>
      <Td>{fmtPct(q.mean_credibility)}</Td>
      <Td>{fmtPct(q.mean_differentiation)}</Td>
      <Td>{fmtPct(q.mean_landing_match)}</Td>
      <Td>
        <span style={{ color: "rgba(var(--fg),0.7)", fontSize: 12 }}>
          {q.top_barriers.map((b) => b.label).slice(0, 3).join(", ") || "·"}
        </span>
      </Td>
    </tr>
  );
}

function IdealCard({
  resp,
  profile,
}: {
  resp: CampaignResponse;
  profile?: Profile;
}) {
  return (
    <article
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <Link
          href={`/profiles/${resp.profileId}`}
          style={{
            color: "var(--text-strong)",
            fontSize: 14,
            textDecoration: "none",
            borderBottom: "1px dotted rgba(var(--fg),0.25)",
          }}
        >
          {profile?.name ?? resp.profileId.slice(0, 8)}
        </Link>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "rgba(var(--fg),0.6)",
          }}
        >
          intent {fmtPct(resp.intent_to_click)}
        </span>
      </header>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "rgba(var(--fg),0.7)",
          }}
        >
          <ChannelIcon channel={resp.channel} size={12} />
          {CHANNEL_LABEL[resp.channel].split(" ")[0]}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--accent-text)",
          }}
        >
          · {resp.query}
        </span>
      </div>
      <div>
        <p
          style={{
            color: "rgba(132, 192, 255, 0.95)",
            fontSize: 16,
            margin: "0 0 4px",
            lineHeight: 1.3,
          }}
        >
          {resp.ideal_headline}
        </p>
        <p
          style={{
            color: "rgba(var(--fg),0.78)",
            fontSize: 13,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {resp.ideal_description}
        </p>
      </div>
      <p
        style={{
          color: "rgba(var(--fg),0.6)",
          fontSize: 12,
          margin: 0,
          lineHeight: 1.5,
          fontStyle: "italic",
        }}
      >
        Promesa: «{resp.ideal_promise}»
      </p>
      {resp.ideal_free_text && (
        <p
          style={{
            color: "rgba(var(--fg),0.55)",
            fontSize: 12,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {resp.ideal_free_text}
        </p>
      )}
    </article>
  );
}

function ProfileBlock({
  profile,
  responses,
}: {
  profile: Profile;
  responses: CampaignResponse[];
}) {
  return (
    <details
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        padding: "18px 20px",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/profiles/${profile.id}`}
          style={{
            color: "var(--text-strong)",
            fontSize: 14,
            textDecoration: "none",
            borderBottom: "1px dotted rgba(var(--fg),0.25)",
          }}
        >
          {profile.name}
        </Link>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "rgba(var(--fg),0.55)",
          }}
        >
          {responses.length} respuesta{responses.length === 1 ? "" : "s"}
        </span>
      </summary>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "16px 0 0",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {responses.map((r) => (
          <li
            key={`${r.profileId}-${r.channel}-${r.query}`}
            style={{
              padding: "14px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(var(--fg),0.03)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "var(--accent-text)",
                }}
              >
                <ChannelIcon channel={r.channel} size={12} />
                {CHANNEL_LABEL[r.channel].split(" ")[0]} · {r.query}
              </span>
              <span className="mono" style={{ fontSize: 10, color: "rgba(var(--fg),0.55)" }}>
                intent {fmtPct(r.intent_to_click)} · claridad {fmtPct(r.clarity)} · credibilidad {fmtPct(r.credibility)} · diferenciación {fmtPct(r.differentiation)}
              </span>
            </header>
            <p style={{ color: "rgba(var(--fg),0.85)", fontSize: 13, margin: 0, lineHeight: 1.55 }}>
              «{r.perceived_offer}»
            </p>
            {r.barriers.length > 0 && (
              <p style={{ color: "rgba(var(--fg),0.6)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Barreras: {r.barriers.join(", ")}
              </p>
            )}
            {r.landing_evaluated && (
              <p style={{ color: "rgba(var(--fg),0.7)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Landing match {fmtPct(r.landing_match)}: {r.landing_critique}
              </p>
            )}
            <div
              style={{
                borderTop: "1px dashed rgba(var(--fg),0.1)",
                paddingTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(var(--fg),0.55)" }}>
                Como yo lo veo
              </span>
              <p style={{ color: "rgba(132, 192, 255, 0.95)", fontSize: 14, margin: 0, lineHeight: 1.4 }}>
                {r.ideal_headline}
              </p>
              <p style={{ color: "rgba(var(--fg),0.78)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                {r.ideal_description}
              </p>
              <p style={{ color: "rgba(var(--fg),0.6)", fontSize: 11, margin: 0, fontStyle: "italic" }}>
                «{r.ideal_promise}»
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${accent ? "var(--accent-500)" : "rgba(var(--fg),0.08)"}`,
        borderRadius: "var(--radius-md)",
        padding: 20,
        background: accent ? "rgba(250,204,13,0.06)" : "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text-strong)",
          fontSize: 26,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </div>
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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  color: "rgba(var(--fg),0.85)",
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textAlign: "left",
        color: "rgba(var(--fg),0.55)",
        fontWeight: 400,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "10px 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {children}
    </td>
  );
}
