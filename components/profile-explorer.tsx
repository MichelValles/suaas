"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
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

export type ProfileExplorerProps = {
  profiles: Profile[];
  /**
   * "manage": expone acciones por fila (ver / editar / eliminar) y selección
   * para futuras acciones masivas. "picker": modo embebido en un launch
   * panel, ofrece selección hacia arriba.
   */
  mode: "manage" | "picker";
  initialView?: ViewMode;
  /** Notifica selección al padre (modo picker). */
  onSelectionChange?: (ids: string[]) => void;
  /** Acción de eliminación; sólo en modo manage. */
  onDelete?: (id: string) => Promise<void> | void;
  /**
   * Slot opcional a la derecha de la toolbar. Recibe el conjunto actual de
   * perfiles visibles (tras filtros) y la selección, útil para exportar.
   */
  extraActions?: (ctx: { visible: Profile[]; selectedIds: string[] }) => React.ReactNode;
};

export function ProfileExplorer({
  profiles,
  mode,
  initialView = "grid",
  onSelectionChange,
  onDelete,
  extraActions,
}: ProfileExplorerProps) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [filters, setFilters] = useState<ProfileFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterProfiles(profiles, filters), [profiles, filters]);
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
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-md)",
            color: "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          {profiles.length === 0
            ? "Sin perfiles. Crea el primero."
            : "Ningún perfil coincide con los filtros."}
        </div>
      ) : view === "grid" ? (
        <ProfileGrid
          profiles={filtered}
          mode={mode}
          selected={selected}
          onToggle={toggle}
          onDelete={onDelete}
        />
      ) : (
        <ProfileTable
          profiles={filtered}
          mode={mode}
          selected={selected}
          onToggle={toggle}
          onDelete={onDelete}
        />
      )}
    </section>
  );
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
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 14px",
            color: "#fff",
            fontSize: 13,
            outline: "none",
            fontFamily: "var(--font-sans)",
            minWidth: 280,
            colorScheme: "dark",
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
            color: filtersActive ? "var(--ink-900)" : "rgba(255,255,255,0.75)",
            border: `1px solid ${filtersActive ? "var(--accent-500)" : "rgba(255,255,255,0.12)"}`,
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
              color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.12)",
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
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {visible}/{total}
          {selectedCount > 0 && (
            <>
              {" · "}
              <span style={{ color: "var(--accent-500)" }}>{selectedCount} sel.</span>
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
                color: "rgba(255,255,255,0.6)",
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
            border: "1px solid rgba(255,255,255,0.12)",
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
        color: active ? "var(--ink-900)" : "rgba(255,255,255,0.7)",
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
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        background: "rgba(255,255,255,0.02)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <RangeField label="Edad" value={filters.age} min={0} max={120} step={1} onChange={(v) => set("age", v)} />
      <RangeField label="Apertura" value={filters.openness} min={0} max={1} step={0.05} onChange={(v) => set("openness", v)} />
      <RangeField label="Conciencia" value={filters.conscientiousness} min={0} max={1} step={0.05} onChange={(v) => set("conscientiousness", v)} />
      <RangeField label="Extraversión" value={filters.extraversion} min={0} max={1} step={0.05} onChange={(v) => set("extraversion", v)} />
      <RangeField label="Amabilidad" value={filters.agreeableness} min={0} max={1} step={0.05} onChange={(v) => set("agreeableness", v)} />
      <RangeField label="Neuroticismo" value={filters.neuroticism} min={0} max={1} step={0.05} onChange={(v) => set("neuroticism", v)} />
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
          color: "rgba(255,255,255,0.55)",
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
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  fontFamily: "var(--font-sans)",
  colorScheme: "dark",
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
  return (
    <li>
      <div
        className="profile-card"
        data-selected={selected ? "true" : "false"}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 16,
          border: `1px solid ${selected ? "var(--accent-500)" : "rgba(255,255,255,0.08)"}`,
          background: selected ? "rgba(250,204,13,0.06)" : "rgba(255,255,255,0.02)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={selected} onChange={onToggle} />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {profile.demographics.age} · {profile.demographics.gender}
            </span>
          </label>
          {mode === "manage" && (
            <RowActions profile={profile} onDelete={onDelete} />
          )}
        </div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1.15,
            color: "#fff",
            margin: 0,
          }}
        >
          {profile.name}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>
          {profile.demographics.occupation}
          {profile.demographics.geo ? ` · ${profile.demographics.geo}` : ""}
        </p>
        <BigFiveDots b={profile.big_five} />
        <BackstoryHover backstory={profile.backstory} />
      </div>
    </li>
  );
}

function BigFiveDots({ b }: { b: Profile["big_five"] }) {
  const items: { k: string; v: number }[] = [
    { k: "O", v: b.openness },
    { k: "C", v: b.conscientiousness },
    { k: "E", v: b.extraversion },
    { k: "A", v: b.agreeableness },
    { k: "N", v: b.neuroticism },
  ];
  return (
    <div
      className="mono"
      style={{
        display: "flex",
        gap: 8,
        fontSize: 10,
        letterSpacing: "0.14em",
        color: "rgba(255,255,255,0.55)",
      }}
    >
      {items.map((i) => (
        <span key={i.k}>
          {i.k}
          <span style={{ color: "rgba(255,255,255,0.85)", marginLeft: 4 }}>
            {Math.round(i.v * 100)}
          </span>
        </span>
      ))}
    </div>
  );
}

function BackstoryHover({ backstory }: { backstory: string }) {
  return (
    <div className="profile-hover">
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          cursor: "help",
        }}
      >
        backstory ↗
      </span>
      <div className="profile-hover-panel">{backstory}</div>
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
}: {
  profiles: Profile[];
  mode: "manage" | "picker";
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "rgba(255,255,255,0.55)" }}>
            <Th></Th>
            <Th>Nombre</Th>
            <Th>Edad</Th>
            <Th>Género</Th>
            <Th>Ocupación</Th>
            <Th>Geo</Th>
            <Th>O · C · E · A · N</Th>
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
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: selected.has(p.id) ? "rgba(250,204,13,0.06)" : "transparent",
              }}
            >
              <Td>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => onToggle(p.id)}
                />
              </Td>
              <Td>
                <div className="profile-hover" style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "#fff" }}>{p.name}</span>
                  <div className="profile-hover-panel">{p.backstory}</div>
                </div>
              </Td>
              <Td>{p.demographics.age}</Td>
              <Td>{p.demographics.gender}</Td>
              <Td>{p.demographics.occupation}</Td>
              <Td>{p.demographics.geo ?? "—"}</Td>
              <Td>
                <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  {Math.round(p.big_five.openness * 100)} · {Math.round(p.big_five.conscientiousness * 100)} ·{" "}
                  {Math.round(p.big_five.extraversion * 100)} · {Math.round(p.big_five.agreeableness * 100)} ·{" "}
                  {Math.round(p.big_five.neuroticism * 100)}
                </span>
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

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      className="mono"
      style={{
        padding: "8px 12px",
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
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>{children}</td>;
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
    const ok = window.confirm(`¿Eliminar el perfil «${profile.name}»? Esto borrará también sus runs y respuestas.`);
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
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "var(--radius-sm)",
          color: "rgba(255,255,255,0.6)",
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
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-sm)",
        color: "rgba(255,255,255,0.6)",
      }}
    >
      {children}
    </Link>
  );
}
