"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  Pencil,
  Rows3,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/profiles";
import {
  DEFAULT_FILTERS,
  filterProfiles,
  isDefaultFilters,
  type ProfileFilters,
  type Range,
} from "@/lib/profile-filters";

type ViewMode = "grid" | "table";

type SortKey = "name" | "age" | "gender" | "occupation" | "geo";
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

const PAGE_SIZE = 30;

export type ProfileExplorerProps = {
  profiles: Profile[];
  mode: "manage" | "picker";
  initialView?: ViewMode;
  /** Ids preseleccionados al montar (p.ej. «Repetir con esta muestra»). */
  initialSelected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onDelete?: (id: string) => Promise<void> | void;
  extraActions?: (ctx: { visible: Profile[]; selectedIds: string[] }) => React.ReactNode;
};

export function ProfileExplorer({
  profiles,
  mode,
  initialView = "grid",
  initialSelected,
  onSelectionChange,
  onDelete,
  extraActions,
}: ProfileExplorerProps) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [filters, setFilters] = useState<ProfileFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected ?? []),
  );
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterProfiles(profiles, filters), [profiles, filters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => dir * compareBy(a, b, sort.key));
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  // Resetea la paginación cuando cambian filtros, vista u ordenación.
  useEffect(() => {
    setPage(1);
  }, [filters, view, sort]);

  const filteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      onSelectionChange?.([...next]);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
    onSelectionChange?.([]);
  }
  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Toolbar
        view={view}
        onViewChange={setView}
        filtersOpen={filtersOpen}
        onFiltersToggle={() => setFiltersOpen((v) => !v)}
        filtersActive={!isDefaultFilters(filters)}
        text={filters.text}
        onTextChange={(text) => setFilters((f) => ({ ...f, text }))}
        total={profiles.length}
        visible={filtered.length}
        selectedCount={selected.size}
        onClearSelection={selected.size > 0 ? clearSelection : undefined}
        allFilteredSelected={allFilteredSelected}
        onToggleAll={filtered.length > 0 ? selectAllVisible : undefined}
        extras={extraActions?.({ visible: filtered, selectedIds: [...selected] })}
      />
      {filtersOpen && (
        <FiltersPanel
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: "1px dashed rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.55)",
            fontSize: 13,
          }}
        >
          {profiles.length === 0
            ? "Sin perfiles. Crea el primero."
            : "Ningún perfil coincide con los filtros."}
        </div>
      ) : view === "grid" ? (
        <ProfileGrid
          profiles={paged}
          mode={mode}
          selected={selected}
          onToggle={toggle}
          onDelete={onDelete}
        />
      ) : (
        <ProfileTable
          profiles={paged}
          mode={mode}
          selected={selected}
          onToggle={toggle}
          onDelete={onDelete}
          sort={sort}
          onSort={toggleSort}
        />
      )}

      {sorted.length > PAGE_SIZE && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageStart={pageStart}
          pageEnd={Math.min(pageStart + PAGE_SIZE, sorted.length)}
          onChange={setPage}
        />
      )}
    </section>
  );
}

// ============================================================
// Sort helpers
// ============================================================

function compareBy(a: Profile, b: Profile, key: SortKey): number {
  const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
  switch (key) {
    case "name":
      return collator.compare(a.name, b.name);
    case "age":
      return a.demographics.age - b.demographics.age;
    case "gender":
      return collator.compare(a.demographics.gender, b.demographics.gender);
    case "occupation":
      return collator.compare(a.demographics.occupation, b.demographics.occupation);
    case "geo":
      return collator.compare(a.demographics.geo ?? "", b.demographics.geo ?? "");
  }
}

// ============================================================
// Toolbar
// ============================================================

