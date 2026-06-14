"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";

export type PickerBrand = {
  id: string;
  name: string;
  description: string;
  context: string;
};

/**
 * Selector de marca de Cerebro. Carga las marcas guardadas y, al elegir una,
 * llama a onPick con su nombre y su contexto (descripción + documentos) para
 * que el formulario rellene sus campos de marca. No muestra nada mientras
 * carga; si no hay marcas, ofrece un enlace para crearlas. El usuario siempre
 * puede ignorar el selector y escribir a mano en el cajón de texto.
 */
export function BrandPicker({
  onPick,
  onClear,
  hint = "Rellena los campos de marca desde una marca de Cerebro. Puedes editar el texto después.",
}: {
  onPick: (brand: PickerBrand) => void;
  onClear?: () => void;
  hint?: string;
}) {
  const [brands, setBrands] = useState<PickerBrand[] | null>(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/brands")
      .then((r) => (r.ok ? r.json() : { brands: [] }))
      .then((d) => {
        if (alive) setBrands((d?.brands ?? []) as PickerBrand[]);
      })
      .catch(() => {
        if (alive) setBrands([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (brands === null) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
        }}
      >
        <BrainCircuit size={12} />
        Cerebro
      </span>

      {brands.length === 0 ? (
        <p style={{ fontSize: 12, color: "rgba(var(--fg),0.5)", margin: 0, lineHeight: 1.5 }}>
          No tienes marcas guardadas todavía.{" "}
          <Link href="/cerebro/new" style={{ color: "var(--accent-text)" }}>
            Crea una en Cerebro
          </Link>{" "}
          para reutilizarla aquí.
        </p>
      ) : (
        <select
          value={selectedId}
          onChange={(e) => {
            const id = e.currentTarget.value;
            setSelectedId(id);
            if (id === "") {
              onClear?.();
              return;
            }
            const picked = brands.find((b) => b.id === id);
            if (picked) onPick(picked);
          }}
          aria-label="Rellenar desde una marca de Cerebro"
          style={{
            background: "rgba(var(--fg),0.03)",
            border: "1px solid rgba(var(--fg),0.12)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            color: "var(--text-strong)",
            fontSize: 14,
            outline: "none",
            fontFamily: "var(--font-sans)",
            width: "100%",
            boxSizing: "border-box",
            cursor: "pointer",
          }}
        >
          <option value="">Rellenar desde una marca…</option>
          {brands.map((b) => (
            <option
              key={b.id}
              value={b.id}
              style={{ background: "var(--surface-app)", color: "var(--text-strong)" }}
            >
              {b.name}
            </option>
          ))}
        </select>
      )}

      <span style={{ fontSize: 11, color: "rgba(var(--fg),0.4)", lineHeight: 1.5 }}>
        {hint}
      </span>
    </div>
  );
}
