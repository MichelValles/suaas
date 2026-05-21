"use client";

import { useRef, useState, type FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "human" | "talker";
  content: string;
};

export function ChatPanel({ profileId }: { profileId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "sending") return;

    const humanMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "human",
      content: text,
    };
    setMessages((prev) => [...prev, humanMsg]);
    setDraft("");
    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, message: text, runId }),
      });
      const data = (await response.json()) as
        | { ok: true; runId: string; turn: number; text: string }
        | { ok: false; error: string };

      if (!response.ok || data.ok === false) {
        const message =
          "error" in data ? data.error : `Error ${response.status}`;
        setError(message);
        setStatus("error");
        return;
      }

      setRunId(data.runId);
      setMessages((prev) => [
        ...prev,
        { id: `talker-${data.turn}`, role: "talker", content: data.text },
      ]);
      setStatus("idle");
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 880,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Conversación
        </span>
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
          minHeight: 280,
          maxHeight: 480,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>
            Pídele algo concreto: una reacción a un copy, opinión sobre una
            promesa, qué haría tras ver una landing.
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {status === "sending" && (
          <Bubble role="talker" pulsing>
            ...
          </Bubble>
        )}
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
          disabled={status === "sending"}
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
          disabled={status === "sending" || draft.trim().length === 0}
        >
          {status === "sending" ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </section>
  );
}

function Bubble({
  role,
  pulsing = false,
  children,
}: {
  role: ChatMessage["role"];
  pulsing?: boolean;
  children: React.ReactNode;
}) {
  const isHuman = role === "human";
  return (
    <div
      style={{
        alignSelf: isHuman ? "flex-end" : "flex-start",
        maxWidth: "82%",
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: isHuman ? "var(--accent-500)" : "rgba(255,255,255,0.06)",
        color: isHuman ? "var(--ink-900)" : "rgba(255,255,255,0.95)",
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        opacity: pulsing ? 0.65 : 1,
      }}
    >
      {children}
    </div>
  );
}