function Toolbar({
  view,
  onViewChange,
  filtersOpen,
  onFiltersToggle,
  filtersActive,
  text,
  onTextChange,
  total,
  visible,
  selectedCount,
  onClearSelection,
  allFilteredSelected,
  onToggleAll,
  extras,
}: {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  filtersOpen: boolean;
  onFiltersToggle: () => void;
  filtersActive: boolean;
  text: string;
  onTextChange: (t: string) => void;
  total: number;
  visible: number;
  selectedCount: number;
  onClearSelection?: () => void;
  allFilteredSelected: boolean;
  onToggleAll?: () => void;
  extras?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="search"
          value={text}
          onChange={(e) => onTextChange(e.currentTarget.value)}
          placeholder="Buscar (palabras separadas por espacio = AND)…"
          style={{
            background: "rgba(var(--fg),0.03)",
            border: "1px solid rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 14px",
            color: "var(--text-strong)",
            fontSize: 13,
            outline: "none",
            fontFamily: "var(--font-sans)",
            minWidth: 280,
          }}
        />
        <button
          type="button"
          onClick={onFiltersToggle}
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: filtersActive ? "var(--accent-500)" : "transparent",
            color: filtersActive ? "var(--ink-900)" : "rgba(var(--fg),0.75)",
            border: `1px solid ${filtersActive ? "var(--accent-500)" : "rgba(var(--fg),0.12)"}`,
            borderRadius: "var(--radius-pill)",
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "inherit",
          }}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={14} />
          Filtros{filtersActive ? " · activos" : ""}
        </button>
        {onToggleAll && (
          <button
            type="button"
            onClick={onToggleAll}
            className="mono"
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: "rgba(var(--fg),0.65)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
          >
            {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        )}
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.5)",
          }}
        >
          {visible}/{total}
          {selectedCount > 0 && (
            <>
              {" · "}
              <span style={{ color: "var(--accent-text)" }}>{selectedCount} sel.</span>
            </>
          )}
          {selectedCount > 0 && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              style={{
                marginLeft: 6,
                background: "transparent",
                border: 0,
                color: "rgba(var(--fg),0.6)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                padding: 0,
              }}
              aria-label="Limpiar selección"
            >
              <X size={12} />
            </button>
          )}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {extras}
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            border: "1px solid rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-pill)",
          }}
        >
          <ViewToggle current={view} value="grid" onClick={() => onViewChange("grid")}>
            <LayoutGrid size={14} /> Grid
          </ViewToggle>
          <ViewToggle current={view} value="table" onClick={() => onViewChange("table")}>
            <Rows3 size={14} /> Tabla
          </ViewToggle>
        </div>
      </div>
    </div>
  );
}

function ViewToggle({
  current,
  value,
  onClick,
  children,
}: {
  current: ViewMode;
  value: ViewMode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: active ? "var(--accent-500)" : "transparent",
        color: active ? "var(--ink-900)" : "rgba(var(--fg),0.7)",
        border: 0,
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

// ============================================================
// Filtros panel
// ============================================================

function FiltersPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: ProfileFilters;
  onChange: (f: ProfileFilters) => void;
  onReset: () => void;
}) {
  function set<K extends keyof ProfileFilters>(key: K, value: ProfileFilters[K]) {
    onChange({ ...filters, [key]: value });
  }
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        background: "rgba(var(--fg),0.02)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <RangeField label="Edad" value={filters.age} min={0} max={120} step={1} onChange={(v) => set("age", v)} />
      <RangeField label="Apertura" value={filters.openness} min={0} max={1} step={0.01} onChange={(v) => set("openness", v)} />
      <RangeField label="Conciencia" value={filters.conscientiousness} min={0} max={1} step={0.01} onChange={(v) => set("conscientiousness", v)} />
      <RangeField label="Extraversión" value={filters.extraversion} min={0} max={1} step={0.01} onChange={(v) => set("extraversion", v)} />
      <RangeField label="Amabilidad" value={filters.agreeableness} min={0} max={1} step={0.01} onChange={(v) => set("agreeableness", v)} />
      <RangeField label="Neuroticismo" value={filters.neuroticism} min={0} max={1} step={0.01} onChange={(v) => set("neuroticism", v)} />
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <button
          type="button"
          onClick={onReset}
          className="btn-pill"
          style={{ fontSize: 11, padding: "8px 16px" }}
        >
          Reset filtros
        </button>
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: Range;
  min: number;
  max: number;
  step: number;
  onChange: (v: Range) => void;
}) {
  const [lo, hi] = value;
  return (
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
        {label}
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          type="number"
          value={lo}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.currentTarget.value);
            if (!Number.isFinite(v)) return;
            onChange([Math.min(v, hi), hi]);
          }}
          style={smallInputStyle}
          inputMode={step >= 1 ? "numeric" : "decimal"}
        />
        <input
          type="number"
          value={hi}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.currentTarget.value);
            if (!Number.isFinite(v)) return;
            onChange([lo, Math.max(v, lo)]);
          }}
          style={smallInputStyle}
          inputMode={step >= 1 ? "numeric" : "decimal"}
        />
      </div>
    </div>
  );
}

