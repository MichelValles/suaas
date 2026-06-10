import type { CSSProperties } from "react";

type Tone = "accent" | "muted" | "warn";

const COLORS: Record<Tone, string> = {
  accent: "var(--accent-500)",
  muted: "rgba(var(--fg),0.55)",
  warn: "var(--error-500)",
};

export function ResultBar({
  label,
  value,
  hint,
  tone = "accent",
  style,
}: {
  label: string;
  /** 0..1 */
  value: number;
  hint?: string;
  tone?: Tone;
  style?: CSSProperties;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = Math.round(clamped * 100);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(var(--fg),0.55)",
          }}
        >
          {label}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "rgba(var(--fg),0.85)",
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        aria-hidden
        style={{
          height: 6,
          width: "100%",
          background: "rgba(var(--fg),0.08)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: COLORS[tone],
          }}
        />
      </div>
      {hint && (
        <span
          style={{
            fontSize: 12,
            color: "rgba(var(--fg),0.5)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
