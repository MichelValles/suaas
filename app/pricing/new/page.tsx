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
        description="La descripción es lo que el perfil leerá antes de decidir. 2..8 niveles de precio. Si pones un 'precio actual de referencia', el perfil lo verá y reaccionará respecto a él."
        actions={<Link href="/pricing" className="btn-pill">Volver</Link>}
      />
      <NewPricingForm />
    </AppShell>
  );
}