const smallInputStyle: React.CSSProperties = {
  background: "rgba(var(--fg),0.03)",
  border: "1px solid rgba(var(--fg),0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  color: "var(--text-strong)",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--font-sans)",
};

// ============================================================
// Grid view
// ============================================================

function ProfileGrid({
  profiles,
  mode,
  selected,
  onToggle,
  onDelete,
}: {
  profiles: Profile[];
  mode: "manage" | "picker";
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {profiles.map((p) => (
        <ProfileCard
          key={p.id}
          profile={p}
          mode={mode}
          selected={selected.has(p.id)}
          onToggle={() => onToggle(p.id)}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function ProfileCard({
  profile,
  mode,
  selected,
  onToggle,
  onDelete,
}: {
  profile: Profile;
  mode: "manage" | "picker";
  selected: boolean;
  onToggle: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const barriersCount =
    (profile.com_b_barriers.capability?.length ?? 0) +
    (profile.com_b_barriers.opportunity?.length ?? 0) +
    (profile.com_b_barriers.motivation?.length ?? 0);

  return (
    <li style={{ display: "flex" }}>
      <div
        className="profile-card"
        data-selected={selected ? "true" : "false"}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 18,
          border: `1px solid ${selected ? "var(--accent-500)" : "rgba(var(--fg),0.08)"}`,
          background: selected ? "rgba(250,204,13,0.06)" : "rgba(var(--fg),0.02)",
          borderRadius: "var(--radius-md)",
          width: "100%",
          minHeight: 220,
          transition:
            "border-color var(--dur-short) var(--ease-out), background var(--dur-short) var(--ease-out)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              aria-label={`Seleccionar ${profile.name}`}
            />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.5)",
              }}
            >
              {profile.demographics.age} · {profile.demographics.gender}
            </span>
          </label>
          {mode === "manage" && <RowActions profile={profile} onDelete={onDelete} />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {profile.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={`Retrato generado por IA de ${profile.name}`}
                width={40}
                height={40}
                loading="lazy"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid rgba(var(--fg),0.12)",
                  flexShrink: 0,
                }}
              />
            )}
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                lineHeight: 1.15,
                color: "var(--text-strong)",
                margin: 0,
              }}
            >
              {profile.name}
            </h3>
          </div>
          <p
            style={{
              color: "rgba(var(--fg),0.7)",
              fontSize: 13,
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {profile.demographics.occupation}
          </p>
          {profile.demographics.geo && (
            <p
              style={{
                color: "rgba(var(--fg),0.45)",
                fontSize: 12,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {profile.demographics.geo}
            </p>
          )}
        </div>

        <BigFiveBars b={profile.big_five} />

        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.4)",
            paddingTop: 8,
            borderTop: "1px solid rgba(var(--fg),0.05)",
          }}
        >
          <span>{barriersCount} barrera{barriersCount === 1 ? "" : "s"} COM-B</span>
          {profile.demographics.income_band && (
            <span>{profile.demographics.income_band}</span>
          )}
        </div>
      </div>
    </li>
  );
}

