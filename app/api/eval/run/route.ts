import { NextResponse } from "next/server";
import {
  DEFAULT_JUDGE_MODEL,
  runEvalForModel,
  type EvalModelResult,
} from "@/lib/eval";
import { isGatewayConfigured } from "@/lib/gateway";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/eval/run
 * body: { targets: string[] (1-2 modelos objetivo), judge?: string }
 * Corre el golden set contra cada modelo objetivo, juzgado por un modelo de
 * otra familia (por defecto OpenAI). Los modelos se corren en secuencia para
 * comparar sin saturar el gateway. Cada llamada se registra en gateway_usage
 * (scopes eval_target / eval_judge), así que su coste aparece en /observabilidad.
 */
export async function POST(req: Request) {
  if (!isGatewayConfigured()) {
    return NextResponse.json(
      { error: "AI Gateway no configurado." },
      { status: 503 },
    );
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      targets?: unknown;
      judge?: unknown;
    };
    const targets = Array.isArray(body.targets)
      ? body.targets
          .filter((t): t is string => typeof t === "string" && t.length > 0)
          .filter((t, i, a) => a.indexOf(t) === i)
          .slice(0, 2)
      : [];
    const judge =
      typeof body.judge === "string" && body.judge
        ? body.judge
        : DEFAULT_JUDGE_MODEL;

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "Indica al menos un modelo objetivo." },
        { status: 400 },
      );
    }

    const results: EvalModelResult[] = [];
    for (const target of targets) {
      results.push(await runEvalForModel(target, judge));
    }
    return NextResponse.json({ judge, results });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
