import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewBrandForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewBrandPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Nueva marca" title="Supabase aún no está conectado." />
        <Link href="/cerebro" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Cerebro · nueva marca"
        title="Crea una marca."
        actions={
          <Link href="/cerebro" className="btn-pill">
            Volver
          </Link>
        }
      />
      <NewBrandForm />
    </AppShell>
  );
}
