import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewCopyForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewCopyPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="KNOWLEDGE · Copy" title="Supabase aún no está conectado." />
        <Link href="/copy" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="KNOWLEDGE · Copy"
        title="Nuevo deck de copy"
        actions={<Link href="/copy" className="btn-pill">Volver</Link>}
      />
      <NewCopyForm />
    </AppShell>
  );
}
