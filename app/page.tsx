import Image from "next/image";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isGatewayConfigured } from "@/lib/gateway";
import { APP_VERSION } from "@/lib/version";

export default function HomePage() {
  const supabaseReady = isSupabaseConfigured();
  const gatewayReady = isGatewayConfigured();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--ink-900)",
        color: "#fff",
        padding: "clamp(32px, 6vw, 96px)",
        display: "flex",
        flexDirection: "column",
        gap: 48,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Image
          src="/logos/flat101.svg"
          alt="Flat 101"
          width={108}
          height={28}
          style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)" }}
          priority
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.24em",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
          }}
        >
          USAAS · v{APP_VERSION}
        </span>
      </header>

      <section style={{ maxWidth: 880, display: "flex", flexDirection: "column", gap: 24 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--accent-500)",
            textTransform: "uppercase",
          }}
        >
          Synthetic Users as a Service
        </span>
        <h1
          className="display"
          style={{ color: "#fff", fontSize: "clamp(40px, 5.6vw, 88px)", lineHeight: 1.05 }}
        >
          Experimentación predictiva con agentes calibrados.
        </h1>
        <p
          className="body-lg"
          style={{ color: "rgba(255,255,255,0.78)", maxWidth: 640 }}
        >
          Plataforma para construir perfiles &laquo;grounded&raquo;, simular embudos completos
          y validar copy e interfaces antes de gastar tráfico real. Arquitectura
          Talker-Reasoner sobre Vercel AI Gateway, persistencia en Supabase.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          maxWidth: 880,
        }}
      >
        <StatusCard label="Login" value="ok" />
        <StatusCard
          label="Supabase"
          value={supabaseReady ? "ready" : "pending"}
          warn={!supabaseReady}
        />
        <StatusCard
          label="AI Gateway"
          value={gatewayReady ? "ready" : "pending"}
          warn={!gatewayReady}
        />
      </section>

      <footer
        style={{
          marginTop: "auto",
          paddingTop: 48,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
        className="mono"
      >
        <span>usaas.flat101.business</span>
        <span>build {APP_VERSION}</span>
      </footer>
    </main>
  );
}

function StatusCard({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-md)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 18,
          color: warn ? "var(--warning-500)" : "var(--accent-500)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {value}
      </span>
    </div>
  );
}
