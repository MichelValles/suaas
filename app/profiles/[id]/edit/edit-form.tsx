"use client";

import {
  ProfileForm,
  type ProfileFormInitial,
} from "@/components/profile-form";
import { updateProfileAction } from "./actions";

export function EditProfileForm({
  id,
  initial,
  brandSuggestions,
}: {
  id: string;
  initial: ProfileFormInitial;
  brandSuggestions?: string[];
}) {
  return (
    <ProfileForm
      initial={initial}
      action={updateProfileAction}
      submitLabel="Guardar cambios"
      hiddenInputs={{ __id: id }}
      brandSuggestions={brandSuggestions}
    />
  );
}
