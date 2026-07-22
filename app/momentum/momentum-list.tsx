import type { EntityStat } from "@/components/entity-card";
import { EntityListView, type EntityListItem } from "@/components/entity-list";
import type { MomentumChallenge } from "@/lib/momentum";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  running: "Analizando",
  done: "Completado",
  error: "Error",
};

/**
 * Stats del pie de la card de Momentum, normalizada al mismo formato que el
 * resto de módulos (EntityCard): tres stats en una fila. Si hay resultados,
 * la distribución (Activos/Latentes/Inactivos, que suma el total de perfiles);
 * si no, perfiles y estado.
 */
function momentumStats(c: MomentumChallenge): EntityStat[] {
  if (c.results && c.results.length > 0) {
    return [
      {
        label: "Activos",
        value: c.results.filter((r) => r.direction === "approaching").length,
      },
      {
        label: "Latentes",
        value: c.results.filter((r) => r.direction === "stable").length,
      },
      {
        label: "Inactivos",
        value: c.results.filter((r) => r.direction === "drifting").length,
      },
    ];
  }
  return [
    { label: "Perfiles", value: c.profile_ids.length },
    { label: "Estado", value: STATUS_LABEL[c.status] ?? c.status },
  ];
}

export function MomentumList({
  challenges,
}: {
  challenges: MomentumChallenge[];
}) {
  return (
    <EntityListView
      items={challenges.map<EntityListItem>((c) => ({
        id: c.id,
        href: `/momentum/${c.id}`,
        trash: { type: "momentum", id: c.id, name: c.name },
        title: c.name,
        description: c.trigger_scenario,
        createdAt: c.created_at,
        runs: c.results?.length ?? 0,
        users: c.profile_ids.length,
        stats: momentumStats(c),
      }))}
      emptyHint="Todavía no hay Triggers de Momentum. Crea el primero desde «Nuevo Trigger»."
      noMatchHint="Ningún Trigger coincide con la búsqueda."
    />
  );
}
