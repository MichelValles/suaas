"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Pixel = { id: number; x: number; y: number };

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    const onMove = (e: PointerEvent) => {
      const last = lastPosRef.current;
      if (last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        if (dx * dx + dy * dy < 28 * 28) return;
      }
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      const gridX = Math.floor(e.clientX / 8) * 8;
      const gridY = Math.floor(e.clientY / 8) * 8;
      setPixels((prev) => [
        ...prev,
        { id: performance.now() + Math.random(), x: gridX, y: gridY },
      ]);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        window.location.replace("/");
        return;
      }
      setStatus("error");
      setPassword("");
      inputRef.current?.focus();
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="theme-dark-fixed" style={S.main}>
      {/* Rejilla estática (sistema de coordenadas) */}
      <div
        aria-hidden
        style={{
          ...S.layer,
          backgroundImage:
            "linear-gradient(to right, rgba(var(--fg),0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(var(--fg),0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Viñeta hacia los bordes */}
      <div
        aria-hidden
        style={{
          ...S.layer,
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(10,11,13,0.7) 85%)",
        }}
      />

      {/* HUD frame: 4 corchetes amarillos */}
      <ViewportCorners />

      {/* Pixel trail */}
      <div aria-hidden style={S.layer}>
        {pixels.map((p) => (
          <motion.span
            key={p.id}
            style={{
              position: "absolute",
              display: "block",
              height: 8,
              width: 8,
              left: p.x,
              top: p.y,
              background: "var(--accent-500)",
            }}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "linear" }}
            onAnimationComplete={() =>
              setPixels((prev) => prev.filter((px) => px.id !== p.id))
            }
          />
        ))}
      </div>

      {/* Marca esquinas inferiores */}
      <div aria-hidden className="mono" style={S.cornerLeft}>
        FLAT 101 · Gravity
      </div>
      <div aria-hidden className="mono" style={S.cornerRight}>
        <span
          style={{
            display: "block",
            height: 6,
            width: 6,
            borderRadius: "50%",
            background: "var(--accent-500)",
          }}
        />
        SECURE
      </div>

      <div style={S.center}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/logos/flat101.svg"
            alt="Flat 101"
            width={120}
            height={32}
            style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }}
            priority
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "center",
          }}
        >
          <span className="mono" style={S.eyebrow}>
            Gravity · Perfiles calibrados
          </span>
          <p className="display" style={S.headline}>
            Acceso privado.
          </p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          style={S.form}
          autoComplete="off"
          spellCheck={false}
        >
          <div style={S.inputWrap}>
            <input
              ref={inputRef}
              type="password"
              name="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="Contraseña"
              aria-label="Contraseña"
              disabled={status === "loading"}
              style={S.input}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || password.length === 0}
            className="btn-pill solid"
            style={{ marginTop: 8, alignSelf: "center" }}
          >
            {status === "loading" ? "Verificando…" : "Entrar"}
          </button>

          <div style={{ height: 20 }}>
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mono"
                style={S.errorMsg}
              >
                Contraseña incorrecta
              </motion.p>
            )}
          </div>
        </motion.form>
      </div>
    </main>
  );
}

function ViewportCorners() {
  const stroke = "1px solid var(--accent-500)";
  const size = 18;
  const inset = 24;
  return (
    <div aria-hidden style={{ ...S.layer, zIndex: 1 }}>
      <span style={{ position: "absolute", top: inset, left: inset, width: size, height: size, borderTop: stroke, borderLeft: stroke }} />
      <span style={{ position: "absolute", top: inset, right: inset, width: size, height: size, borderTop: stroke, borderRight: stroke }} />
      <span style={{ position: "absolute", bottom: inset, left: inset, width: size, height: size, borderBottom: stroke, borderLeft: stroke }} />
      <span style={{ position: "absolute", bottom: inset, right: inset, width: size, height: size, borderBottom: stroke, borderRight: stroke }} />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  main: {
    position: "relative",
    display: "flex",
    minHeight: "100vh",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "var(--ink-900)",
    padding: "0 24px",
    color: "var(--text-strong)",
  },
  layer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  cornerLeft: {
    position: "absolute",
    bottom: 24,
    left: 24,
    zIndex: 1,
    color: "rgba(var(--fg),0.4)",
    fontSize: 10,
    letterSpacing: "0.22em",
    pointerEvents: "none",
  },
  cornerRight: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(var(--fg),0.4)",
    fontSize: 10,
    letterSpacing: "0.22em",
    pointerEvents: "none",
  },
  center: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 48,
    textAlign: "center",
    width: "100%",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: "var(--text-secondary)",
  },
  headline: {
    color: "var(--text-strong)",
    fontSize: "clamp(28px, 3.6vw, 48px)",
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    gap: 20,
  },
  inputWrap: {
    position: "relative",
  },
  input: {
    display: "block",
    width: "100%",
    borderBottom: "1px solid rgba(var(--fg),0.25)",
    background: "transparent",
    padding: "16px 4px",
    textAlign: "center",
    fontSize: 18,
    letterSpacing: "0.18em",
    color: "var(--text-strong)",
    outline: "none",
    border: "none",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(var(--fg),0.25)",
  },
  errorMsg: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.22em",
    color: "rgba(var(--fg),0.6)",
  },
};
