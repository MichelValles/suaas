import { FlatLogo } from "./flat-logo";

/**
 * Nav sticky simple: logo + marca + CTA. Sin anclas (en móvil el toggle por
 * scroll parpadeaba). Las secciones siguen teniendo id para enlaces directos.
 */
export function LandingNav({ brand }: { brand: string }) {
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
      }}
    >
      <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FlatLogo size={50} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-strong)" }}>
          {brand}
        </span>
      </a>
      <a href="#paquetes" className="btn-pill solid" style={{ padding: "9px 18px", whiteSpace: "nowrap" }}>
        Ver paquetes →
      </a>
    </nav>
  );
}
