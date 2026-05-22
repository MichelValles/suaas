import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default function ProfilesImportPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Importar perfiles"
          title="Supabase aún no está conectado."
        />
        <Link href="/profiles" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Importar perfiles · CSV"
        title="Sube un CSV con tus perfiles."
        actions={
          <Link href="/profiles" className="btn-pill">
            Volver
          </Link>
        }
      />
      <ImportClient />
    </AppShell>
  );
}
