"use client";

import { useRef, useState, type FormEvent } from "react";

type Momentum = {
  intensity: number;
  direction: "approaching" | "stable" | "drifting";
  velocity: "accelerating" | "steady" | "decelerating";
};

type ReasonerPlan = {
  state: string;
  intent: string;
  barriers_detected: string[];
  tone: string;
  effort: number;
  momentum?: Momentum;
  plan: string;
};

type ChatMessage =
  | { id: string; role: "human"; content: string }
  | {
      id: string;
      role: "talker";
      content: string;
      plan?: ReasonerPlan;
      effortRatio?: number | null;
      latencyMs?: number;
    };

type MetaFrame = {
  type: "meta";
  runId: string;
  humanTurn: number;
  reasonerTurn: number;
  talkerTurn: number;
  plan: ReasonerPlan;
};
type DeltaFrame = { type: "delta"; text: string };
type DoneFrame = { type: "done"; latencyMs: number; effortRatio: number | null };
type ErrorFrame = { type: "error"; message: string };
type Frame = MetaFrame | DeltaFrame | DoneFrame | ErrorFrame;

export function ChatPanel({ profileId }: { profileId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "reasoning" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function appendToTalker(id: string, updater: (msg: ChatMessage) => ChatMessage) {
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "reasoning" || status === "streaming") return;

    const humanMsg: ChatMessage = {
      id: `human-${Date.now()}`,
      role: "human",
      content: text,
    };
    setMessages((prev) => [...prev, humanMsg]);
    setDraft("");
    setStatus("reasoning");
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, message: text, runId }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? `Error ${response.status}`);
        setStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let talkerId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let frame: Frame;
          try {
            frame = JSON.parse(trimmed) as Frame;
          } catch {
            continue;
          }
          if (frame.type === "meta") {
            setRunId(frame.runId);
            talkerId = `talker-${frame.talkerTurn}-${Date.now()}`;
            setMessages((prev) => [
              ...prev,
              {
                id: talkerId!,
                role: "talker",
                content: "",
                plan: frame.plan,
              },
            ]);
            setStatus("streaming");
          } else if (frame.type === "delta" && talkerId) {
            appendToTalker(talkerId, (m) =>
              m.role === "talker" ? { ...m, content: m.content + frame.text } : m,
            );
          } else if (frame.type === "done" && talkerId) {
            appendToTalker(talkerId, (m) =>
              m.role === "talker"
                ? {
                    ...m,
                    latencyMs: frame.latencyMs,
                    effortRatio: frame.effortRatio,
                  }
                : m,
            );
            setStatus("idle");
          } else if (frame.type === "error") {
            setError(frame.message);
            setStatus("error");
          }

          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  const busy = status === "reasoning" || status === "streaming";

  const isEmpty = messages.length === 0 && status === "idle";

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
            margin: 0,
          }}
        >
          Conversación · Talker-Reasoner
        </h2>
        {runId && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            run {runId.slice(0, 8)}
          </span>
        )}
      </header>

      <div
        ref={scrollRef}
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--radius-md)",
          background: "rgba(255,255,255,0.02)",
          padding: 20,
          minHeight: isEmpty ? 180 : 320,
          maxHeight: 540,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          justifyContent: isEmpty ? "center" : "flex-start",
          transition: "min-height var(--dur-short) var(--ease-out)",
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 14,
              lineHeight: 1.55,
              margin: 0,
              textAlign: "center",
              maxWidth: 520,
              alignSelf: "center",
            }}
          >
            Pídele algo concreto: una reacción a un copy, opinión sobre una
            promesa, qué haría tras ver una landing. El Reasoner planifica, el
            Talker responde en voz del perfil.
          </p>
        )}
        {messages.map((m) =>
          m.role === "human" ? (
            <Bubble key={m.id} role="human">
              {m.content}
            </Bubble>
          ) : (
            <TalkerMessage key={m.id} msg={m} />
          ),
        )}
        {status === "reasoning" && <ReasoningHint />}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(255,255,255,0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 12, alignItems: "stretch" }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mensaje al perfil…"
          disabled={busy}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            color: "#fff",
            fontSize: 14,
            outline: "none",
            fontFamily: "var(--font-sans)",
          }}
        />
        <button
          type="submit"
          className="btn-pill solid"
          disabled={busy || draft.trim().length === 0}
        >
          {status === "reasoning"
            ? "Razonando…"
            : status === "streaming"
              ? "Hablando…"
              : "Enviar"}
        </button>
      </form>
    </section>
  );
}

