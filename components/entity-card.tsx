import Link from "next/link";
import { SendToTrashButton } from "@/components/trash-button";
import type { TrashType } from "@/lib/trash";

/**
 * Tarjeta reutilizable para los listados de targets, funnels, A/B tests,
 * copy decks y pricing offers. Diseñada para que las 5 vistas tengan la
 * misma jerarquía y ritmo visual.
 *
 * Estructura:
 *   header  → eyebrow específico del tipo (p.ej. «4 pasos») + trash overlay
 *   body    → título display italic + descripción
 *   stats   → runs · perfiles · característica · fecha de creación
 */

export type EntityStat = {
  /** Etiqueta corta en mono uppercase. */
  label: string;
  /** Valor a mostrar (string ya formateado). */
  value: string | number;
};

export function EntityCard({
  href,
  trash,
  eyebrow,
  title,
  description,
  stats,
  createdAt,
  media,
}: {
  href: string;
  trash: { type: TrashType; id: string; name: string };
  /** Eyebrow superior tipo «4 pasos», «5 bloques», «3 precios · EUR», «A/B»… */
  eyebrow: string;
  title: string;
  description?: string | null;
  /** Estadísticas en el pie. Hasta 4 entradas, layout responsive. */
  stats: EntityStat[];
  createdAt: string;
  /** Slot opcional en cabecera (thumbnail de targets, etc.). */
  media?: React.ReactNode;
}) {
  return (
    <li style={{ position: "relative", display: "flex" }}>
      <SendToTrashButton type={trash.type} id={trash.id} name={trash.name} />
      <Link href={href} className="entity-card">
        {media && <div className="entity-card__media">{media}</div>}
        <header className="entity-card__head">
          <span className="entity-card__eyebrow mono">{eyebrow}</span>
        </header>

        <div className="entity-card__body">
          <h2 className="entity-card__title">{title}</h2>
          {description && (
            <p className="entity-card__description">{description}</p>
          )}
        </div>

        <footer className="entity-card__stats">
          {stats.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} />
          ))}
          <Stat label="Creado" value={formatShortDate(createdAt)} />
        </footer>
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="entity-card__stat">
      <span className="entity-card__stat-label mono">{label}</span>
      <span className="entity-card__stat-value mono">{value}</span>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
