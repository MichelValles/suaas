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
          eyebrow="CONSTRUCTION · Claridad 5s"
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
        eyebrow="CONSTRUCTION · Claridad 5s"
        title="Nuevo test de claridad"
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
