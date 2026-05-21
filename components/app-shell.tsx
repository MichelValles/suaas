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
            color: "rgba(255,255,255,0.4)",
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
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
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
      {eyebrow && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent-500)",
          }}
        >
          {eyebrow}
        </span>
      )}
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
            color: "#fff",
            fontSize: "clamp(32px, 4vw, 56px)",
            lineHeight: 1.05,
            maxWidth: 720,
          }}
        >
          {title}
        </h1>
        {actions}
      </div>
      {description && (
        <p
          className="body-lg"
          style={{ color: "rgba(255,255,255,0.7)", maxWidth: 640 }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
