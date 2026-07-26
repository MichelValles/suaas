"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Botón de generación (o regeneración) del retrato IA del perfil.
 * La llamada tarda 10-30 s: estado de progreso explícito.
 */
export function AvatarButton({
  profileId,
  hasAvatar,
  estimatedUsd,
}: {
  profileId: string;
  hasAvatar: boolean;
  estimatedUsd: number;
}) {
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setStatus("running");
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/avatar`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }
      track("avatar_generated", { regenerated: hasAvatar });
      router.refresh();
      setStatus("idle");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  const label = hasAvatar ? "Regenerar retrato" : "Generar retrato";
  const price = estimatedUsd.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn-pill"
        disabled={status === "running"}
        onClick={handleClick}
      >
        {status === "running" ? "Generando retrato..." : `${label} · ~${price} $`}
      </button>
      {error && (
        <span
          role="alert"
          style={{ fontSize: 12, color: "var(--error-text)", lineHeight: 1.4 }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
