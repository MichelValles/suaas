import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase server-only con service role. Toda la lectura/escritura
 * de SUAAS pasa por aquí; el navegador nunca habla directamente con la
 * base. Las vars se autoprovisionan al instalar Supabase desde el
 * Marketplace de Vercel.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let server: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!server) {
    server = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return server;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && SERVICE_ROLE_KEY);
}

/**
 * Error de "migración pendiente": la query falló porque falta aplicar
 * una migración SQL en Supabase. El mensaje es seguro para mostrar al
 * usuario (solo nombra el archivo de migración).
 */
export class MigrationPendingError extends Error {
  migration: string;

  constructor(migration: string) {
    super(
      `Falta aplicar la migración ${migration} en el SQL editor de Supabase (y después NOTIFY pgrst, 'reload schema';).`,
    );
    this.name = "MigrationPendingError";
    this.migration = migration;
  }
}

/**
 * Detecta si un error proviene de una tabla que no existe (PostgREST
 * code `PGRST205` o mensaje "Could not find the table"). Útil para
 * mostrar mensajes de "aplica la migración X" en vez de stack traces.
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "PGRST205") return true;
  if (typeof e.message === "string" && /could not find the table/i.test(e.message)) {
    return true;
  }
  return false;
}

/**
 * Detecta si un error proviene de una columna que no existe (Postgres
 * code `42703` o PostgREST `PGRST204`, o mensaje "column ... does not
 * exist"). Útil para hacer fallback cuando una migración aditiva todavía
 * no se ha aplicado (ej. `deleted_at` antes de 0007_trash.sql).
 */
export function isMissingColumnError(err: unknown, column?: string): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42703") {
    return column
      ? typeof e.message === "string" && e.message.includes(column)
      : true;
  }
  if (e.code === "PGRST204") return true;
  if (typeof e.message === "string" && /column .* does not exist/i.test(e.message)) {
    return column ? e.message.includes(column) : true;
  }
  return false;
}
