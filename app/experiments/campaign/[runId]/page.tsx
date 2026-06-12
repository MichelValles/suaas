import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { ChannelIcon } from "@/components/channel-icon";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  CHANNEL_LABEL,
  getCampaignWithTrashed,
  isMetaStrategy,
  isTikTokStrategy,
} from "@/lib/campaigns";
import {
  GENERAL_CONTEXT_QUERY,
  RecommendationsSchema,
  listCampaignResponses,
  summarizeCampaignResponses,
  type CampaignByChannel,
  type CampaignByQuery,
  type CampaignRecommendations,
  type CampaignResponse,
} from "@/lib/experiments/campaign";
import { listProfilesByIds, type Profile } from "@/lib/profiles";
import { getRun } from "@/lib/runs";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CampaignResponsesTable } from "./responses-table";
import { RunProgress } from "./run-progress";

export const dynamic = "force-dynamic";

function fmtPct(v: number | null): string {
  if (v === null) return "·";
  return `${Math.round(v * 100)}%`;
}

/** El placeholder de runs sin queries (Display) se muestra con etiqueta legible. */
function queryLabel(query: string): string {
  return query === GENERAL_CONTEXT_QUERY ? "Contexto general" : query;
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

  const expected =
    totalProfiles *
    ((run.params?.channels as string[] | undefined)?.length ?? 1) *
    ((run.params?.queries as string[] | undefined)?.length ?? 1);

  // Síntesis «Qué cambiar» (v0.39.3): validada con zod por si el jsonb
  // trae cualquier otra cosa. Null en runs anteriores o si la síntesis falló.
  const recParsed = RecommendationsSchema.safeParse(run.params?.recommendations);
  const recommendations: CampaignRecommendations | null = recParsed.success
    ? recParsed.data
    : null;

  // Último error registrado por el runner (v0.47.1): solo se pinta si el
  // run terminó en error.
  const lastError =
    run.params && typeof run.params.last_error === "string"
      ? run.params.last_error
      : null;

  return (
    <AppShell>
      <PageHeading
        eyebrow={`Run · ${run.status} · ${totalProfiles} ${totalProfiles === 1 ? "perfil" : "perfiles"} · ${summary.n_responses} respuestas`}
        title={campaign.name}
        description={campaign.brief ?? undefined}
        descriptionVariant="panel"
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <a href={`/api/export/campaign/${runId}`} className="btn-pill" download>
              CSV
            </a>
            {isMetaStrategy(campaign.strategy) ? (
              <a
                href={`/api/export/campaign/${runId}?format=meta`}
                className="btn-pill"
                title="CSV con la estructura de un anuncio de Meta (5 textos principales, 5 titulares, 5 descripciones): fila con los assets originales y fila con el top de versiones ideales"
                download
              >
                Meta Ads
              </a>
            ) : isTikTokStrategy(campaign.strategy) ? (
              <a
                href={`/api/export/campaign/${runId}?format=tiktok`}
                className="btn-pill"
                title="CSV con la estructura de un anuncio de TikTok (5 textos de anuncio, identidad, CTA, música): fila con los assets originales y fila con el top de captions ideales"
                download
              >
                TikTok Ads
              </a>
            ) : (
              <a
                href={`/api/export/campaign/${runId}?format=ads_editor`}
                className="btn-pill"
                title="CSV con cabeceras RSA para Google Ads Editor: fila con los assets originales y fila con el top de versiones ideales"
                download
              >
                Ads Editor
              </a>
            )}
            <Link
              href={campaign.deleted_at ? "/campaigns" : `/campaigns/${campaign.id}`}
              className="btn-pill"
            >
              {campaign.deleted_at ? "Volver al listado" : "Volver a la campaña"}
            </Link>
          </div>
        }
      />

      {/* Progreso del run (solo running o interrumpido con parciales) */}
      <RunProgress
        runId={runId}
        initialStatus={run.status}
        initialDone={responses.length}
        expected={expected}
        startedAt={run.created_at}
      />

      {/* Detalle del fallo: el runner guarda el último error de combinación
          en runs.params.last_error (v0.47.1) para no depender de los logs. */}
      {run.status === "error" && lastError && (
        <section
          style={{
            border: "1px solid rgba(var(--fg),0.14)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            display: "grid",
            gap: 6,
          }}
        >
          <span className="eyebrow" style={{ color: "var(--error-text)" }}>
            Por qué falló el run
          </span>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(var(--fg),0.75)" }}>
            {lastError}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--fg),0.5)" }}>
            Es el último error registrado por el runner. «Retomar» reintenta
            solo las combinaciones que faltan.
          </p>
        </section>
      )}

      {/* Summary global */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard label="Intent click" value={fmtPct(summary.mean_intent_to_click)} accent />
        <KpiCard
          label="Intent ≥ 0,5"
          value={fmtPct(summary.click_rate)}
          hint="Proporción de respuestas con intención de click ≥ 0,5. Umbral interno del test: no es comparable con el CTR real de la plataforma publicitaria."
        />
        <KpiCard label="Claridad" value={fmtPct(summary.mean_clarity)} />
        <KpiCard label="Credibilidad" value={fmtPct(summary.mean_credibility)} />
        <KpiCard label="Diferenciación" value={fmtPct(summary.mean_differentiation)} />
        {summary.mean_ad_comprehension !== null && (
          <KpiCard
            label="Comprensión"
            value={fmtPct(summary.mean_ad_comprehension)}
            hint="Juez neutral (sin persona): cuánto coincide lo que cada perfil percibió con el mensaje que la campaña pretendía comunicar."
          />
        )}
        <KpiCard
          label="Match landing"
          value={fmtPct(summary.mean_landing_match)}
          hint="Solo lo evalúan los perfiles cuya intención superó el umbral de 0,5 (los que habrían hecho click)."
        />
      </section>

      {/* Nota de fidelidad metodológica */}
      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: 1.6,
          color: "rgba(var(--fg),0.5)",
          maxWidth: 760,
        }}
      >
        Nota metodológica: «Intent ≥ 0,5» mide la proporción de respuestas de los perfiles
        sobre un umbral interno, no una tasa de clics comparable con la plataforma.
        El match de landing se juzga sobre{" "}
        {campaign.landing_source_url
          ? "la imagen og:image de la URL final (no sobre la landing real navegable)"
          : "el screenshot de landing subido"}
        .
        {(campaign.creatives ?? []).some(
          (c) => c.kind === "youtube" || c.kind === "video",
        )
          ? " Las creatividades de vídeo se evalúan por su miniatura (el modelo no procesa vídeo)."
          : ""}
      </p>

      {/* Qué cambiar: síntesis accionable del run */}
      {recommendations && (
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            border: "1px solid var(--accent-500)",
            borderRadius: "var(--radius-md)",
            padding: "26px 28px",
            background: "rgba(250,204,13,0.04)",
          }}
        >
          <SectionLabel>Qué cambiar</SectionLabel>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {recommendations.key_findings.map((f) => (
              <li
                key={f}
                style={{
                  color: "rgba(var(--fg),0.85)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  paddingLeft: 18,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    color: "var(--accent-text)",
                  }}
                >
                  ·
                </span>
                {f}
              </li>
            ))}
          </ul>
          {(recommendations.recommended_headlines.length > 0 ||
            recommendations.recommended_descriptions.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.55)",
                }}
              >
                Copy listo para pegar
              </span>
              {recommendations.recommended_headlines.map((h) => (
                <p key={h} className="serp-link" style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>
                  {h}
                </p>
              ))}
              {recommendations.recommended_descriptions.map((d) => (
                <p
                  key={d}
                  style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "rgba(var(--fg),0.78)" }}
                >
                  {d}
                </p>
              ))}
            </div>
          )}
          {recommendations.barrier_fixes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.55)",
                }}
              >
                Cómo desactivar las barreras
              </span>
              {recommendations.barrier_fixes.map((b) => (
                <p
                  key={b}
                  style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(var(--fg),0.7)" }}
                >
                  {b}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

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
                  <Th>Intent ≥ 0,5</Th>
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

      {/* Por query (oculta si el run no tiene respuestas) */}
      {summary.byQuery.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Métricas por query</SectionLabel>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Query</Th>
                  <Th>N</Th>
                  <Th>Intent</Th>
                  <Th>Intent ≥ 0,5</Th>
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
      )}

      {/* Conducta predicha (Gravity Model). Solo si hay filas con clase:
          los runs anteriores a v0.39.1 no la traen. */}
      {summary.behavior_counts.optima +
        summary.behavior_counts.fuga +
        summary.behavior_counts.repesca >
        0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Conducta predicha (Gravity Model)</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <BehaviorCard
              label="Óptima"
              count={summary.behavior_counts.optima}
              total={summary.n_responses}
              color="var(--success-text)"
              hint="Conecta con la intención del perfil: haría click."
            />
            <BehaviorCard
              label="Repesca"
              count={summary.behavior_counts.repesca}
              total={summary.n_responses}
              color="var(--warning-text)"
              hint="Sin click ahora, pero la necesidad sigue viva: recuperable con otro mensaje."
            />
            <BehaviorCard
              label="Fuga"
              count={summary.behavior_counts.fuga}
              total={summary.n_responses}
              color="var(--error-text)"
              hint="Lo ignora y sigue con lo suyo."
            />
          </div>
          {summary.byQuery.length > 1 && (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Query</Th>
                    <Th>Óptima</Th>
                    <Th>Repesca</Th>
                    <Th>Fuga</Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byQuery.map((q) => (
                    <tr key={q.query} style={{ borderTop: "1px solid rgba(var(--fg),0.06)" }}>
                      <Td>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {queryLabel(q.query)}
                        </span>
                      </Td>
                      <Td>{q.behavior_counts.optima}</Td>
                      <Td>{q.behavior_counts.repesca}</Td>
                      <Td>{q.behavior_counts.fuga}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {summary.behavior_inconsistencies > 0 && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(var(--fg),0.5)" }}>
              Consistencia interna: {summary.behavior_inconsistencies}{" "}
              {summary.behavior_inconsistencies === 1 ? "respuesta contradice" : "respuestas contradicen"}{" "}
              su propio intent (fuga con intent ≥ 0,5 u óptima con intent &lt; 0,3). Un número alto
              delata scoring poco fiable en este run.
            </p>
          )}
        </section>
      )}

      {/* Rendimiento por asset (solo runs con muestreo de combinaciones, v0.40+) */}
      {summary.byAsset.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Rendimiento por asset</SectionLabel>
          <p
            style={{
              color: "rgba(var(--fg),0.6)",
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 720,
            }}
          >
            Intent medio de las respuestas en cuya combinación apareció cada titular,
            descripción o texto principal, frente a la media del run. Con n bajo la señal es
            ruido: las filas con menos de 5 apariciones se muestran atenuadas.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th>Tipo</Th>
                  <Th>N</Th>
                  <Th>Intent medio</Th>
                  <Th>Δ vs run</Th>
                </tr>
              </thead>
              <tbody>
                {summary.byAsset.map((a) => (
                  <tr
                    key={`${a.kind}-${a.asset}`}
                    style={{
                      borderTop: "1px solid rgba(var(--fg),0.06)",
                      opacity: a.n < 5 ? 0.45 : 1,
                    }}
                  >
                    <Td>
                      <span style={{ fontSize: 13, whiteSpace: "normal" }}>{a.asset}</span>
                    </Td>
                    <Td>
                      <span className="mono" style={{ fontSize: 11, color: "rgba(var(--fg),0.55)" }}>
                        {a.kind === "headline"
                          ? "Titular"
                          : a.kind === "primary_text"
                            ? "Texto principal"
                            : "Descripción"}
                      </span>
                    </Td>
                    <Td>{a.n}</Td>
                    <Td>{fmtPct(a.mean_intent)}</Td>
                    <Td>
                      <span
                        style={{
                          color:
                            a.delta_vs_run > 0.005
                              ? "var(--success-text)"
                              : a.delta_vs_run < -0.005
                                ? "var(--error-text)"
                                : "rgba(var(--fg),0.55)",
                        }}
                      >
                        {a.delta_vs_run > 0 ? "+" : ""}
                        {Math.round(a.delta_vs_run * 100)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

      {/* Detalle por respuesta: tabla interactiva (ordenable y filtrable) */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SectionLabel>Respuestas detalladas</SectionLabel>
        <CampaignResponsesTable
          responses={responses}
          names={Object.fromEntries(profiles.map((p) => [p.id, p.name]))}
        />
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
          {queryLabel(q.query)}
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
          · {queryLabel(resp.query)}
        </span>
      </div>
      <div>
        <p
          style={{
            color: "var(--serp-link)",
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


function KpiCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        {hint && <InfoTooltip text={hint} label={`Qué significa ${label}`} />}
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

function BehaviorCard({
  label,
  count,
  total,
  color,
  hint,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  hint: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
      <span style={{ fontSize: 26, color, letterSpacing: "-0.01em" }}>
        {count} <span style={{ fontSize: 14, color: "rgba(var(--fg),0.5)" }}>· {pct}%</span>
      </span>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "rgba(var(--fg),0.55)" }}>
        {hint}
      </p>
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
