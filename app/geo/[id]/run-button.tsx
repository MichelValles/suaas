"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GeoRunButton({ geoId }: { geoId: string }) {
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setStatus("running");
    setError(null);
    try {
      const res = await fetch("/api/geo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geoId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }
      router.refresh();
      setStatus("idle");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn-pill solid"
        disabled={status === "running"}
        onClick={handleClick}
      >
        {status === "running" ? "Analizando..." : "Analizar"}
      </button>
      {error && (
        <span
          style={{
            fontSize: 12,
            color: "#f87171",
            maxWidth: 300,
            lineHeight: 1.4,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
