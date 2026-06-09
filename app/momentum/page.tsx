import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listMomentumChallenges } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MomentumList } from "./momentum-list";

export const dynamic = "force-dynamic";

export default async function MomentumPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Momentum" title="Supabase aún no está conectado." />
      </AppShell>
    );
  }

  let challenges;
  try {
    challenges = await listMomentumChallenges();
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("does not exist") || message.includes("relation")) {
      return (
        <AppShell>
          <PageHeading eyebrow="Momentum" title="Tabla pendiente de migración." />
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>
            Aplica la migración <code>0016_momentum.sql</code> en Supabase para activar este módulo.
          </p>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <PageHeading eyebrow="Momentum" title="Error al cargar los retos." />
        <p style={{ color: "#f87171", fontSize: 14, margin: 0 }}>Error interno.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Momentum"
        title="Intent Momentum"
        description="Define escenarios de activación y descubre cómo tus perfiles iniciarían ese reto en su vida real, antes de que ninguna marca entre en su radar."
        actions={
          <Link href="/momentum/new" className="btn-pill solid">
            Nuevo reto
          </Link>
        }
      />
      <MomentumList challenges={challenges} />
    </AppShell>
  );
}
