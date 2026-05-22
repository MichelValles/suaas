import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { getProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/supabase";
import { EditProfileForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <PageHeading eyebrow="Editar perfil" title="Supabase aún no está conectado." />
        <Link href="/profiles" className="btn-pill">Volver</Link>
      </AppShell>
    );
  }
  const profile = await getProfile(id);
  if (!profile) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow="Editar perfil"
        title={profile.name}
        actions={
          <Link href={`/profiles/${id}`} className="btn-pill">
            Cancelar
          </Link>
        }
      />
      <EditProfileForm
        id={id}
        initial={{
          name: profile.name,
          age: profile.demographics.age,
          gender: profile.demographics.gender,
          occupation: profile.demographics.occupation,
          income_band: profile.demographics.income_band ?? "",
          geo: profile.demographics.geo ?? "",
          openness: profile.big_five.openness,
          conscientiousness: profile.big_five.conscientiousness,
          extraversion: profile.big_five.extraversion,
          agreeableness: profile.big_five.agreeableness,
          neuroticism: profile.big_five.neuroticism,
          capability: (profile.com_b_barriers.capability ?? []).join("\n"),
          opportunity: (profile.com_b_barriers.opportunity ?? []).join("\n"),
          motivation: (profile.com_b_barriers.motivation ?? []).join("\n"),
          backstory: profile.backstory,
          source: profile.source ?? "manual",
        }}
      />
    </AppShell>
  );
}
