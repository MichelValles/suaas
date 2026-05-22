import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NewCampaignForm } from "./new-form";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Nueva campaña" title="Supabase aún no está conectado." />
        <Link href="/campaigns" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Nueva campaña · Paid Search"
        title="Sube los assets del anuncio bajo test."
        description="Estructura RSA de Google Ads: 3..15 titulares (30 chars), 2..4 descripciones (90 chars), 1..5 queries objetivo, landing (URL o upload) y hasta 6 creatividades opcionales. El brief libre ayuda al modelo a contextualizar pero no se le enseña al perfil."
        actions={<Link href="/campaigns" className="btn-pill">Volver</Link>}
      />
      <NewCampaignForm />
    </AppShell>
  );
}
