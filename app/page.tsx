import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isGatewayConfigured } from "@/lib/gateway";

export default function HomePage() {
  const supabaseReady = isSupabaseConfigured();
  const gatewayReady = isGatewayConfigured();

  return (
    <AppShell>
      <PageHeading
        eyebrow="Synthetic Users as a Service"
        title="Experimentación predictiva con agentes calibrados."
        description="Plataforma para construir perfiles 'grounded', simular embudos completos y validar copy e interfaces antes de gastar tráfico real. Persistencia en Supabase, modelos vía Vercel AI Gateway."
        actions={
          <Link href="/profiles" className="btn-pill solid">
            Ver perfiles
          </Link>
        }
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
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
    </AppShell>
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