function TalkerMessage({
  msg,
}: {
  msg: Extract<ChatMessage, { role: "talker" }>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", maxWidth: "82%" }}>
      <Bubble role="talker">{msg.content || "…"}</Bubble>
      {msg.plan && (
        <details
          style={{
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.02)",
            padding: "8px 12px",
          }}
        >
          <summary
            className="mono"
            style={{
              cursor: "pointer",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              listStyle: "none",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span>Razonamiento</span>
            <span style={{ color: "var(--accent-500)" }}>
              tono {msg.plan.tone}
            </span>
            <span>esfuerzo {Math.round(msg.plan.effort * 100)}%</span>
            {typeof msg.latencyMs === "number" && (
              <span>· {msg.latencyMs} ms</span>
            )}
          </summary>
          {msg.plan.momentum && (
            <MomentumIndicator momentum={msg.plan.momentum} />
          )}
          <dl
            style={{
              margin: "10px 0 0",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 16px",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
            }}
          >
            <Term label="Estado" value={msg.plan.state} />
            <Term label="Intent" value={msg.plan.intent} />
            <Term
              label="Barreras"
              value={
                msg.plan.barriers_detected.length
                  ? msg.plan.barriers_detected.join(" · ")
                  : "sin barreras"
              }
            />
            <Term label="Plan" value={msg.plan.plan} />
            {typeof msg.effortRatio === "number" && (
              <Term
                label="Effort ratio (run)"
                value={`${Math.round(msg.effortRatio * 100)}%`}
              />
            )}
          </dl>
        </details>
      )}
    </div>
  );
}

const DIRECTION_LABEL: Record<string, string> = {
  approaching: "acercándose",
  stable: "estable",
  drifting: "alejándose",
};
const DIRECTION_COLOR: Record<string, string> = {
  approaching: "#4ade80",
  stable: "rgba(255,255,255,0.6)",
  drifting: "#f87171",
};
const VELOCITY_LABEL: Record<string, string> = {
  accelerating: "acelerando",
  steady: "constante",
  decelerating: "frenando",
};

function MomentumIndicator({ momentum }: { momentum: Momentum }) {
  const dirColor = DIRECTION_COLOR[momentum.direction] ?? "rgba(255,255,255,0.6)";
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 10px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
        momentum
      </span>
      <div
        title={`Intensidad: ${Math.round(momentum.intensity * 100)}%`}
        style={{
          width: 48,
          height: 4,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(momentum.intensity * 100)}%`,
            height: "100%",
            background: dirColor,
            borderRadius: 2,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: dirColor }}>
        {DIRECTION_LABEL[momentum.direction] ?? momentum.direction}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
        {VELOCITY_LABEL[momentum.velocity] ?? momentum.velocity}
      </span>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt
        className="mono"
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          alignSelf: "start",
          paddingTop: 2,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
}

function ReasoningHint() {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: "82%",
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px dashed rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.55)",
        fontSize: 12,
        letterSpacing: "0.04em",
      }}
      className="mono"
    >
      Reasoner pensando…
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "human" | "talker";
  children: React.ReactNode;
}) {
  const isHuman = role === "human";
  return (
    <div
      style={{
        alignSelf: isHuman ? "flex-end" : "flex-start",
        maxWidth: isHuman ? "82%" : "100%",
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: isHuman ? "var(--accent-500)" : "rgba(255,255,255,0.06)",
        color: isHuman ? "var(--ink-900)" : "rgba(255,255,255,0.95)",
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </div>
  );
}
