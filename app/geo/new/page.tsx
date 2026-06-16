import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewGeoForm } from "./new-form";

export default function NewGeoPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION · GEO Tester" title="Supabase aún no está conectado." />
        <Link href="/geo" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCELERATION · GEO Tester"
        title="Nuevo análisis GEO"
        actions={
          <Link href="/geo" className="btn-pill">
            Cancelar
          </Link>
        }
      />
      <NewGeoForm />
    </AppShell>
  );
}
