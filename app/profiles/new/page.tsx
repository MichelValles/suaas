import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewProfileForm } from "./new-form";

export const metadata = { title: "Gravity · Nuevo perfil" };

export default function NewProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="CONSTRUCTION · Perfiles"
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
        eyebrow="CONSTRUCTION · Perfiles"
        title="Nuevo perfil"
      />
      <NewProfileForm />
    </AppShell>
  );
}
