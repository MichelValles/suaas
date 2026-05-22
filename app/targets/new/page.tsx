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
          eyebrow="Nuevo test de claridad"
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
        eyebrow="Nuevo test de claridad · 5 s"
        title="Define qué van a ver durante 5 segundos."
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
