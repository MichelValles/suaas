import { APP_VERSION } from "@/lib/version";
import { isGatewayConfigured } from "@/lib/gateway";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const supabaseReady = isSupabaseConfigured();
  const gatewayReady = isGatewayConfigured();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-shell-main">{children}</main>
      <footer className="app-shell-footer mono">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span
            className="status-badge"
            data-status={supabaseReady ? "ok" : "off"}
            title={
              supabaseReady
                ? "Supabase configurado y accesible"
                : "Supabase no configurado"
            }
          >
            Supabase {supabaseReady ? "ready" : "off"}
          </span>
          <span
            className="status-badge"
            data-status={gatewayReady ? "ok" : "off"}
            title={
              gatewayReady
                ? "AI Gateway configurado"
                : "AI Gateway no configurado"
            }
          >
            AI Gateway {gatewayReady ? "ready" : "off"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            color: "rgba(var(--fg),0.4)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span>suaas.flat101.business</span>
          <span>build {APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  descriptionVariant = "inline",
  actions,
}: {
  /**
   * Retirado en el rediseño editorial (v0.64.3): el eyebrow mono en
   * mayúsculas (CONSTRUCTION · Perfiles) duplicaba la sección que ya marca
   * el sidebar y arrastraba el registro «dashboard de IA». Se sigue
   * aceptando en la firma por compatibilidad con las llamadas existentes,
   * pero no se destructura ni se pinta.
   */
  eyebrow?: string;
  title: string;
  description?: string;
  /**
   * "inline" (default): la descripción se renderiza como párrafo bajo el
   *   título, igual que hasta ahora.
   * "panel": la descripción se renderiza como una caja destacada con borde
   *   sutil y padding amplio. Útil para páginas de detalle donde el copy
   *   describe la entidad y merece su propio espacio visual.
   */
  descriptionVariant?: "inline" | "panel";
  actions?: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <h1
          className="display"
          style={{
            color: "var(--text-strong)",
            fontSize: "clamp(32px, 4vw, 56px)",
            lineHeight: 1.05,
            flex: "1 1 320px",
            minWidth: 0,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
      </div>
      {description &&
        (descriptionVariant === "panel" ? (
          <div
            style={{
              marginTop: 8,
              padding: "26px 30px",
              border: "1px solid rgba(var(--fg),0.08)",
              borderLeft: "3px solid var(--accent-500)",
              borderRadius: "var(--radius-md)",
              background: "rgba(var(--fg),0.02)",
              color: "rgba(var(--fg),0.85)",
              fontSize: "clamp(15px, 1.15vw, 17px)",
              lineHeight: 1.6,
            }}
          >
            {description}
          </div>
        ) : (
          <p className="body-lg" style={{ color: "rgba(var(--fg),0.7)" }}>
            {description}
          </p>
        ))}
    </header>
  );
}
