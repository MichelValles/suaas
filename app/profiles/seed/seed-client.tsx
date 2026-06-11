"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatUsd } from "@/lib/model-pricing";

type Log =
  | { kind: "ok"; index: number; total: number; name: string; seed: string }
  | { kind: "err"; index: number; total: number; seed: string; message: string }
  | { kind: "info"; text: string };

type Phase = "idle" | "running" | "done" | "error";

export function SeedClient({
  maxN,
  defaultN,
  usdPerProfile,
}: {
  maxN: number;
  defaultN: number;
  /** Coste estimado por perfil en dólares (Opus, calculado server-side). */
  usdPerProfile?: number | null;
}) {
  const router = useRouter();
  const [n, setN] = useState<number>(defaultN);
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<Log[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [fatal, setFatal] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const okCount = logs.filter((l) => l.kind === "ok").length;
  const errCount = logs.filter((l) => l.kind === "err").length;

  async function generate() {
    setPhase("running");
    setLogs([]);
    setProgress({ done: 0, total: n });
    setFatal(null);

    let res: Response;
    try {
      res = await fetch("/api/profiles/seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n }),
      });
    } catch (err) {
      setFatal((err as Error).message);
      setPhase("error");
      return;
    }
    if (!res.body) {
      setFatal("Sin stream del servidor.");
      setPhase("error");
      return;
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setFatal(json?.error ?? `HTTP ${res.status}`);
      setPhase("error");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            applyEvent(event);
          } catch {
            // ignora líneas mal formadas
          }
        }
      }
      setPhase("done");
      startTransition(() => router.refresh());
    } catch (err) {
      setFatal((err as Error).message);
      setPhase("error");
    }
  }

  function applyEvent(event: unknown) {
    const e = event as { type: string } & Record<string, unknown>;
    if (e.type === "started") {
      setProgress({ done: 0, total: e.total as number });
      setLogs((prev) => [...prev, { kind: "info", text: `Inicio · ${e.total} perfiles` }]);
    } else if (e.type === "progress") {
      setProgress({ done: e.index as number, total: e.total as number });
      setLogs((prev) => [
        ...prev,
        {
          kind: "ok",
          index: e.index as number,
          total: e.total as number,
          name: e.name as string,
          seed: e.seed as string,
        },
      ]);
    } else if (e.type === "error") {
      setProgress({ done: e.index as number, total: e.total as number });
      setLogs((prev) => [
        ...prev,
        {
          kind: "err",
          index: e.index as number,
          total: e.total as number,
          seed: e.seed as string,
          message: e.message as string,
        },
      ]);
    } else if (e.type === "done") {
      setLogs((prev) => [
        ...prev,
        {
          kind: "info",
          text: `Listo · ${e.created as number} creados, ${e.failed as number} fallidos.`,
        },
      ]);
    } else if (e.type === "fatal") {
      setFatal((e.message as string) ?? "Error fatal");
    }
  }

  const pct = progress.total === 0 ? 0 : (progress.done / progress.total) * 100;
  const running = phase === "running";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960, width: "100%", marginInline: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          alignItems: "end",
          padding: 20,
          border: "1px solid rgba(var(--fg),0.08)",
          borderRadius: "var(--radius-md)",
          background: "rgba(var(--fg),0.02)",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.55)",
            }}
          >
            Cuántos perfiles generar (1..{maxN})
          </span>
          <input
            type="number"
            min={1}
            max={maxN}
            step={1}
            value={n}
            onChange={(e) => {
              const v = parseInt(e.currentTarget.value, 10);
              if (Number.isFinite(v)) setN(Math.min(Math.max(v, 1), maxN));
            }}
            disabled={running}
            style={{
              background: "rgba(var(--fg),0.03)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "var(--text-strong)",
              fontSize: 14,
              outline: "none",
              fontFamily: "var(--font-sans)",
              maxWidth: 160,
            }}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        </label>
        <button
          type="button"
          onClick={generate}
          className="btn-pill solid"
          disabled={running || n < 1}
        >
          {running ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="spin" /> Generando…
            </span>
          ) : usdPerProfile != null ? (
            `Generar ${n} perfiles · ~${formatUsd(usdPerProfile * Math.max(1, n))}`
          ) : (
            `Generar ${n} perfiles`
          )}
        </button>
      </div>

      {(phase === "running" || phase === "done") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(var(--fg),0.55)",
              }}
            >
              {progress.done}/{progress.total} · {okCount} ok · {errCount} err
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: phase === "done" ? "var(--success-500)" : "var(--accent-500)",
              }}
            >
              {phase === "done" ? "Completado" : "En curso"}
            </span>
          </div>
          <div
            style={{
              height: 10,
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
                transition: "width 200ms var(--ease-out)",
              }}
            />
          </div>
        </div>
      )}

      {fatal && (
        <div
          role="alert"
          style={{
            padding: 16,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            color: "rgba(var(--fg),0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 14,
          }}
        >
          Error: {fatal}
        </div>
      )}

      {logs.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 16,
            margin: 0,
            border: "1px solid rgba(var(--fg),0.08)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 480,
            overflowY: "auto",
          }}
        >
          {logs.map((l, i) => (
            <li key={i} style={{ fontSize: 13, color: "rgba(var(--fg),0.85)" }}>
              <LogLine log={l} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LogLine({ log }: { log: Log }) {
  if (log.kind === "info") {
    return (
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.55)",
        }}
      >
        · {log.text}
      </span>
    );
  }
  if (log.kind === "ok") {
    return (
      <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 8 }}>
        <CheckCircle2 size={14} color="var(--success-500)" style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(var(--fg),0.45)",
            }}
          >
            {log.index}/{log.total}
          </span>{" "}
          <strong style={{ color: "var(--text-strong)" }}>{log.name}</strong>{" "}
          <span style={{ color: "rgba(var(--fg),0.55)" }}>· {log.seed}</span>
        </span>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 8 }}>
      <XCircle size={14} color="var(--error-500)" style={{ marginTop: 2, flexShrink: 0 }} />
      <span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.45)",
          }}
        >
          {log.index}/{log.total}
        </span>{" "}
        <span style={{ color: "var(--error-500)" }}>{log.message}</span>{" "}
        <span style={{ color: "rgba(var(--fg),0.55)" }}>· {log.seed}</span>
      </span>
    </span>
  );
}
