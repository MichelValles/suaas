import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listTargets } from "@/lib/targets";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewAbForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewAbPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Nuevo A/B test" title="Supabase aún no está conectado." />
        <Link href="/ab" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  const targets = await listTargets();
  return (
    <AppShell>
      <PageHeading
        eyebrow="Nuevo A/B test"
        title="Elige dos tests de claridad para enfrentar."
        description="Ambas variantes deben ser tests de claridad ya creados. Tras crear el A/B, podrás lanzar el run contra el set de perfiles que elijas."
        actions={<Link href="/ab" className="btn-pill">Volver</Link>}
      />
      <NewAbForm
        targets={targets.map((t) => ({
          id: t.id,
          name: t.name,
          main_promise: t.payload.main_promise,
        }))}
      />
    </AppShell>
  );
}
