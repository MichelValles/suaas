"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ProfileExplorer } from "@/components/profile-explorer";
import type { Profile } from "@/lib/profiles";

export function ProfilesManageView({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleDelete(id: string) {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      window.alert(`No se pudo borrar: ${json?.error ?? res.statusText}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return <ProfileExplorer profiles={profiles} mode="manage" onDelete={handleDelete} />;
}
