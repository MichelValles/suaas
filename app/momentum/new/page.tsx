import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listProfiles } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewChallengeForm } from "./new-challenge-form";

export default async function NewMomentumPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Momentum · Nuevo reto" title="Supabase no configurado." />
      </AppShell>
    );
  }

  const profiles = await listProfiles();

  if (profiles.length === 0) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Momentum · Nuevo reto"
          title="No hay perfiles todavía."
          actions={<Link href="/momentum" className="btn-pill">Volver</Link>}
        />
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Necesitas al menos un perfil para lanzar un análisis de Momentum.{" "}
          <Link href="/profiles/new" style={{ color: "var(--accent-500)" }}>
            Crea el primero
          </Link>
          .
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Momentum · Nuevo reto"
        title="Define el escenario"
        description="Describe el reto de activación que quieres explorar. Los perfiles seleccionados simularán cómo lo abordarían en su vida real."
        descriptionVariant="panel"
        actions={<Link href="/momentum" className="btn-pill">Volver</Link>}
      />
      <NewChallengeForm profiles={profiles} />
    </AppShell>
  );
}
