"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export function SeedGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("Introduce la contraseña.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/seed/access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          setError("Contraseña incorrecta.");
          return;
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section
      style={{
        maxWidth: 460,
        padding: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <Lock size={16} color="var(--accent-500)" />
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          Acceso restringido
        </span>
      </div>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, fontSize: 14 }}>
        Sembrar ejemplos crea entidades reales y, si lanzas runs, consume tokens del AI Gateway.
        Introduce la contraseña para continuar.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Contraseña
          </span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={pending}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              fontFamily: "var(--font-sans)",
              colorScheme: "dark",
            }}
          />
        </label>
        {error && (
          <span style={{ color: "var(--error-500)", fontSize: 13 }}>{error}</span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn-pill solid"
          style={{ alignSelf: "flex-start" }}
        >
          {pending ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="spin" /> Verificando…
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } .spin { animation: spin 1s linear infinite }`}</style>
    </section>
  );
}
