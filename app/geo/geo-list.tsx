import type { EntityStat } from "@/components/entity-card";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import type { GeoAnalysis } from "@/lib/geo";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando…",
  done: "Completado",
  error: "Error",
};

/**
 * Stats del pie de la card GEO, normalizada al mismo formato que el resto de
 * módulos (EntityCard). Segmentos siempre; visibilidad media si está
 * completado; progreso si está en curso; y el estado.
 */
function geoStats(a: GeoAnalysis): EntityStat[] {
  const segCount = a.segments?.length ?? 0;
  const scores = (a.results ?? [])
    .map((r) => {
      if (r.engines && r.engines.length > 0) {
        const scored = r.engines.filter((e) => e.metrics);
        return scored.length > 0
          ? scored.reduce((s, e) => s + (e.metrics?.visibility_score ?? 0), 0) /
              scored.length
          : null;
      }
      return r.visibility_score ?? null;
    })
    .filter((v): v is number => v !== null);
  const visAvg =
    scores.length > 0
      ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100)
      : null;
  const doneCount = (a.results ?? []).filter(
    (r) => (r.engines?.length ?? 0) > 0 || r.brand_mentioned !== undefined,
  ).length;

  const stats: EntityStat[] = [{ label: "Segmentos", value: segCount }];
  if (a.status === "done" && visAvg !== null) {
    stats.push({ label: "Visibilidad", value: `${visAvg}%` });
  } else if (a.status === "running") {
    stats.push({ label: "Analizados", value: `${doneCount}/${segCount}` });
  }
  stats.push({ label: "Estado", value: STATUS_LABEL[a.status] ?? a.status });
  return stats;
}

export function GeoList({ analyses }: { analyses: GeoAnalysis[] }) {
  return (
    <EntityListView
      minCardWidth={340}
      items={analyses.map<EntityListItem>((a) => ({
        id: a.id,
        href: `/geo/${a.id}`,
        trash: { type: "geo", id: a.id, name: a.name },
        title: a.name,
        description: a.brand_description,
        createdAt: a.created_at,
        runs: a.segments?.length ?? 0,
        users: 0,
        searchExtra: a.brand_name,
        stats: geoStats(a),
      }))}
      emptyHint="Todavía no hay análisis GEO. Crea el primero desde «Nuevo análisis»."
      noMatchHint="Ningún análisis coincide con la búsqueda."
    />
  );
}
