import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { listProfiles } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ProfilesManageView } from "./manage-view";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading
          eyebrow="Perfiles · vignettes grounded"
          title="Supabase aún no está conectado."
          description="Provisiona Supabase desde el Marketplace de Vercel y aplica las migraciones."
        />
      </AppShell>
    );
  }
  let profiles: Awaited<ReturnType<typeof listProfiles>> = [];
  let err: string | null = null;
  try {
    profiles = await listProfiles();
  } catch (e) {
    err = (e as Error).message;
  }
  return (
    <AppShell>
      <PageHeading
        eyebrow="Perfiles · vignettes grounded"
        title="Hablamos con perfiles calibrados."
        actions={
          <Link href="/profiles/new" className="btn-pill solid">
            Nuevo perfil
          </Link>
        }
      />
      {err && (
        <div
          style={{
            padding: 24,
            border: "1px solid var(--error-500)",
            borderRadius: "var(--radius-md)",
            background: "rgba(var(--fg),0.02)",
            color: "rgba(var(--fg),0.85)",
          }}
        >
          Error consultando perfiles: {err}
        </div>
      )}
      {!err && <ProfilesManageView profiles={profiles} />}
    </AppShell>
  );
}
