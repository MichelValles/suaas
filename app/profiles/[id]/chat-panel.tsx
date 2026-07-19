"use client";

import { useRef, useState, type FormEvent } from "react";
import { formatUsd } from "@/lib/model-pricing";

type Momentum = {
  intensity: number;
  direction: "approaching" | "stable" | "drifting";
  velocity: "accelerating" | "steady" | "decelerating";
};

type SocialFriction = {
  intensity: number;
  trigger: string;
  habitus_note: string;
};

type ReasonerPlan = {
  state: string;
  intent: string;
  barriers_detected: string[];
  tone: string;
  effort: number;
  momentum?: Momentum;
  social_friction?: SocialFriction;
  plan: string;
};

type ChatMessage =
  | { id: string; role: "human"; content: string; at: string }
  | {
      id: string;
      role: "talker";
      content: string;
      at: string;
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

/** Hora local HH:MM (24h), como el sello de WhatsApp. Cliente, sin SSR. */
function nowHM() {
  return new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({
  profileId,
  profileName,
  avatarUrl,
  costPerTurnUsd,
}: {
  profileId: string;
  profileName: string;
  avatarUrl?: string | null;
  /** Coste estimado por turno (reasoner Opus + talker Sonnet), server-side. */
  costPerTurnUsd?: number | null;
}) {
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
      at: nowHM(),
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
                at: nowHM(),
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
        width: "100%",
        border: "1px solid rgba(var(--fg),0.09)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--surface-panel)",
      }}
    >
      {/* Cabecera estilo WhatsApp: avatar + nombre + estado */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(var(--fg),0.08)",
          background: "rgba(var(--fg),0.02)",
        }}
      >
        <Avatar name={profileName} url={avatarUrl} size={38} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--text-strong)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {profileName}
          </span>
          <span
            style={{
              fontSize: 11.5,
              color: busy ? "var(--accent-text)" : "rgba(var(--fg),0.5)",
              lineHeight: 1.2,
            }}
          >
            {busy ? "escribiendo…" : "Talker-Reasoner · en voz del perfil"}
          </span>
        </div>
        {runId && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "rgba(var(--fg),0.4)",
              flexShrink: 0,
            }}
          >
            run {runId.slice(0, 8)}
          </span>
        )}
      </header>

      {/* Lienzo del chat: superficie propia (wallpaper) distinta del panel */}
      <div
        ref={scrollRef}
        style={{
          background: "var(--chat-wall)",
          padding: "18px 16px",
          minHeight: isEmpty ? 200 : 340,
          maxHeight: 560,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          justifyContent: isEmpty ? "center" : "flex-start",
          transition: "min-height var(--dur-short) var(--ease-out)",
        }}
      >
        {isEmpty ? (
          <p
            style={{
              color: "rgba(var(--fg),0.5)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              textAlign: "center",
              alignSelf: "center",
              maxWidth: 460,
            }}
          >
            Pídele algo concreto: una reacción a un copy, opinión sobre una
            promesa, qué haría tras ver una landing. El Reasoner planifica, el
            Talker responde en voz del perfil.
          </p>
        ) : (
          <DatePill label="Hoy" />
        )}

        {messages.map((m) =>
          m.role === "human" ? (
            <OutgoingBubble key={m.id} text={m.content} at={m.at} />
          ) : (
            <TalkerMessage
              key={m.id}
              msg={m}
              profileName={profileName}
              avatarUrl={avatarUrl}
            />
          ),
        )}

        {status === "reasoning" && (
          <TypingIndicator profileName={profileName} avatarUrl={avatarUrl} />
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: "12px 16px 0",
            padding: 12,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-sm)",
            color: "rgba(var(--fg),0.9)",
            background: "rgba(180,35,24,0.12)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Compositor */}
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "12px 16px",
          borderTop: "1px solid rgba(var(--fg),0.08)",
          background: "rgba(var(--fg),0.02)",
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe un mensaje…"
          disabled={busy}
          style={{
            flex: 1,
            background: "var(--chat-in)",
            border: "1px solid rgba(var(--fg),0.1)",
            borderRadius: "var(--radius-pill)",
            padding: "11px 18px",
            color: "var(--text-strong)",
            fontSize: 14.5,
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
      {costPerTurnUsd != null && (
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.14em",
            color: "rgba(var(--fg),0.42)",
            padding: "0 16px 12px",
          }}
        >
          Coste estimado por mensaje: ~{formatUsd(costPerTurnUsd)} (sube con
          conversaciones largas: el historial se reenvía entero).
        </span>
      )}
    </section>
  );
}

/* ── Burbujas ─────────────────────────────────────────────────────── */

function OutgoingBubble({ text, at }: { text: string; at: string }) {
  return (
    <div
      style={{
        alignSelf: "flex-end",
        maxWidth: "80%",
        position: "relative",
        background: "var(--chat-out)",
        border: "1px solid var(--chat-out-border)",
        borderRadius: "14px 6px 14px 14px",
        padding: "8px 13px 5px",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -1,
          right: -6,
          width: 8,
          height: 13,
          background: "var(--chat-out)",
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: 14.5,
          lineHeight: 1.5,
          color: "var(--text-strong)",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </p>
      <MessageMeta at={at} read />
    </div>
  );
}

function TalkerMessage({
  msg,
  profileName,
  avatarUrl,
}: {
  msg: Extract<ChatMessage, { role: "talker" }>;
  profileName: string;
  avatarUrl?: string | null;
}) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        maxWidth: "86%",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Avatar name={profileName} url={avatarUrl} size={26} />
        <div
          style={{
            position: "relative",
            background: "var(--chat-in)",
            border: "1px solid rgba(var(--fg),0.07)",
            borderRadius: "6px 14px 14px 14px",
            padding: "8px 14px 5px",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -1,
              left: -6,
              width: 8,
              height: 13,
              background: "var(--chat-in)",
              clipPath: "polygon(100% 0, 0 0, 100% 100%)",
            }}
          />
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent-text)",
              marginBottom: 2,
            }}
          >
            {profileName}
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "rgba(var(--fg),0.92)",
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.content || "…"}
          </p>
          <MessageMeta at={msg.at} />
        </div>
      </div>
      {msg.plan && <ReasoningTrace msg={msg} />}
    </div>
  );
}

