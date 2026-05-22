"use client";

import {
  ProfileForm,
  type ProfileFormInitial,
} from "@/components/profile-form";
import { updateProfileAction } from "./actions";

export function EditProfileForm({
  id,
  initial,
}: {
  id: string;
  initial: ProfileFormInitial;
}) {
  return (
    <ProfileForm
      initial={initial}
      action={updateProfileAction}
      submitLabel="Guardar cambios"
      hiddenInputs={{ __id: id }}
    />
  );
}
