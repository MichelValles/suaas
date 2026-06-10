import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isGatewayConfigured } from "@/lib/gateway";
import { PROFILE_SEEDS } from "@/lib/seed-profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SeedClient } from "./seed-client";

export const dynamic = "force-dynamic";

export default function ProfileSeedPage() {
  const supaOk = isSupabaseConfigured();
  const gwOk = isGatewayConfigured();
  return (
    <AppShell>
      <PageHeading
        eyebrow="Generar perfiles · LLM"
        title="Crea perfiles realistas en lote."
        actions={
          <Link href="/profiles" className="btn-pill">
            Volver
          </Link>
        }
      />
      {!supaOk && (
        <Notice tone="warn">
          Supabase no está configurado en este entorno.
        </Notice>
      )}
      {!gwOk && (
        <Notice tone="warn">
          AI Gateway no está configurado. Verifica AI_GATEWAY_API_KEY.
        </Notice>
      )}
      {supaOk && gwOk && (
        <SeedClient maxN={PROFILE_SEEDS.length} defaultN={Math.min(48, PROFILE_SEEDS.length)} />
      )}
    </AppShell>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "warn" }) {
  const color = tone === "warn" ? "var(--warning-500)" : "var(--accent-500)";
  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${color}`,
        borderRadius: "var(--radius-md)",
        background: "rgba(var(--fg),0.02)",
        color: "rgba(var(--fg),0.85)",
        lineHeight: 1.5,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
