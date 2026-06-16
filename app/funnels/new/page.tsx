import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewFunnelForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewFunnelPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="CONSTRUCTION · Embudos"
          title="Supabase aún no está conectado."
        />
        <Link href="/funnels" className="btn-pill">
          Volver
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="CONSTRUCTION · Embudos"
        title="Nuevo embudo"
        actions={
          <Link href="/funnels" className="btn-pill">
            Volver
          </Link>
        }
      />
      <NewFunnelForm />
    </AppShell>
  );
}
