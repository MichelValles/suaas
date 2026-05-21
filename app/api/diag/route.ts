import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { APP_VERSION } from "@/lib/version";

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

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    {
      version: APP_VERSION,
      supabase: "configurado",
      schema_ok: allOk,
      tables: results,
    },
    { status: allOk ? 200 : 500 },
  );
}
