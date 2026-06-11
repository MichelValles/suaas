import { NextResponse } from "next/server";
import { getMigrationsStatus, type MigrationsStatus } from "@/lib/migrations";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cada tabla con la migración que la crea: si la tabla entera falta,
// pending_migrations debe señalar esa migración (aplicar solo el ALTER
// de una posterior fallaría con "relation does not exist").
// Mantener en paridad con app/diag/page.tsx.
const TABLES = [
  { table: "profiles", migration: "0001_initial.sql" },
  { table: "targets", migration: "0001_initial.sql" },
  { table: "runs", migration: "0001_initial.sql" },
  { table: "messages", migration: "0001_initial.sql" },
  { table: "metrics", migration: "0001_initial.sql" },
  { table: "five_second_responses", migration: "0002_five_second.sql" },
  { table: "funnels", migration: "0003_funnels.sql" },
  { table: "funnel_steps", migration: "0003_funnels.sql" },
  { table: "funnel_step_responses", migration: "0004_funnel_runs.sql" },
  { table: "gateway_usage", migration: "0005_gateway_usage.sql" },
  { table: "ab_tests", migration: "0006_ab_copy_pricing.sql" },
  { table: "ab_test_runs", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_decks", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_blocks", migration: "0006_ab_copy_pricing.sql" },
  { table: "copy_responses", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_offers", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_prices", migration: "0006_ab_copy_pricing.sql" },
  { table: "pricing_responses", migration: "0006_ab_copy_pricing.sql" },
  { table: "campaigns", migration: "0008_campaigns.sql" },
  { table: "campaign_responses", migration: "0008_campaigns.sql" },
  { table: "geo_analyses", migration: "0015_gravity_model.sql" },
  { table: "momentum_challenges", migration: "0016_momentum.sql" },
] as const;

// Columnas añadidas por migraciones posteriores a la creación de cada tabla.
// No basta con que la tabla exista: una migración a medio aplicar deja la
// columna fuera y el módulo correspondiente roto. Mantener en paridad con
// app/diag/page.tsx.
const CRITICAL_COLUMNS = [
  // runs: enlaces opcionales hacia cada módulo testeable
  { table: "runs", column: "target_id", migration: "0001_initial.sql" },
  { table: "runs", column: "funnel_id", migration: "0004_funnel_runs.sql" },
  { table: "runs", column: "ab_test_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "copy_deck_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "pricing_offer_id", migration: "0006_ab_copy_pricing.sql" },
  { table: "runs", column: "campaign_id", migration: "0008_campaigns.sql" },
  // papelera (soft delete)
  { table: "targets", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "funnels", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "ab_tests", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "copy_decks", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "pricing_offers", column: "deleted_at", migration: "0007_trash.sql" },
  { table: "campaigns", column: "deleted_at", migration: "0008_campaigns.sql" },
  { table: "profiles", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  { table: "geo_analyses", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  { table: "momentum_challenges", column: "deleted_at", migration: "0017_trash_geo_momentum_profiles.sql" },
  // campañas: multicanal y estrategia
  { table: "campaigns", column: "channels", migration: "0011_campaigns_multichannel.sql" },
  { table: "campaigns", column: "strategy", migration: "0013_campaigns_strategy.sql" },
  // Gravity Model
  { table: "profiles", column: "intent_context", migration: "0015_gravity_model.sql" },
  { table: "five_second_responses", column: "behavior_class", migration: "0015_gravity_model.sql" },
  // consolidación + estrategias nuevas
  { table: "campaigns", column: "intended_message", migration: "0019_consolidacion.sql" },
  { table: "campaign_responses", column: "behavior_class", migration: "0019_consolidacion.sql" },
  { table: "campaigns", column: "product", migration: "0020_shopping.sql" },
] as const;

type TableStatus = {
  table: string;
  migration: string;
  ok: boolean;
  count: number | null;
  error: string | null;
};

type ColumnStatus = {
  table: string;
  column: string;
  migration: string;
  present: boolean;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { version: APP_VERSION, supabase: "no configurado", tables: [] },
      { status: 200 },
    );
  }

  const supa = getServerClient();
  const results: TableStatus[] = await Promise.all(
    TABLES.map(async ({ table, migration }) => {
      const { count, error } = await supa
        .from(table)
        .select("*", { count: "exact", head: true });
      return {
        table,
        migration,
        ok: !error,
        count: count ?? null,
        error: error?.message ?? null,
      };
    }),
  );

  // Auditar columnas críticas: select head sobre la columna concreta.
  // present = !error (si la tabla entera falta, la columna también cuenta
  // como ausente, lo cual es correcto).
  const columns: ColumnStatus[] = await Promise.all(
    CRITICAL_COLUMNS.map(async ({ table, column, migration }) => {
      const { error } = await supa
        .from(table)
        .select(column, { head: true, count: "exact" })
        .limit(1);
      return { table, column, migration, present: !error };
    }),
  );
  const missingColumns = columns.filter((c) => !c.present);
  // Tablas ausentes primero: su migración creadora precede a cualquier
  // ALTER posterior sobre ellas.
  const missingTables = results.filter((r) => !r.ok);
  const pendingMigrations = [
    ...new Set([
      ...missingTables.map((t) => t.migration),
      ...missingColumns.map((c) => c.migration),
    ]),
  ].sort();

  const migrations: MigrationsStatus = await getMigrationsStatus().catch(
    (): MigrationsStatus => ({ tracking: false }),
  );

  const allOk = results.every((r) => r.ok) && missingColumns.length === 0;
  return NextResponse.json(
    {
      version: APP_VERSION,
      supabase: "configurado",
      schema_ok: allOk,
      tables: results,
      columns,
      missing_columns: missingColumns,
      pending_migrations: pendingMigrations,
      migrations_tracking: migrations,
    },
    { status: allOk ? 200 : 500 },
  );
}
