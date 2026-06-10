import { getTokensLast24h } from "@/lib/usage";

/**
 * Presupuesto diario de tokens (control de coste, hallazgo C-03 de la
 * auditoría: recordUsage solo observaba). Se configura con la env var
 * SUAAS_DAILY_TOKEN_BUDGET (número de tokens por ventana de 24h). Sin
 * configurar, no hay límite (comportamiento anterior).
 */

export class BudgetExceededError extends Error {
  spent: number;
  budget: number;

  constructor(spent: number, budget: number) {
    super(
      `Presupuesto diario de tokens agotado: ${Math.round(spent).toLocaleString("es-ES")} consumidos de ${budget.toLocaleString("es-ES")} en las últimas 24h. Sube SUAAS_DAILY_TOKEN_BUDGET o espera a que la ventana avance.`,
    );
    this.name = "BudgetExceededError";
    this.spent = spent;
    this.budget = budget;
  }
}

export function getDailyBudget(): number | null {
  const raw = process.env.SUAAS_DAILY_TOKEN_BUDGET;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function assertBudget(): Promise<void> {
  const budget = getDailyBudget();
  if (!budget) return;
  const spent = await getTokensLast24h();
  if (spent >= budget) throw new BudgetExceededError(spent, budget);
}

/**
 * Gate listo para route handlers: 429 con mensaje de negocio si el
 * presupuesto está agotado, null si se puede continuar. Un fallo leyendo
 * el consumo NO bloquea (la telemetría no debe tumbar los runs).
 */
export async function budgetGate(): Promise<Response | null> {
  try {
    await assertBudget();
    return null;
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return Response.json({ ok: false, error: err.message }, { status: 429 });
    }
    console.warn("[budgetGate] lectura de consumo falló:", (err as Error).message);
    return null;
  }
}
