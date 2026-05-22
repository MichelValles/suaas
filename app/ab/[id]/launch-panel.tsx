"use client";

import { ProfileLaunchPanel } from "@/components/profile-launch-panel";
import type { Profile } from "@/lib/profiles";

export function LaunchAbPanel({
  abTestId,
  profiles,
}: {
  abTestId: string;
  profiles: Profile[];
}) {
  return (
    <ProfileLaunchPanel
      title="Lanzar A/B (dos runs en paralelo)"
      endpoint="/api/runs/ab"
      extraBody={{ abTestId }}
      progressLabel="Lanzando dos runs 5s en paralelo. Estimado 30-60 s."
      redirectTo={(json) =>
        json.abTestId ? `/experiments/ab/${json.abTestId}` : `/ab/${abTestId}`
      }
      profiles={profiles}
    />
  );
}
