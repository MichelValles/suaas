/**
 * Tarifas de los modelos servidos vía AI Gateway, en dólares por millón de
 * tokens. El gateway cobra el precio del proveedor sin markup.
 *
 * Mantener alineadas con DEFAULT_MODEL / REASONER_MODEL de lib/gateway.ts;
 * un modelo que no esté en la tabla se resuelve por familia (opus, sonnet,
 * haiku) para sobrevivir a bumps de versión sin tocar este archivo.
 *
 * Módulo puro sin dependencias de servidor: importable desde componentes
 * cliente (formatUsd) y desde el estimador (usdForTokens).
 */

export type ModelPrice = { inputPerMtok: number; outputPerMtok: number };

const PRICES: Record<string, ModelPrice> = {
  "anthropic/claude-sonnet-4.6": { inputPerMtok: 3, outputPerMtok: 15 },
  "anthropic/claude-opus-4.7": { inputPerMtok: 5, outputPerMtok: 25 },
  "anthropic/claude-haiku-4.5": { inputPerMtok: 1, outputPerMtok: 5 },
};

const FAMILY_FALLBACK: [RegExp, ModelPrice][] = [
  [/opus/i, { inputPerMtok: 5, outputPerMtok: 25 }],
  [/sonnet/i, { inputPerMtok: 3, outputPerMtok: 15 }],
  [/haiku/i, { inputPerMtok: 1, outputPerMtok: 5 }],
];

export function priceForModel(model: string): ModelPrice | null {
  const exact = PRICES[model];
  if (exact) return exact;
  for (const [re, price] of FAMILY_FALLBACK) {
    if (re.test(model)) return price;
  }
  return null;
}

/** Coste en dólares de una llamada con esos tokens. Modelo desconocido: tarifa Sonnet. */
export function usdForTokens(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const price = priceForModel(model) ?? { inputPerMtok: 3, outputPerMtok: 15 };
  return (
    (promptTokens / 1e6) * price.inputPerMtok +
    (completionTokens / 1e6) * price.outputPerMtok
  );
}

/** Formato español: «0,12 $»; por debajo del céntimo, «<0,01 $». */
export function formatUsd(usd: number): string {
  if (usd > 0 && usd < 0.01) return "<0,01 $";
  return `${usd.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
}
