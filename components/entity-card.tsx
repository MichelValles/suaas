"use client";

import Image from "next/image";
import Link from "next/link";
import { SendToTrashButton } from "@/components/trash-button";
import type { TrashType } from "@/lib/trash";

/**
 * Tarjeta reutilizable para los listados de targets, funnels, A/B tests,
 * copy decks y pricing offers. Misma jerarquía visual en las 5 vistas:
 *
 *   media opcional (16:9)
 *   ──────────────────────────────────────────
 *   [fecha]                              [trash]
 *   título display italic
 *   descripción (clamp 2 líneas)
 *   ──────────────────────────────────────────
 *   RUNS · N    PERFILES · N    [kind] · N
 */

export type EntityStat = {
  /** Etiqueta corta en mono uppercase. */
  label: string;
  /** Valor a mostrar (string ya formateado o número). */
  value: string | number;
};

export type EntityMedia = { src: string; alt: string };

export function EntityCard({
  href,
  trash,
  title,
  description,
  stats,
  createdAt,
  media,
}: {
  href: string;
  trash: { type: TrashType; id: string; name: string };
  title: string;
  description?: string | null;
  /** Estadísticas en el pie. La última suele ser la característica del tipo. */
  stats: EntityStat[];
  /** ISO de creación. Se renderiza como eyebrow en la esquina superior izquierda. */
  createdAt: string;
  /** Thumbnail opcional (targets). */
  media?: EntityMedia;
}) {
  return (
    <li style={{ position: "relative", display: "flex" }}>
      <SendToTrashButton type={trash.type} id={trash.id} name={trash.name} />
      <Link href={href} className="entity-card">
        {media && (
          <div className="entity-card__media">
            <Thumb src={media.src} alt={media.alt} />
          </div>
        )}
        <header className="entity-card__head">
          <span className="entity-card__eyebrow mono">
            {formatShortDate(createdAt)}
          </span>
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

function Thumb({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  }
  return <Image src={src} alt={alt} width={480} height={270} unoptimized />;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
