"use client";

import {
  DEFAULT_PROFILE_INITIAL,
  ProfileForm,
} from "@/components/profile-form";
import { createProfileAction } from "./actions";

export function NewProfileForm() {
  return (
    <ProfileForm
      initial={DEFAULT_PROFILE_INITIAL}
      action={createProfileAction}
      submitLabel="Crear perfil"
    />
  );
}
