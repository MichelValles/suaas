/**
 * Vercel AI Gateway.
 *
 * Acceso unificado a múltiples proveedores con failover y observabilidad.
 * Con AI SDK v6 basta con pasar el string "provider/model" al `model:` de
 * `generateText` / `streamText` / `generateObject`. La clave se autoprovisiona
 * en Vercel (AI_GATEWAY_API_KEY); en local sincronizar con `vercel env pull`.
 *
 * Uso:
 *   import { generateText } from "ai";
 *   import { DEFAULT_MODEL } from "@/lib/gateway";
 *   const { text } = await generateText({
 *     model: DEFAULT_MODEL,
 *     prompt: "...",
 *   });
 */

export const DEFAULT_MODEL =
  process.env.SUAAS_DEFAULT_MODEL ?? "anthropic/claude-sonnet-4.6";

export const REASONER_MODEL =
  process.env.SUAAS_REASONER_MODEL ?? "anthropic/claude-opus-4.7";

export function isGatewayConfigured(): boolean {
  // En Vercel la var se inyecta sin acción del usuario. En local, depende del pull.
  return Boolean(process.env.AI_GATEWAY_API_KEY) || process.env.VERCEL === "1";
}
