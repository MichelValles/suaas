import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewProfileForm } from "./new-form";

export const metadata = { title: "SUAAS · Nuevo perfil" };

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
        description="Una vignette grounded combina datos estructurados (demografía, Big Five, barreras COM-B) con un backstory breve para que el agente hable con la voz de una persona concreta, no de un asistente. Cuanto más específico el backstory y mejor calibradas las barreras, menos cooperativo y más útil será el perfil al simular."
      />
      <NewProfileForm />
    </AppShell>
  );
}
