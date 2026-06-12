import {
  MigrationPendingError,
  getServerClient,
  isMissingTableError,
  isSupabaseConfigured,
} from "@/lib/supabase";

/**
 * Ajustes globales de la app (tabla `app_settings`, clave/valor jsonb).
 * Server-only. Si la tabla aún no existe (migración 0022 sin aplicar),
 * la lectura devuelve el fallback y la escritura lanza
 * MigrationPendingError para que la UI muestre el aviso estándar.
 */

const MIGRATION = "0023_app_settings.sql";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  const supa = getServerClient();
  const { data, error } = await supa
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    if (!isMissingTableError(error)) {
      console.warn(`[getSetting] ${key}:`, error.message);
    }
    return fallback;
  }
  return (data?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const supa = getServerClient();
  const { error } = await supa
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) {
    if (isMissingTableError(error)) throw new MigrationPendingError(MIGRATION);
    throw new Error(error.message);
  }
}

/** True si la tabla de ajustes existe (para avisar de la migración en la UI). */
export async function settingsTableReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supa = getServerClient();
  const { error } = await supa.from("app_settings").select("key").limit(1);
  return !isMissingTableError(error);
}
