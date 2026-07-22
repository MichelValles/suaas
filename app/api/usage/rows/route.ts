import { NextResponse } from "next/server";
import { listUsageRows } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * GET /api/usage/rows?model=&scope=&failed=1&page=1
 * Llamadas individuales de gateway_usage (con coste USD y latencia) para el
 * inspector embebido en /tokens.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const model = url.searchParams.get("model") || undefined;
  const scope = url.searchParams.get("scope") || undefined;
  const failedOnly = url.searchParams.get("failed") === "1";
  const page = Math.max(
    1,
    parseInt(url.searchParams.get("page") || "1", 10) || 1,
  );
  const { rows, total } = await listUsageRows({
    model,
    scope,
    failedOnly,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  return NextResponse.json({ rows, total, pageSize: PAGE_SIZE });
}
