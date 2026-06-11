import { getServerClient, isMissingTableError } from "@/lib/supabase";

/**
 * Tracking de migraciones aplicadas (tabla `suaas_migrations`, creada por
 * 0019_consolidacion.sql con backfill de las anteriores). Convención: cada
 * migración nueva termina insertando su propia fila.
 *
 * Mantener esta lista al añadir archivos a supabase/migrations.
 */
export const KNOWN_MIGRATIONS = [
  "0001_initial.sql",
  "0002_five_second.sql",
  "0003_funnels.sql",
  "0004_funnel_runs.sql",
  "0005_gateway_usage.sql",
  "0006_ab_copy_pricing.sql",
  "0007_trash.sql",
  "0008_campaigns.sql",
  "0009_campaigns_relax.sql",
  "0010_campaigns_channel.sql",
  "0011_campaigns_multichannel.sql",
  "0012_campaigns_headlines_fix.sql",
  "0013_campaigns_strategy.sql",
  "0014_campaigns_display.sql",
  "0015_gravity_model.sql",
  "0016_momentum.sql",
  "0017_trash_geo_momentum_profiles.sql",
  "0018_campaigns_descriptions_fix.sql",
  "0019_consolidacion.sql",
  "0020_shopping.sql",
] as const;

export type MigrationsStatus =
  /** La tabla suaas_migrations no existe: la 0019 está sin aplicar. */
  | { tracking: false }
  | { tracking: true; applied: string[]; pending: string[] };

export async function getMigrationsStatus(): Promise<MigrationsStatus> {
  const supa = getServerClient();
  const { data, error } = await supa.from("suaas_migrations").select("name");
  if (isMissingTableError(error)) return { tracking: false };
  if (error) throw new Error(error.message);
  const applied = new Set((data ?? []).map((r) => r.name as string));
  return {
    tracking: true,
    applied: KNOWN_MIGRATIONS.filter((m) => applied.has(m)),
    pending: KNOWN_MIGRATIONS.filter((m) => !applied.has(m)),
  };
}
