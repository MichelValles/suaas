"use client";

import { useEffect, useState } from "react";
import { FlatLogo } from "./flat-logo";

type Item = { href: string; label: string };

/**
 * Nav sticky. Contraído deja sólo logo + marca + CTA. Las anclas aparecen al
 * hacer scroll hacia arriba (y arriba del todo) y se ocultan al bajar.
 */
export function LandingNav({ brand, items }: { brand: string; items: Item[] }) {
  const [showAnchors, setShowAnchors] = useState(true);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    function update() {
      const y = window.scrollY;
      if (y < 80) setShowAnchors(true);
      else if (y > last + 6) setShowAnchors(false);
      else if (y < last - 6) setShowAnchors(true);
      last = y;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    // Sincroniza con la posición real al montar (recarga con scroll ya bajado).
    setShowAnchors(window.scrollY < 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--surface-app)",
        borderBottom: "1px solid rgba(var(--fg),0.08)",
        padding: "12px clamp(16px, 5vw, 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FlatLogo size={50} />
        <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, color: "var(--text-strong)" }}>
          {brand}
        </span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "6px 18px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {showAnchors &&
          items.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="mono"
              style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(var(--fg),0.6)" }}
            >
              {n.label}
            </a>
          ))}
        <a href="#paquetes" className="btn-pill solid" style={{ padding: "9px 18px" }}>
          Ver paquetes →
        </a>
      </div>
    </nav>
  );
}
