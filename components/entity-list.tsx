"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EntityCard, type EntityMedia, type EntityStat } from "@/components/entity-card";
import type { TrashType } from "@/lib/trash";

/**
 * Item normalizado que consume EntityListView. Los listados de entidades
 * testeables (targets, funnels, ab, copy, pricing, campaigns) mapean sus
 * entidades a esta forma para tener búsqueda + ordenación con la misma
 * plantilla.
 */
export type EntityListItem = {
  id: string;
  href: string;
  trash: { type: TrashType; id: string; name: string };
  title: string;
  description?: string | null;
  createdAt: string;
  /** Stats para sort. */
  runs: number;
  users: number;
  /** Stats para render en el pie de la card (en orden). */
  stats: EntityStat[];
  /** Thumbnail opcional (targets). */
  media?: EntityMedia;
};

type SortKey =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "runs-desc"
  | "users-desc";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Más recientes" },
  { key: "oldest", label: "Más antiguos" },
  { key: "name-asc", label: "Nombre (A-Z)" },
  { key: "name-desc", label: "Nombre (Z-A)" },
  { key: "runs-desc", label: "Más runs" },
  { key: "users-desc", label: "Más perfiles" },
];

const COLLATOR = new Intl.Collator("es", { sensitivity: "base", numeric: true });

export function EntityListView({
  items,
  minCardWidth = 320,
  emptyHint = "No hay elementos todavía.",
  noMatchHint = "Ningún elemento coincide con la búsqueda.",
}: {
  items: EntityListItem[];
  minCardWidth?: number;
  emptyHint?: string;
  noMatchHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    const terms = q.split(/\s+/);
    return items.filter((i) => {
      const blob = [
        i.title,
        i.description ?? "",
        ...i.stats.map((s) => `${s.label} ${s.value}`),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => blob.includes(t));
    });
  }, [items, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "oldest":
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "name-asc":
        list.sort((a, b) => COLLATOR.compare(a.title, b.title));
        break;
      case "name-desc":
        list.sort((a, b) => COLLATOR.compare(b.title, a.title));
        break;
      case "runs-desc":
        list.sort((a, b) => b.runs - a.runs);
        break;
      case "users-desc":
        list.sort((a, b) => b.users - a.users);
        break;
      default:
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [filtered, sort]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Toolbar
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        total={items.length}
        visible={sorted.length}
      />

      {items.length === 0 ? (
        <EmptyState>{emptyHint}</EmptyState>
      ) : sorted.length === 0 ? (
        <EmptyState>{noMatchHint}</EmptyState>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
            gap: 20,
          }}
        >
          {sorted.map((item) => (
            <EntityCard
              key={item.id}
              href={item.href}
              trash={item.trash}
              title={item.title}
              description={item.description}
              createdAt={item.createdAt}
              stats={item.stats}
              media={item.media}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// Toolbar
// ============================================================

function Toolbar({
  query,
  onQuery,
  sort,
  onSort,
  total,
  visible,
}: {
  query: string;
  onQuery: (q: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  total: number;
  visible: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-pill)",
            padding: "14px 22px",
            minWidth: 380,
          }}
        >
          <Search size={16} color="rgba(255,255,255,0.5)" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.currentTarget.value)}
            placeholder="Buscar (separa con espacios = AND)…"
            style={{
              flex: 1,
              background: "transparent",
              border: 0,
              outline: "none",
              color: "#fff",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              minWidth: 220,
              colorScheme: "dark",
            }}
          />
        </label>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {visible}/{total}
        </span>
      </div>

      <label
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-pill)",
          padding: "12px 22px",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        Orden
        <select
          value={sort}
          onChange={(e) => onSort(e.currentTarget.value as SortKey)}
          style={{
            background: "transparent",
            border: 0,
            outline: "none",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "none",
            colorScheme: "dark",
            cursor: "pointer",
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option
              key={o.key}
              value={o.key}
              style={{ background: "var(--ink-900)", color: "#fff" }}
            >
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "36px 32px",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-md)",
        color: "rgba(255,255,255,0.55)",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}
