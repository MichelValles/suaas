import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

const RUNS_REQUIRED_COLUMNS = [
  "target_id",
  "funnel_id",
  "ab_test_id",
  "copy_deck_id",
  "pricing_offer_id",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "profiles",
  "targets",
  "runs",
  "messages",
  "metrics",
  "five_second_responses",
  "funnels",
  "funnel_steps",
  "funnel_step_responses",
  "gateway_usage",
  "ab_tests",
  "ab_test_runs",
  "copy_decks",
  "copy_blocks",
  "copy_responses",
  "pricing_offers",
  "pricing_prices",
  "pricing_responses",
] as const;

type TableStatus = {
  table: string;
  ok: boolean;
  count: number | null;
  error: string | null;
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
    TABLES.map(async (table) => {
      const { count, error } = await supa
        .from(table)
        .select("*", { count: "exact", head: true });
      return {
        table,
        ok: !error,
        count: count ?? null,
        error: error?.message ?? null,
      };
    }),
  );

  // Auditar columnas críticas de `runs` (no basta con que la tabla
  // exista; algunas migraciones alteran columnas y pueden quedarse
  // parcialmente aplicadas).
  const runsColumns: { name: string; present: boolean }[] = await Promise.all(
    RUNS_REQUIRED_COLUMNS.map(async (col) => {
      const { error } = await supa
        .from("runs")
        .select(col, { head: true, count: "exact" })
        .limit(1);
      return { name: col, present: !error };
    }),
  );
  const missingRunsColumns = runsColumns.filter((c) => !c.present).map((c) => c.name);

  const allOk = results.every((r) => r.ok) && missingRunsColumns.length === 0;
  return NextResponse.json(
    {
      version: APP_VERSION,
      supabase: "configurado",
      schema_ok: allOk,
      tables: results,
      runs_columns: runsColumns,
      missing_runs_columns: missingRunsColumns,
    },
    { status: allOk ? 200 : 500 },
  );
}
