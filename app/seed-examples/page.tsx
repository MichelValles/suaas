import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isGatewayConfigured } from "@/lib/gateway";
import { SEED_COOKIE, SEED_VALUE } from "@/lib/seed-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SeedExamplesClient } from "./client";
import { SeedGate } from "./seed-gate";

export const dynamic = "force-dynamic";

export default async function SeedExamplesPage() {
  const supaOk = isSupabaseConfigured();
  const gwOk = isGatewayConfigured();
  const jar = await cookies();
  const unlocked = jar.get(SEED_COOKIE)?.value === SEED_VALUE;
  return (
    <AppShell>
      <PageHeading
        eyebrow="Sembrar ejemplos"
        title="Crea ejemplos en los 8 módulos."
        description="Sin brief se siembran los ejemplos de muestra predefinidos. Con brief, el contenido de cada módulo se genera con IA a medida de la marca o sector que describas."
        actions={
          <Link href="/" className="btn-pill">
            Volver al panel
          </Link>
        }
      />
      {!supaOk && <Notice>Supabase no está configurado.</Notice>}
      {!gwOk && (
        <Notice>
          AI Gateway no está configurado. La creación de ejemplos funcionará,
          pero "lanzar runs" requiere gateway activo.
        </Notice>
      )}
      {supaOk && !unlocked && <SeedGate />}
      {supaOk && unlocked && <SeedExamplesClient />}
    </AppShell>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--warning-500)",
        borderRadius: "var(--radius-md)",
        background: "rgba(180,83,9,0.08)",
        color: "rgba(var(--fg),0.85)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
