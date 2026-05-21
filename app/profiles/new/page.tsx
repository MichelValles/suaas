import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewProfileForm } from "./new-form";

export const metadata = { title: "USAAS · Nuevo perfil" };

export default function NewProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Perfiles · usuarios sintéticos"
          title="Supabase aún no está conectado."
          description="No se puede crear perfiles hasta provisionar Supabase desde el Marketplace de Vercel."
        />
        <Link href="/profiles" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Nuevo perfil"
        title="Define una vignette grounded."
        description="Cuanto más concreto sea el backstory y mejor calibradas las barreras COM-B, menos cooperativo y más realista será el agente al simular."
      />
      <NewProfileForm />
    </AppShell>
  );
}
