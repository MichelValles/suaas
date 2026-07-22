"use client";

import { useEffect, useState } from "react";

export type OnbSection = { id: string; num: string; title: string };

/**
 * Índice lateral pegajoso con scroll-spy: resalta la sección activa según la
 * posición de scroll. Usa un listener de scroll + getBoundingClientRect (en vez
 * de IntersectionObserver, que no dispara de forma fiable en algunos entornos y
 * es frágil con rootMargin). Throttle con requestAnimationFrame. Los enlaces son
 * anclas nativas (#id).
 */
export function OnboardingNav({ sections }: { sections: OnbSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    // Línea de lectura: la sección activa es la última cuyo borde superior ya
    // pasó por encima de este umbral desde el top del viewport. Se computa en
    // el propio handler (sin requestAnimationFrame) porque son ~11 medidas
    // baratas y así funciona también donde el rAF viene throttled.
    const LINE = 140;

    const compute = () => {
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - LINE <= 0) current = id;
        else break;
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Índice del onboarding"
      style={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.4)",
          padding: "0 10px 8px",
        }}
      >
        Índice
      </span>
      {sections.map((s) => {
        const on = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={on ? "true" : undefined}
            style={{
              display: "flex",
              gap: 10,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: 13,
              lineHeight: 1.35,
              color: on ? "var(--text-strong)" : "rgba(var(--fg),0.55)",
              background: on ? "rgba(var(--fg),0.05)" : "transparent",
              borderLeft: `2px solid ${on ? "var(--accent-500)" : "transparent"}`,
              transition:
                "color var(--dur-micro) var(--ease-out), background var(--dur-micro) var(--ease-out)",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: on ? "var(--accent-text)" : "rgba(var(--fg),0.35)",
                flexShrink: 0,
                paddingTop: 1,
              }}
            >
              {s.num}
            </span>
            <span>{s.title}</span>
          </a>
        );
      })}
    </nav>
  );
}
