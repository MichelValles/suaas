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
        <PageHeading eyebrow="Nueva campaña" title="Supabase aún no está conectado." />
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
        eyebrow={duplicateFrom ? "Nueva campaña · duplicado" : "Nueva campaña · Paid Search"}
        title={
          duplicateFrom
            ? `Iterando sobre «${duplicateFrom.name}».`
            : "Sube los assets del anuncio bajo test."
        }
        actions={<Link href="/campaigns" className="btn-pill">Volver</Link>}
      />
      <NewCampaignForm duplicateFrom={duplicateFrom ?? undefined} />
    </AppShell>
  );
}
