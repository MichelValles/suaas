import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewTargetForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewTargetPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Nuevo target"
          title="Supabase aún no está conectado."
        />
        <Link href="/targets" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Nuevo target · 5s_test"
        title="Define qué van a ver durante 5 segundos."
        description="La promesa principal es lo que esperas que un usuario recuerde si la pantalla funciona. El test mide si ese recall se da o no."
        actions={
          <Link href="/targets" className="btn-pill">
            Volver
          </Link>
        }
      />
      <NewTargetForm />
    </AppShell>
  );
}
