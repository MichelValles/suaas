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
        description="Cada fila se valida con las mismas reglas que el formulario web. Las filas con errores se marcan en rojo y no se importan. Las válidas se crean cuando confirmas."
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
