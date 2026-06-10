"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const POLL_MS = 5000;
/** Pasado este tiempo en «running» el run se considera interrumpido. */
const STALE_MS = 10 * 60 * 1000;

/**
 * Barra de progreso de un run de campaña en marcha. Pollea el GET de
 * /api/runs/campaign cada 5s; al terminar refresca la página (Server
 * Component) para pintar los resultados completos. Si el run lleva más
 * de 10 minutos en «running» (función cortada por la plataforma) o quedó
 * en «error» con menos respuestas de las esperadas, ofrece «Retomar»:
 * relanza solo las combinaciones que faltan (resumeRunId).
 */
export function RunProgress({
  runId,
  initialStatus,
  initialDone,
  expected,
  startedAt,
}: {
  runId: string;
  initialStatus: string;
  initialDone: number;
  expected: number;
  startedAt: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [done, setDone] = useState(initialDone);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/campaign?runId=${runId}`);
        const json = await res.json();
        if (!res.ok || !json.ok) return;
        setDone(json.done);
        if (json.status !== "running" && !finishedRef.current) {
          finishedRef.current = true;
          setStatus(json.status);
          router.refresh();
        }
      } catch {
        // fallo puntual de red: el siguiente tick reintenta
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [runId, status, router]);

  async function resume() {
    setError(null);
    setResuming(true);
    try {
      const res = await fetch("/api/runs/campaign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeRunId: runId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      finishedRef.current = false;
      setStatus("running");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResuming(false);
    }
  }

  const stale =
    status === "running" && Date.now() - new Date(startedAt).getTime() > STALE_MS;
  const interrupted = status === "error" && done > 0 && done < expected;
  const pct = expected > 0 ? Math.min(100, Math.round((done / expected) * 100)) : 0;

  if (status === "done" || (status === "error" && !interrupted)) return null;

  return (
    <section
      style={{
        padding: "18px 20px",
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.7)",
          }}
        >
          {status === "running" && <Loader2 size={13} className="spin" />}
          {interrupted ? "Run interrumpido" : "Run en marcha"}
        </span>
        <span className="mono" style={{ fontSize: 12, color: "rgba(var(--fg),0.7)" }}>
          {done} / {expected} respuestas
        </span>
      </div>

      <div
        style={{
          height: 8,
          background: "rgba(var(--fg),0.06)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--accent-500)",
            transition: "width var(--dur-med) var(--ease-out)",
          }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "rgba(var(--fg),0.6)" }}>
        {interrupted
          ? `El run quedó interrumpido: se muestran ${done} respuestas parciales de ${expected}.`
          : "Los resultados de abajo se completan según llegan las respuestas. La página se refresca sola al terminar."}
      </p>

      {(stale || interrupted) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-pill solid"
            disabled={resuming}
            onClick={resume}
            style={{ fontSize: 12 }}
          >
            {resuming ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={12} className="spin" /> Retomando…
              </span>
            ) : (
              "Retomar las combinaciones que faltan"
            )}
          </button>
          {stale && !interrupted && (
            <span style={{ fontSize: 12, color: "rgba(var(--fg),0.55)" }}>
              Lleva más de 10 minutos en marcha: probablemente la función fue cortada.
            </span>
          )}
          {error && (
            <span style={{ fontSize: 12, color: "var(--error-text)" }}>{error}</span>
          )}
        </div>
      )}
    </section>
  );
}
