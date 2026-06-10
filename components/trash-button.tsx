"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TrashType } from "@/lib/trash";

/**
 * Botón pequeño cuadrado para enviar una entidad (cualquier TrashType:
 * target, embudo, A/B, copy deck, pricing, campaña, análisis GEO, Trigger
 * de Momentum o perfil) a la papelera. Pide confirmación, llama al
 * endpoint POST /api/trash/[type]/[id] y refresca la página.
 *
 * Dos variantes: «overlay» (por defecto, posicionado en una esquina de la
 * card con fondo y blur) e «inline», un icono plano sin fondo ni borde
 * para encajar dentro del flujo de la card.
 */
export function SendToTrashButton({
  type,
  id,
  name,
  size = 32,
  variant = "overlay",
}: {
  type: TrashType;
  id: string;
  name: string;
  size?: number;
  variant?: "overlay" | "inline";
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

  const inline = variant === "inline";
  const restColor = inline ? "rgba(var(--fg),0.25)" : "rgba(var(--fg),0.7)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || pending}
      title="Enviar a papelera"
      aria-label={`Enviar ${name} a la papelera`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: restColor,
        cursor: busy || pending ? "wait" : "pointer",
        transition:
          "color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out)",
        ...(inline
          ? { background: "none", border: "none", padding: 4 }
          : {
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
              width: size,
              height: size,
              background: "rgba(10,11,13,0.72)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-sm)",
              backdropFilter: "blur(6px)",
            }),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = inline ? "var(--error-text)" : "var(--error-500)";
        if (!inline) e.currentTarget.style.borderColor = "var(--error-500)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = restColor;
        if (!inline) e.currentTarget.style.borderColor = "rgba(var(--fg),0.12)";
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
