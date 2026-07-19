import { getSetting } from "@/lib/settings";
import { DEFAULT_MODEL, REASONER_MODEL } from "@/lib/gateway";

/**
 * Modelos del chat 1:1 (Talker-Reasoner). Se eligen en /tokens (tabla
 * app_settings, clave 'chat_models'), por empresa y modelo. El endpoint
 * /api/chat lee la elección en cada turno; las tandas por lotes (5s, copy,
 * pricing, embudos, campañas, momentum) siguen usando el modelo por defecto
 * del despliegue (SUAAS_DEFAULT_MODEL / SUAAS_REASONER_MODEL).
 *
 * Módulo server-only (importa getSetting). El componente cliente recibe el
 * catálogo como prop e importa solo los tipos, como el selector del GEO.
 */

export type ChatModels = { talker: string; reasoner: string };

export type ChatModelOption = { id: string; label: string; priceHint: string };
export type ChatProviderGroup = { provider: string; models: ChatModelOption[] };

/**
 * Catálogo por empresa. Slugs 'provider/model' del gateway; tarifas alineadas
 * con model-pricing.ts (y con el catálogo del GEO Tester).
 */
export const CHAT_MODEL_CATALOG: ChatProviderGroup[] = [
  {
    provider: "Anthropic",
    models: [
      { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 · ligero", priceHint: "1/5 $ por MTok" },
      { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 · estándar", priceHint: "3/15 $ por MTok" },
      { id: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7 · frontera", priceHint: "5/25 $ por MTok" },
      { id: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8 · frontera", priceHint: "5/25 $ por MTok" },
    ],
  },
  {
    provider: "OpenAI",
    models: [
      { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini · ligero", priceHint: "0,75/4,5 $ por MTok" },
      { id: "openai/gpt-5.4", label: "GPT-5.4 · estándar", priceHint: "2,5/15 $ por MTok" },
      { id: "openai/gpt-5.5", label: "GPT-5.5 · frontera", priceHint: "5/30 $ por MTok" },
    ],
  },
];

export const CHAT_MODELS_SETTING_KEY = "chat_models";

export const CHAT_MODEL_IDS: string[] = CHAT_MODEL_CATALOG.flatMap((g) =>
  g.models.map((m) => m.id),
);

export function defaultChatModels(): ChatModels {
  return { talker: DEFAULT_MODEL, reasoner: REASONER_MODEL };
}

/**
 * Modelos vigentes del chat: lo guardado en app_settings validado contra el
 * catálogo (un slug fuera de catálogo cae al default del despliegue).
 */
export async function getChatModels(): Promise<ChatModels> {
  const stored = await getSetting<Partial<ChatModels>>(
    CHAT_MODELS_SETTING_KEY,
    {},
  );
  const base = defaultChatModels();
  const pick = (v: string | undefined, fallback: string) =>
    v && CHAT_MODEL_IDS.includes(v) ? v : fallback;
  return {
    talker: pick(stored?.talker, base.talker),
    reasoner: pick(stored?.reasoner, base.reasoner),
  };
}
