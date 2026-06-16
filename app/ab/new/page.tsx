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
        <PageHeading eyebrow="KNOWLEDGE · A/B tests" title="Supabase aún no está conectado." />
        <Link href="/ab" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  const targets = await listTargets();
  return (
    <AppShell>
      <PageHeading
        eyebrow="KNOWLEDGE · A/B tests"
        title="Nuevo A/B test"
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
