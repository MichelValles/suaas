"use client";

import { Loader2, Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Login del footer para la vista interna de la calculadora. Si está
 * desbloqueada, ofrece cerrar. Mirror del patrón de SeedGate.
 */
export function UnlockForm({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function post(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/propuesta/access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          setError("Contraseña incorrecta.");
          return;
        }
        setPassword("");
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (unlocked) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--accent-text)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Unlock size={13} /> Vista interna activa
        </span>
        <button
          type="button"
          onClick={() => post({ lock: true })}
          disabled={pending}
          style={{ fontSize: 12, color: "rgba(var(--fg),0.5)", textDecoration: "underline" }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (password) post({ password });
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
    >
      <Lock size={13} color="rgba(var(--fg),0.4)" />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Acceso interno"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        disabled={pending}
        aria-label="Contraseña de la vista interna"
        style={{
          background: "rgba(var(--fg),0.04)",
          border: "1px solid rgba(var(--fg),0.12)",
          borderRadius: "var(--radius-sm)",
          padding: "7px 10px",
          color: "var(--text-strong)",
          fontSize: 13,
          outline: "none",
          width: 150,
        }}
      />
      <button
        type="submit"
        disabled={pending || !password}
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent-text)",
          padding: "7px 12px",
          border: "1px solid rgba(var(--fg),0.14)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {pending ? <Loader2 size={13} className="spin" /> : "Entrar"}
      </button>
      {error && <span style={{ color: "var(--error-text)", fontSize: 12 }}>{error}</span>}
    </form>
  );
}
