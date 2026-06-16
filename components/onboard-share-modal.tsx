"use client";

import { useEffect, useState } from "react";
import { Share2, X, Copy, Check } from "lucide-react";

/**
 * Modal de "Compartir cuestionario": muestra la URL pública de /onboard con
 * un botón de copiar y un QR para escanear con el móvil. Pensado para abrir
 * desde la toolbar de /profiles y enseñar el QR en una demo en vivo.
 */
export function OnboardShareModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const url = origin ? `${origin}/onboard` : "/onboard";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia el enlace", url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "var(--accent-500)",
          color: "var(--ink-900)",
          border: "1px solid var(--accent-500)",
          borderRadius: "var(--radius-pill)",
          cursor: "pointer",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "inherit",
          fontWeight: 600,
        }}
        title="Comparte el cuestionario público con alguien"
      >
        <Share2 size={14} />
        Compartir cuestionario
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface-app)",
              border: "1px solid rgba(var(--fg),0.12)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(24px, 4vw, 36px)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 22,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "transparent",
                border: "none",
                color: "rgba(var(--fg),0.5)",
                cursor: "pointer",
                padding: 6,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "var(--accent-text)",
                }}
              >
                Compartir cuestionario
              </span>
              <h2
                className="display"
                style={{
                  color: "var(--text-strong)",
                  fontSize: "clamp(22px, 3vw, 28px)",
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                Convierte a alguien real en su gemelo digital.
              </h2>
              <p style={{ color: "rgba(var(--fg),0.65)", margin: 0, fontSize: 14 }}>
                Cualquier persona con este enlace puede contestar el cuestionario
                desde su móvil. Al terminar verá su gemelo y aparecerá en
                /profiles como `self_report`.
              </p>
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: "var(--radius-md)",
                padding: 16,
                display: "flex",
                justifyContent: "center",
              }}
            >
              {/* QR generado server-side, transparente sobre fondo blanco */}
              <img
                src={`/api/qr?data=${encodeURIComponent(url)}`}
                alt="QR del cuestionario"
                width={240}
                height={240}
                style={{ width: 240, height: 240, display: "block" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 14px",
                background: "rgba(var(--fg),0.04)",
                border: "1px solid rgba(var(--fg),0.1)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "rgba(var(--fg),0.85)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {url}
              </code>
              <button
                type="button"
                onClick={copy}
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "1px solid rgba(var(--fg),0.12)",
                  borderRadius: "var(--radius-pill)",
                  color: copied ? "var(--accent-500)" : "rgba(var(--fg),0.8)",
                  padding: "6px 12px",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <p
              style={{
                color: "rgba(var(--fg),0.45)",
                margin: 0,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Tarda unos 10 minutos. Sin email, sin registro. Comparte el QR en
              una pantalla y pide a alguien que lo escanee con la cámara.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