// ============================================================
// Big Five visual
// ============================================================

const BIG_FIVE_LABELS: Array<{ k: keyof Profile["big_five"]; label: string }> = [
  { k: "openness", label: "O" },
  { k: "conscientiousness", label: "C" },
  { k: "extraversion", label: "E" },
  { k: "agreeableness", label: "A" },
  { k: "neuroticism", label: "N" },
];

function BigFiveBars({ b }: { b: Profile["big_five"] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 6,
      }}
      title="Big Five (Apertura · Conciencia · Extraversión · Amabilidad · Neuroticismo)"
    >
      {BIG_FIVE_LABELS.map(({ k, label }) => {
        const v = b[k];
        return (
          <div
            key={k}
            style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}
          >
            <div
              style={{
                width: "100%",
                height: 5,
                background: "rgba(var(--fg),0.06)",
                borderRadius: 999,
                overflow: "hidden",
              }}
              title={`${label}: ${Math.round(v * 100)}`}
            >
              <div
                style={{
                  width: `${Math.round(v * 100)}%`,
                  height: "100%",
                  background: "var(--accent-500)",
                }}
              />
            </div>
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                color: "rgba(var(--fg),0.5)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BigFiveInlineBars({ b }: { b: Profile["big_five"] }) {
  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {BIG_FIVE_LABELS.map(({ k, label }) => {
        const v = b[k];
        return (
          <div
            key={k}
            style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", width: 32 }}
            title={`${label}: ${Math.round(v * 100)}`}
          >
            <div
              style={{
                width: "100%",
                height: 4,
                background: "rgba(var(--fg),0.06)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(v * 100)}%`,
                  height: "100%",
                  background: "var(--accent-500)",
                }}
              />
            </div>
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "rgba(var(--fg),0.5)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Table view
// ============================================================

function ProfileTable({
  profiles,
  mode,
  selected,
  onToggle,
  onDelete,
  sort,
  onSort,
}: {
  profiles: Profile[];
  mode: "manage" | "picker";
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
  sort: SortState;
  onSort: (k: SortKey) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "rgba(var(--fg),0.85)",
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "rgba(var(--fg),0.55)" }}>
            <Th></Th>
            <SortableTh sortKey="name" current={sort} onClick={() => onSort("name")}>
              Nombre
            </SortableTh>
            <SortableTh sortKey="age" current={sort} onClick={() => onSort("age")}>
              Edad
            </SortableTh>
            <SortableTh sortKey="gender" current={sort} onClick={() => onSort("gender")}>
              Género
            </SortableTh>
            <SortableTh sortKey="occupation" current={sort} onClick={() => onSort("occupation")}>
              Ocupación
            </SortableTh>
            <SortableTh sortKey="geo" current={sort} onClick={() => onSort("geo")}>
              Geo
            </SortableTh>
            <Th className="col-ocean">Big Five</Th>
            {mode === "manage" && <Th>Acciones</Th>}
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr
              key={p.id}
              data-selected={selected.has(p.id) ? "true" : "false"}
              className="profile-row"
              style={{
                borderTop: "1px solid rgba(var(--fg),0.06)",
                background: selected.has(p.id) ? "rgba(250,204,13,0.06)" : "transparent",
              }}
            >
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => onToggle(p.id)}
                  aria-label={`Seleccionar ${p.name}`}
                />
              </Td>
              <Td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {p.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={`Retrato generado por IA de ${p.name}`}
                      width={24}
                      height={24}
                      loading="lazy"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span style={{ color: "var(--text-strong)" }}>{p.name}</span>
                </span>
              </Td>
              <Td>{p.demographics.age}</Td>
              <Td>{p.demographics.gender}</Td>
              <Td>{p.demographics.occupation}</Td>
              <Td>{p.demographics.geo ?? "·"}</Td>
              <Td className="col-ocean">
                <BigFiveInlineBars b={p.big_five} />
              </Td>
              {mode === "manage" && (
                <Td>
                  <RowActions profile={p} onDelete={onDelete} />
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={className ? `mono ${className}` : "mono"}
      style={{
        padding: "10px 12px",
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      {children}
    </th>
  );
}

function SortableTh({
  children,
  sortKey,
  current,
  onClick,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  current: SortState;
  onClick: () => void;
}) {
  const active = current?.key === sortKey;
  const dir = active ? current.dir : null;
  return (
    <th
      className="mono"
      style={{
        padding: 0,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 400,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="mono"
        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          color: active ? "var(--accent-500)" : "rgba(var(--fg),0.55)",
          padding: "10px 12px",
          textAlign: "left",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontFamily: "inherit",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{children}</span>
        {dir === "asc" ? (
          <ArrowUp size={12} />
        ) : dir === "desc" ? (
          <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
        )}
      </button>
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: "12px 12px", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

// ============================================================
// Pagination
// ============================================================

function Pagination({
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onChange: (p: number) => void;
}) {
  const items = paginationRange(page, totalPages);
  return (
    <nav
      aria-label="Paginación"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        paddingTop: 8,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {pageStart + 1}–{pageEnd} de {totalItems} · {PAGE_SIZE} por página
      </span>

      <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <PageBtn
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          ariaLabel="Página anterior"
        >
          <ChevronLeft size={14} />
        </PageBtn>
        {items.map((it, idx) =>
          it === "…" ? (
            <span
              key={`gap-${idx}`}
              className="mono"
              style={{
                padding: "0 6px",
                fontSize: 11,
                color: "rgba(var(--fg),0.4)",
              }}
            >
              …
            </span>
          ) : (
            <PageBtn
              key={it}
              active={it === page}
              onClick={() => onChange(it)}
              ariaLabel={`Página ${it}`}
            >
              {it}
            </PageBtn>
          ),
        )}
        <PageBtn
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          ariaLabel="Página siguiente"
        >
          <ChevronRight size={14} />
        </PageBtn>
      </div>
    </nav>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className="mono"
      style={{
        minWidth: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 8px",
        background: active ? "var(--accent-500)" : "transparent",
        color: active ? "var(--ink-900)" : disabled ? "rgba(var(--fg),0.25)" : "rgba(var(--fg),0.7)",
        border: `1px solid ${active ? "var(--accent-500)" : "rgba(var(--fg),0.12)"}`,
        borderRadius: "var(--radius-sm)",
        fontSize: 11,
        letterSpacing: "0.16em",
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function paginationRange(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "…"> = [1];
  if (current > 3) out.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}

// ============================================================
// Row actions
// ============================================================

function RowActions({
  profile,
  onDelete,
}: {
  profile: Profile;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!onDelete) return;
    const ok = window.confirm(
      `¿Enviar el perfil «${profile.name}» a la papelera? Sus runs y respuestas se conservan; podrás restaurarlo desde Sistema → Papelera.`,
    );
    if (!ok) return;
    await onDelete(profile.id);
  }
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      <IconLink href={`/profiles/${profile.id}`} label="Ver">
        <Eye size={14} />
      </IconLink>
      <IconLink href={`/profiles/${profile.id}/edit`} label="Editar">
        <Pencil size={14} />
      </IconLink>
      <button
        type="button"
        onClick={confirmDelete}
        title="Eliminar"
        aria-label={`Eliminar ${profile.name}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          background: "transparent",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          color: "rgba(var(--fg),0.6)",
          cursor: "pointer",
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        background: "transparent",
        border: "1px solid rgba(var(--fg),0.12)",
        borderRadius: "var(--radius-sm)",
        color: "rgba(var(--fg),0.6)",
      }}
    >
      {children}
    </Link>
  );
}