function MessageMeta({ at, read = false }: { at: string; read?: boolean }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 3,
        marginTop: 1,
      }}
    >
      <span style={{ fontSize: 10.5, color: "rgba(var(--fg),0.45)" }}>{at}</span>
      {read && <DoubleCheck />}
    </span>
  );
}

function DoubleCheck() {
  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d="M1 5.2L3.6 7.8L8.4 2"
        stroke="var(--serp-link)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 7.4L6.7 7.9L12.2 2.1"
        stroke="var(--serp-link)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatePill({ label }: { label: string }) {
  return (
    <span
      style={{
        alignSelf: "center",
        background: "rgba(var(--fg),0.06)",
        color: "rgba(var(--fg),0.5)",
        padding: "3px 12px",
        borderRadius: "var(--radius-pill)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {label}
    </span>
  );
}

function TypingIndicator({
  profileName,
  avatarUrl,
}: {
  profileName: string;
  avatarUrl?: string | null;
}) {
  return (
    <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "flex-end" }}>
      <Avatar name={profileName} url={avatarUrl} size={26} />
      <div
        style={{
          position: "relative",
          background: "var(--chat-in)",
          border: "1px solid rgba(var(--fg),0.07)",
          borderRadius: "6px 14px 14px 14px",
          padding: "12px 16px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -1,
            left: -6,
            width: 8,
            height: 13,
            background: "var(--chat-in)",
            clipPath: "polygon(100% 0, 0 0, 100% 100%)",
          }}
        />
        <span className="chat-typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="chat-typing-dot" style={{ animationDelay: "180ms" }} />
        <span className="chat-typing-dot" style={{ animationDelay: "360ms" }} />
      </div>
    </div>
  );
}

function Avatar({
  name,
  url,
  size,
}: {
  name: string;
  url?: string | null;
  size: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Retrato de ${name}`}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "1px solid rgba(var(--fg),0.1)",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(var(--fg),0.08)",
        color: "rgba(var(--fg),0.6)",
        fontSize: size * 0.42,
        fontWeight: 700,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/* ── Traza del Reasoner (colapsable bajo la burbuja entrante) ──────── */

function ReasoningTrace({
  msg,
}: {
  msg: Extract<ChatMessage, { role: "talker" }>;
}) {
  if (!msg.plan) return null;
  return (
    <details
      style={{
        marginLeft: 34,
        border: "1px solid rgba(var(--fg),0.08)",
        borderRadius: "var(--radius-sm)",
        background: "rgba(var(--fg),0.02)",
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
          color: "rgba(var(--fg),0.55)",
          listStyle: "none",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>Razonamiento</span>
        <span style={{ color: "var(--accent-text)" }}>tono {msg.plan.tone}</span>
        <span>esfuerzo {Math.round(msg.plan.effort * 100)}%</span>
        {typeof msg.latencyMs === "number" && <span>· {msg.latencyMs} ms</span>}
      </summary>
      {msg.plan.momentum && <MomentumIndicator momentum={msg.plan.momentum} />}
      <dl
        style={{
          margin: "10px 0 0",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 16px",
          fontSize: 12,
          color: "rgba(var(--fg),0.85)",
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
        {msg.plan.social_friction &&
          msg.plan.social_friction.intensity > 0.05 && (
            <Term
              label="Fricción simbólica"
              value={`${Math.round(msg.plan.social_friction.intensity * 100)}% · ${msg.plan.social_friction.trigger}${
                msg.plan.social_friction.habitus_note
                  ? ` (${msg.plan.social_friction.habitus_note})`
                  : ""
              }`}
            />
          )}
        <Term label="Plan" value={msg.plan.plan} />
        {typeof msg.effortRatio === "number" && (
          <Term
            label="Effort ratio (run)"
            value={`${Math.round(msg.effortRatio * 100)}%`}
          />
        )}
      </dl>
    </details>
  );
}

const DIRECTION_LABEL: Record<string, string> = {
  approaching: "acercándose",
  stable: "estable",
  drifting: "alejándose",
};
const DIRECTION_COLOR: Record<string, string> = {
  approaching: "var(--success-text)",
  stable: "rgba(var(--fg),0.6)",
  drifting: "var(--error-text)",
};
const VELOCITY_LABEL: Record<string, string> = {
  accelerating: "acelerando",
  steady: "constante",
  decelerating: "frenando",
};

function MomentumIndicator({ momentum }: { momentum: Momentum }) {
  const dirColor = DIRECTION_COLOR[momentum.direction] ?? "rgba(var(--fg),0.6)";
  return (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 10px",
        background: "rgba(var(--fg),0.03)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(var(--fg),0.06)",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.4)",
        }}
      >
        momentum
      </span>
      <div
        title={`Intensidad: ${Math.round(momentum.intensity * 100)}%`}
        style={{
          width: 48,
          height: 4,
          background: "rgba(var(--fg),0.1)",
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
      <span style={{ fontSize: 11, color: "rgba(var(--fg),0.45)" }}>
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
          color: "rgba(var(--fg),0.45)",
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
