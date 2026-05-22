"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TrashItem } from "@/lib/trash";

export function TrashRow({ item }: { item: TrashItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);

  async function call(method: "PATCH" | "DELETE", confirmMessage?: string) {
    if (busy) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(method === "PATCH" ? "restore" : "delete");
    try {
      const res = await fetch(`/api/trash/${item.type}/${item.id}`, { method });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        window.alert(data?.error ?? `Error (${res.status})`);
        setBusy(null);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      window.alert((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <li
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 18,
            lineHeight: 1.2,
            color: "#fff",
            margin: 0,
          }}
        >
          {item.name}
        </h3>
        {item.hint && (
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              lineHeight: 1.45,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.hint}
          </p>
        )}
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.4)",
            marginTop: 4,
          }}
        >
          eliminado {formatRelative(item.deleted_at)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => call("PATCH")}
          disabled={busy !== null || pending}
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "var(--radius-pill)",
            color: "rgba(255,255,255,0.85)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <RotateCcw size={12} />
          {busy === "restore" ? "Restaurando…" : "Restaurar"}
        </button>
        <button
          type="button"
          onClick={() =>
            call(
              "DELETE",
              `¿Eliminar «${item.name}» definitivamente? También se borrarán sus runs y respuestas. Esta acción no se puede deshacer.`,
            )
          }
          disabled={busy !== null || pending}
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "transparent",
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-pill)",
            color: "var(--error-500)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <Trash2 size={12} />
          {busy === "delete" ? "Eliminando…" : "Eliminar para siempre"}
        </button>
      </div>
    </li>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "ahora";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} días`;
  return iso.slice(0, 10);
}
