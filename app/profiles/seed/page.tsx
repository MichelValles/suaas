import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, PageHeading } from "@/components/app-shell";
import { SeedGate } from "@/components/seed-gate";
import { estimateAction, partsForKind } from "@/lib/estimate";
import { isGatewayConfigured } from "@/lib/gateway";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import { PROFILE_SEEDS } from "@/lib/seed-profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SeedClient } from "./seed-client";

export const dynamic = "force-dynamic";

export default async function ProfileSeedPage() {
  const supaOk = isSupabaseConfigured();
  const gwOk = isGatewayConfigured();
  const jar = await cookies();
  const unlocked = jar.get(SEED_COOKIE)?.value === SEED_VALUE;
  // Coste estimado por perfil (1 llamada Opus): el cliente lo multiplica por n.
  const seedEstimate =
    supaOk && gwOk && unlocked
      ? await estimateAction(partsForKind("seed_profiles", { profiles: 1 })).catch(
          () => null,
        )
      : null;
  return (
    <AppShell>
      <PageHeading
        eyebrow="CONSTRUCTION · Perfiles"
        title="Generar perfiles"
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
      {supaOk && !unlocked && <SeedGate />}
      {supaOk && gwOk && unlocked && (
        <SeedClient
          maxN={PROFILE_SEEDS.length}
          defaultN={Math.min(48, PROFILE_SEEDS.length)}
          usdPerProfile={seedEstimate?.est_usd ?? null}
        />
      )}
    </AppShell>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "warn" }) {
  const color = tone === "warn" ? "var(--warning-text)" : "var(--accent-500)";
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
