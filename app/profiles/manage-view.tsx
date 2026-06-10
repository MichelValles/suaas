"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Download, Sparkles, Upload } from "lucide-react";
import { OnboardShareModal } from "@/components/onboard-share-modal";
import { ProfileExplorer } from "@/components/profile-explorer";
import { stringifyCSV } from "@/lib/csv";
import { PROFILE_CSV_HEADERS, profileToCsvRow } from "@/lib/profile-csv";
import type { Profile } from "@/lib/profiles";

export function ProfilesManageView({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleDelete(id: string) {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      window.alert(`No se pudo borrar: ${json?.error ?? res.statusText}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <ProfileExplorer
      profiles={profiles}
      mode="manage"
      onDelete={handleDelete}
      extraActions={({ visible, selectedIds }) => (
        <ToolbarExtras visible={visible} selectedIds={selectedIds} />
      )}
    />
  );
}

function ToolbarExtras({
  visible,
  selectedIds,
}: {
  visible: Profile[];
  selectedIds: string[];
}) {
  function exportCsv() {
    const target =
      selectedIds.length > 0
        ? visible.filter((p) => selectedIds.includes(p.id))
        : visible;
    if (target.length === 0) {
      window.alert("No hay perfiles que exportar.");
      return;
    }
    const csv = stringifyCSV(
      target.map(profileToCsvRow),
      [...PROFILE_CSV_HEADERS],
      { separator: "," },
    );
    // Prepend BOM para que Excel respete UTF-8.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `suaas-profiles-${ts}-${target.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const exportLabel =
    selectedIds.length > 0
      ? `Exportar ${selectedIds.length} seleccionados`
      : `Exportar ${visible.length} visibles`;

  return (
    <>
      <OnboardShareModal />
      <button
        type="button"
        onClick={exportCsv}
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "transparent",
          color: "rgba(var(--fg),0.75)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-pill)",
          cursor: "pointer",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "inherit",
        }}
        title={exportLabel}
      >
        <Download size={14} />
        Exportar CSV
      </button>
      <Link
        href="/profiles/import"
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "transparent",
          color: "rgba(var(--fg),0.75)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-pill)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "inherit",
        }}
      >
        <Upload size={14} />
        Importar CSV
      </Link>
      <Link
        href="/profiles/seed"
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "transparent",
          color: "rgba(var(--fg),0.75)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-pill)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "inherit",
        }}
      >
        <Sparkles size={14} />
        Generar con LLM
      </Link>
    </>
  );
}
