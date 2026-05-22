"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TrashType } from "@/lib/trash";

/**
 * Botón pequeño cuadrado para enviar una entidad (target, embudo, A/B, copy
 * deck, oferta de pricing) a la papelera. Pide confirmación, llama al
 * endpoint POST /api/trash/[type]/[id] y refresca la página.
 *
 * Pensado para encajar en una esquina de las cards de listado (overlay).
 */
export function SendToTrashButton({
  type,
  id,
  name,
  size = 32,
}: {
  type: TrashType;
  id: string;
  name: string;
  size?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const ok = window.confirm(
      `¿Enviar «${name}» a la papelera? Podrás restaurarlo o eliminarlo desde Sistema → Papelera.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trash/${type}/${id}`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        window.alert(data?.error ?? `Error al enviar a papelera (${res.status})`);
        setBusy(false);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      window.alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || pending}
      title="Enviar a papelera"
      aria-label={`Enviar ${name} a la papelera`}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: "rgba(10,11,13,0.72)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-sm)",
        color: "rgba(255,255,255,0.7)",
        cursor: busy || pending ? "wait" : "pointer",
        backdropFilter: "blur(6px)",
        transition:
          "color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--error-500)";
        e.currentTarget.style.borderColor = "var(--error-500)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
