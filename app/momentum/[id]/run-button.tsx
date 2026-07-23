"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/model-pricing";

export function MomentumRunButton({
  challengeId,
  estimatedUsd,
}: {
  challengeId: string;
  /** Coste estimado del análisis en dólares (calculado server-side). */
  estimatedUsd?: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/momentum/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Error al lanzar el análisis.");
      } else {
        track("run_launched", { kind: "momentum" });
        router.refresh();
      }
    } catch {
      alert("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-pill solid"
      onClick={handleClick}
      disabled={loading}
    >
      {loading
        ? "Analizando..."
        : estimatedUsd != null
          ? `Analizar · ~${formatUsd(estimatedUsd)}`
          : "Analizar"}
    </button>
  );
}
