import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { BrandContextBox } from "@/components/brand-context-box";
import { estimateAction, partsForKind } from "@/lib/estimate";
import { getGeoAnalysis, type GeoAnalysis, type SegmentInput, type SegmentResult } from "@/lib/geo";
import { GEO_ENGINE_IDS, GEO_ENGINE_LABEL, getGeoEngineModels } from "@/lib/geo-engines";
import { isSupabaseConfigured } from "@/lib/supabase";
import { EngineTabs } from "./engine-tabs";
import { GeoRunButton } from "./run-button";

export const dynamic = "force-dynamic";

const POSITION_LABEL: Record<string, string> = {
  primary: "Protagonista",
  secondary: "Secundaria",
  absent: "Ausente",
};
const POSITION_COLOR: Record<string, string> = {
  primary: "var(--success-text)",
  secondary: "var(--warning-text)",
  absent: "var(--error-text)",
};
const TONE_LABEL: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  absent: "Ausente",
};
const POSITION_TOOLTIP: Record<string, string> = {
  primary:
    "La marca aparece como primera o única recomendación del buscador IA para esta query.",
  secondary:
    "La marca aparece junto a otros resultados o competidores, no como protagonista.",
  absent: "La marca no aparece en la respuesta del buscador IA para esta query.",
};
const TONE_TOOLTIP: Record<string, string> = {
  positive: "El buscador menciona la marca con tono favorable o recomendatorio.",
  neutral:
    "El buscador menciona la marca de forma informativa, sin valorar ni recomendar.",
  negative: "El buscador menciona la marca con tono desfavorable o con advertencias.",
  absent: "La marca no aparece, por lo que no hay tono que analizar.",
};

