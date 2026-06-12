"use server";

import { revalidatePath } from "next/cache";
import {
  GEO_ENGINE_CATALOG,
  GEO_MODELS_SETTING_KEY,
  type GeoEngineModels,
  defaultGeoEngineModels,
} from "@/lib/geo-engines";
import { setSetting } from "@/lib/settings";
import { MigrationPendingError, isSupabaseConfigured } from "@/lib/supabase";

export type GeoModelsFormState = {
  ok: boolean;
  error?: string;
};

export async function saveGeoEngineModelsAction(
  _prev: GeoModelsFormState,
  formData: FormData,
): Promise<GeoModelsFormState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase no configurado." };
  }

  const models = defaultGeoEngineModels();
  for (const spec of GEO_ENGINE_CATALOG) {
    const raw = formData.get(`model_${spec.id}`);
    if (typeof raw !== "string" || !spec.models.some((m) => m.id === raw)) {
      return {
        ok: false,
        error: `Modelo no válido para ${spec.label}.`,
      };
    }
    models[spec.id] = raw;
  }

  try {
    await setSetting(GEO_MODELS_SETTING_KEY, models satisfies GeoEngineModels);
  } catch (err) {
    if (err instanceof MigrationPendingError) {
      return { ok: false, error: err.message };
    }
    console.error("[saveGeoEngineModels]", (err as Error).message);
    return { ok: false, error: "No se pudo guardar la configuración." };
  }

  revalidatePath("/tokens");
  return { ok: true };
}
