import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewPricingForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewPricingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Nueva oferta" title="Supabase aún no está conectado." />
        <Link href="/pricing" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Nueva oferta de pricing"
        title="Define la oferta y los precios a testear."
        actions={<Link href="/pricing" className="btn-pill">Volver</Link>}
      />
      <NewPricingForm />
    </AppShell>
  );
}