export default async function GeoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION · GEO Tester" title="Supabase aún no está conectado." />
        <Link href="/geo" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  const analysis = await getGeoAnalysis(id);
  if (!analysis) notFound();

  const trashed = Boolean(analysis.deleted_at);
  const canRun =
    !trashed && (analysis.status === "pending" || analysis.status === "error");
  // Coste estimado: por segmento, 1 sonda real por motor + 1 análisis por
  // sonda (tokens), más la cuota de búsqueda (~0,01 $/sonda, fuera de tokens).
  const runEstimate = canRun
    ? await (async () => {
        const geoModels = await getGeoEngineModels();
        const est = await estimateAction(
          partsForKind("geo", {
            perProfile: analysis.segments.length,
            geoModels,
          }),
        );
        return {
          ...est,
          est_usd: est.est_usd + analysis.segments.length * 3 * 0.01,
        };
      })().catch(() => null)
    : null;

  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCELERATION · GEO Tester"
        title={analysis.name}
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {canRun && (
              <GeoRunButton
                geoId={analysis.id}
                estimatedUsd={runEstimate?.est_usd ?? null}
              />
            )}
            <Link href="/geo" className="btn-pill">
              Volver
            </Link>
          </div>
        }
      />

      {analysis.brand_description && (
        <BrandContextBox text={analysis.brand_description} />
      )}

      {trashed && (
        <div
          style={{
            padding: 16,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 13,
          }}
        >
          Este análisis está en la papelera: se muestra solo como histórico.
          Restáuralo desde Sistema → Papelera para volver a lanzarlo.
        </div>
      )}

      {analysis.status === "running" && (
        <div
          style={{
            padding: 20,
            border: "1px solid rgba(250,204,21,0.3)",
            borderRadius: "var(--radius-md)",
            background: "rgba(250,204,21,0.06)",
            color: "var(--warning-text)",
            fontSize: 14,
          }}
        >
          Análisis en progreso. Recarga la página para ver los resultados cuando termine.
        </div>
      )}

      {analysis.status === "error" && (
        <div
          style={{
            padding: 20,
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius-md)",
            background: "rgba(248,113,113,0.06)",
            color: "var(--error-text)",
            fontSize: 14,
          }}
        >
          El análisis terminó con error. Puedes volver a lanzarlo con el botón de arriba.
        </div>
      )}

      {analysis.status === "pending" && !analysis.results && (
        <div
          style={{
            padding: 48,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.5)",
            textAlign: "center",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Pulsa «Analizar» para lanzar la query de cada uno de los{" "}
          {analysis.segments.length} segmentos contra los 3 motores reales
          (Claude, ChatGPT y Perplexity, con búsqueda web).
        </div>
      )}

      {analysis.results && analysis.results.length > 0 && (
        <>
          <SummaryStrip analysis={analysis} />
          <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
              Resultados por segmento
            </h2>
            {analysis.results.map((r, i) => (
              <SegmentCard key={i} result={r} segment={analysis.segments[i]} />
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}

function visColor(v: number | null): string {
  if (v === null) return "rgba(var(--fg),0.6)";
  return v >= 0.6
    ? "var(--success-text)"
    : v >= 0.3
      ? "var(--warning-text)"
      : "var(--error-text)";
}

function SummaryStrip({ analysis }: { analysis: GeoAnalysis }) {
  const results = analysis.results ?? [];
  const isV2 = results.some((r) => (r.engines?.length ?? 0) > 0);

  if (isV2) {
    // v2: visibilidad media por motor real.
    const perEngine = GEO_ENGINE_IDS.map((engineId) => {
      const scored = results
        .flatMap((r) => r.engines ?? [])
        .filter((e) => e.engine === engineId && e.metrics);
      const avg =
        scored.length > 0
          ? scored.reduce((s, e) => s + (e.metrics?.visibility_score ?? 0), 0) /
            scored.length
          : null;
      return { engineId, avg };
    });

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {perEngine.map(({ engineId, avg }) => (
          <MetricCard
            key={engineId}
            label={`Visibilidad · ${GEO_ENGINE_LABEL[engineId]}`}
            value={avg !== null ? `${Math.round(avg * 100)}%` : "·"}
            color={visColor(avg)}
          />
        ))}
        <MetricCard label="Segmentos analizados" value={String(results.length)} />
      </div>
    );
  }

  // v1 legado (simulación): métricas planas por segmento.
  const visAvg =
    results.length > 0
      ? results.reduce((s, r) => s + (r.visibility_score ?? 0), 0) / results.length
      : null;
  const mentioned = results.filter((r) => r.brand_mentioned).length;
  const primary = results.filter((r) => r.brand_position === "primary").length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}
    >
      <MetricCard
        label="Visibilidad media"
        value={visAvg !== null ? `${Math.round(visAvg * 100)}%` : "·"}
        color={visColor(visAvg)}
      />
      <MetricCard label="Segmentos mencionados" value={`${mentioned}/${results.length}`} />
      <MetricCard label="Posición protagonista" value={`${primary}/${results.length}`} color={primary > 0 ? "var(--success-text)" : "rgba(var(--fg),0.6)"} />
      <MetricCard label="Segmentos analizados" value={String(results.length)} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {label}
      </span>
      <span
        className="display"
        style={{ fontSize: 32, lineHeight: 1, color: color ?? "var(--text-strong)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SegmentCard({
  result,
  segment,
}: {
  result: SegmentResult;
  segment: SegmentInput;
}) {
  const isV2 = (result.engines?.length ?? 0) > 0;

  const card: React.CSSProperties = {
    border: "1px solid rgba(var(--fg),0.08)",
    borderRadius: "var(--radius-md)",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const params = (
    <div
      style={{
        background: "rgba(var(--fg),0.025)",
        border: "1px solid rgba(var(--fg),0.07)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <ParamRow label="Etiqueta" value={result.label} />
      <ParamRow label="JTBD" value={segment.jtbd} />
      <ParamRow label="Query" value={result.query} />
    </div>
  );

  if (isV2) {
    return (
      <div style={card}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text-strong)",
            lineHeight: 1.2,
          }}
        >
          {result.label}
        </span>
        {params}
        <EngineTabs engines={result.engines ?? []} />
      </div>
    );
  }

  // ---- v1 legado: respuesta simulada con métricas planas ----
  const position = result.brand_position ?? "absent";
  const tone = result.recommendation_tone ?? "absent";
  const visibility = result.visibility_score ?? 0;
  const keyClaims = result.key_claims ?? [];
  const missing = result.missing_attributes ?? [];
  const posColor = POSITION_COLOR[position] ?? "rgba(var(--fg),0.6)";

  return (
    <div style={card}>
      {/* Cabecera: etiqueta + badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--text-strong)",
            lineHeight: 1.2,
          }}
        >
          {result.label}
        </span>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <Badge
            label={POSITION_LABEL[position] ?? position}
            color={posColor}
            tooltip={POSITION_TOOLTIP[position]}
          />
          {tone !== "absent" && (
            <Badge
              label={TONE_LABEL[tone] ?? tone}
              color="rgba(var(--fg),0.5)"
              tooltip={TONE_TOOLTIP[tone]}
            />
          )}
        </div>
      </div>

      {params}

      {/* Respuesta simulada (análisis previos a las sondas reales) */}
      <div
        style={{
          border: "1px solid rgba(var(--fg),0.08)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div
          style={{
            padding: "9px 14px",
            borderBottom: "1px solid rgba(var(--fg),0.08)",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.45)",
            }}
          >
            Respuesta simulada (histórico)
            {result.source_engine ? ` · ${result.source_engine}` : ""}
          </span>
        </div>
        <div
          style={{
            padding: 16,
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(var(--fg),0.8)",
            fontStyle: "italic",
            background: "rgba(var(--fg),0.015)",
            borderBottomLeftRadius: "var(--radius-sm)",
            borderBottomRightRadius: "var(--radius-sm)",
          }}
        >
          {result.simulated_response}
        </div>
      </div>

      {/* Barra de visibilidad */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.4)",
          }}
        >
          Visibilidad
        </span>
        <div
          style={{
            flex: 1,
            height: 4,
            background: "rgba(var(--fg),0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.round(visibility * 100)}%`,
              height: "100%",
              background: posColor,
              borderRadius: 2,
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: posColor, minWidth: 32, textAlign: "right" }}>
          {Math.round(visibility * 100)}%
        </span>
      </div>

      {keyClaims.length > 0 && (
        <Detail label="Lo que dice el buscador sobre la marca">
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
            {keyClaims.map((c, i) => (
              <li key={i} style={{ fontSize: 13, color: "rgba(var(--fg),0.75)", lineHeight: 1.5 }}>
                {c}
              </li>
            ))}
          </ul>
        </Detail>
      )}

      {missing.length > 0 && (
        <Detail label="Huecos detectados (atributos ausentes)">
          <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
            {missing.map((a, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--error-text)", lineHeight: 1.5 }}>
                {a}
              </li>
            ))}
          </ul>
        </Detail>
      )}
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.35)",
          minWidth: 60,
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: "rgba(var(--fg),0.72)", lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  );
}

function Badge({
  label,
  color,
  tooltip,
}: {
  label: string;
  color: string;
  tooltip?: string;
}) {
  return (
    <span
      className="mono"
      data-tooltip={tooltip}
      style={{
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "var(--radius-pill)",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        cursor: tooltip ? "help" : undefined,
      }}
    >
      {label}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.45)",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
