import { getAbTest, linkAbTestRun } from "@/lib/ab";
import { runFiveSecondTest } from "@/lib/experiments/five-second";
import { getServerClient } from "@/lib/supabase";

/**
 * Un A/B test reutiliza el test de 5 segundos: lanza DOS runs (uno por
 * variante) con el MISMO set de perfiles, en paralelo, y los enlaza al
 * ab_test mediante `ab_test_runs`. Las métricas individuales viven en cada
 * run; el análisis emparejado se hace en la página de resultados.
 */

export type RunAbInput = {
  abTestId: string;
  profileIds: string[];
};

export type RunAbOutput = {
  abTestId: string;
  runs: { variant: "A" | "B"; runId: string; targetId: string }[];
};

export async function runAbTest(input: RunAbInput): Promise<RunAbOutput> {
  const ab = await getAbTest(input.abTestId);
  if (!ab) throw new Error("A/B test no encontrado.");
  if (input.profileIds.length === 0) throw new Error("Sin perfiles para evaluar.");

  const [resA, resB] = await Promise.all([
    runFiveSecondTest({
      targetId: ab.target_a_id,
      profileIds: input.profileIds,
    }),
    runFiveSecondTest({
      targetId: ab.target_b_id,
      profileIds: input.profileIds,
    }),
  ]);

  // Marcar los runs con el ab_test_id (para listados) y enlazarlos por variant.
  const supa = getServerClient();
  await supa
    .from("runs")
    .update({ ab_test_id: ab.id })
    .in("id", [resA.runId, resB.runId]);

  await Promise.all([
    linkAbTestRun({ ab_test_id: ab.id, run_id: resA.runId, variant: "A" }),
    linkAbTestRun({ ab_test_id: ab.id, run_id: resB.runId, variant: "B" }),
  ]);

  return {
    abTestId: ab.id,
    runs: [
      { variant: "A", runId: resA.runId, targetId: ab.target_a_id },
      { variant: "B", runId: resB.runId, targetId: ab.target_b_id },
    ],
  };
}

