import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getCampaign } from "@/lib/campaigns";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewCampaignForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="ACCELERATION · Campañas" title="Supabase aún no está conectado." />
        <Link href="/campaigns" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }

  // ?from=<id> duplica una campaña existente: el formulario llega sembrado
  // con sus assets (la landing y las creatividades se reutilizan por URL,
  // sin resubir nada). Si el id no existe se abre el formulario vacío.
  const { from } = await searchParams;
  const duplicateFrom = from ? await getCampaign(from).catch(() => null) : null;

  return (
    <AppShell>
      <PageHeading
        eyebrow="ACCELERATION · Campañas"
        title="Nueva campaña"
        actions={<Link href="/campaigns" className="btn-pill">Volver</Link>}
      />
      <NewCampaignForm duplicateFrom={duplicateFrom ?? undefined} />
    </AppShell>
  );
}
