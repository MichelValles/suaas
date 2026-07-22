import { generateObject } from "ai";
import { z } from "zod";
import { getRunsModel } from "@/lib/chat-models";
import { recordUsage } from "@/lib/usage";

/**
 * Genera, a partir de un brief libre del usuario («una marca de zapatillas
 * sostenibles para corredores urbanos»), el contenido de los ejemplos que
 * siembra /seed-examples. Una sola llamada a generateObject produce un plan
 * coherente (misma marca y sector en todos los módulos seleccionados); cada
 * seed de lib/seed-examples.ts lo consume en lugar de sus defaults estáticos.
 *
 * Los módulos con imagen (claridad, A/B, embudo, campaña) necesitan URLs
 * públicas reales con og:image: el prompt pide homepages de marcas muy
 * conocidas del sector del brief. Si una URL no resuelve, el seed de ese
 * módulo falla de forma aislada y se reporta en su fila de resultado.
 */

// ============================================================
// Schemas y tipos del plan por módulo
// ============================================================

const UrlSchema = z
  .string()
  .url()
  .describe(
    "URL pública real (https) de una marca muy conocida y coherente con el brief. Debe ser una home o landing principal con metadatos Open Graph.",
  );

export const ClarityPlanSchema = z.object({
  name: z.string().min(1).describe("Nombre descriptivo del target, formato «Marca · qué se testea»."),
  url: UrlSchema,
  main_promise: z
    .string()
    .min(10)
    .describe("La promesa principal que la página debería comunicar en 5 segundos."),
});
export type ClarityPlan = z.infer<typeof ClarityPlanSchema>;

export const CopyPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10).describe("Qué se quiere aprender con este deck."),
  context: z.string().min(5).describe("Dónde viviría este copy (ej: hero de la landing)."),
  blocks: z
    .array(
      z.object({
        label: z.string().min(1).describe("Etiqueta corta de la variante, ej «v1 · directo con dato»."),
        text: z.string().min(3).describe("El copy de la variante."),
      }),
    )
    .min(3)
    .max(6)
    .describe("Variantes de copy con ángulos distintos (dato, emoción, prueba social...)."),
});
export type CopyPlan = z.infer<typeof CopyPlanSchema>;

export const PricingPlanSchema = z.object({
  name: z.string().min(1),
  description: z
    .string()
    .min(10)
    .describe("Descripción de la oferta: qué incluye y para quién es."),
  currency: z.string().min(1).describe("Código de moneda, normalmente EUR."),
  anchor_price: z
    .number()
    .positive()
    .nullable()
    .describe("Precio ancla de referencia, o null si no aplica."),
  prices: z
    .array(
      z.object({
        label: z.string().min(1).describe("Nombre del nivel, ej «starter · equipos pequeños»."),
        price: z.number().positive(),
      }),
    )
    .min(2)
    .max(6)
    .describe("Niveles de precio de menor a mayor."),
});
export type PricingPlan = z.infer<typeof PricingPlanSchema>;

export const AbPlanSchema = z.object({
  name: z.string().min(1).describe("Nombre del test, formato «Qué se compara · A vs B»."),
  hypothesis: z.string().min(10).describe("Hipótesis sobre cómo difieren ambas propuestas."),
  a: z.object({
    name: z.string().min(1),
    url: UrlSchema,
    promise: z.string().min(10).describe("Promesa principal de la variante A."),
  }),
  b: z.object({
    name: z.string().min(1),
    url: UrlSchema,
    promise: z.string().min(10).describe("Promesa principal de la variante B."),
  }),
});
export type AbPlan = z.infer<typeof AbPlanSchema>;

export const FunnelPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(10).describe("Qué recorrido simula el embudo."),
  steps: z
    .array(
      z.object({
        name: z.string().min(1).describe("Nombre del paso, ej «Home», «Precios»."),
        intent: z.string().min(3).describe("Qué debería conseguir el usuario en este paso."),
        url: UrlSchema.describe(
          "URL real de la página de este paso. Todos los pasos del MISMO sitio web.",
        ),
      }),
    )
    .min(2)
    .max(5)
    .describe("Pasos del recorrido, en orden, todos del mismo sitio."),
});
export type FunnelPlan = z.infer<typeof FunnelPlanSchema>;

export const CampaignPlanSchema = z.object({
  name: z.string().min(1).describe("Nombre de la campaña, ej «Marca · Paid Search junio»."),
  brief: z.string().min(10).describe("Brief estratégico: diferencial, tono, qué evitar."),
  final_url: UrlSchema.describe("Landing real a la que apunta el anuncio."),
  queries: z
    .array(z.string().min(2).describe("Query de búsqueda objetivo, máximo 120 caracteres."))
    .min(2)
    .max(5),
  headlines: z
    .array(
      z
        .string()
        .min(1)
        .describe("Titular RSA de Google Ads: MÁXIMO 30 caracteres, cuenta cada letra."),
    )
    .min(3)
    .max(8),
  descriptions: z
    .array(z.string().min(1).describe("Descripción RSA: MÁXIMO 90 caracteres."))
    .min(1)
    .max(3),
});
export type CampaignPlan = z.infer<typeof CampaignPlanSchema>;

export const GeoPlanSchema = z.object({
  name: z.string().min(1).describe("Nombre del análisis, ej «Visibilidad IA · Marca»."),
  brand_name: z.string().min(1).describe("Nombre de la marca del brief (puede ser ficticia)."),
  brand_description: z
    .string()
    .min(20)
    .describe("Descripción de la marca: qué hace, para quién, qué la diferencia."),
  segments: z
    .array(
      z.object({
        label: z.string().min(1).describe("Nombre corto del segmento de intención."),
        jtbd: z
          .string()
          .min(10)
          .describe("Frase JTBD: «Cuando [situación] quiero [motivación] para poder [resultado]»."),
        query: z
          .string()
          .min(2)
          .describe(
            "La pregunta conversacional que ese segmento le haría a un asistente IA (como se le habla a ChatGPT/Claude), no palabras clave sueltas de Google.",
          ),
      }),
    )
    .min(2)
    .max(4),
});
export type GeoPlan = z.infer<typeof GeoPlanSchema>;

export const MomentumPlanSchema = z.object({
  name: z.string().min(1).describe("Nombre corto del Trigger."),
  trigger_scenario: z
    .string()
    .min(20)
    .describe(
      "Escenario de activación en segunda persona: una situación vital concreta que despierta la necesidad relacionada con el brief. Sin mencionar la marca.",
    ),
  brand_context: z
    .string()
    .min(10)
    .optional()
    .describe("Contexto de la marca y su propuesta, por si el perfil la descubre."),
});
export type MomentumPlan = z.infer<typeof MomentumPlanSchema>;

const PLAN_SCHEMAS = {
  clarity: ClarityPlanSchema,
  copy: CopyPlanSchema,
  pricing: PricingPlanSchema,
  ab: AbPlanSchema,
  funnel: FunnelPlanSchema,
  campaign: CampaignPlanSchema,
  geo: GeoPlanSchema,
  momentum: MomentumPlanSchema,
} as const;

export type SeedPlanKind = keyof typeof PLAN_SCHEMAS;

export type SeedPlan = {
  clarity?: ClarityPlan;
  copy?: CopyPlan;
  pricing?: PricingPlan;
  ab?: AbPlan;
  funnel?: FunnelPlan;
  campaign?: CampaignPlan;
  geo?: GeoPlan;
  momentum?: MomentumPlan;
};

// ============================================================
// Generación
// ============================================================

const SYSTEM = [
  "Eres el motor de ejemplos de SUAAS, una plataforma de tests UX/CRO con perfiles calibrados.",
  "A partir de un brief, generas el contenido de ejemplo de los módulos solicitados.",
  "",
  "Reglas:",
  "- Todo el contenido visible en castellano natural y específico, nunca genérico de relleno.",
  "- Mantén coherencia entre módulos: misma marca, mismo sector, misma propuesta de valor.",
  "- Las URLs deben ser de sitios REALES y muy conocidos, coherentes con el sector del brief (la home o una landing principal). Nunca inventes dominios: se visitarán para extraer su og:image.",
  "- Si el brief describe una marca ficticia, úsala en los textos (copy, pricing, geo, momentum) y elige para las URLs marcas reales del mismo sector como referencia visual.",
  "- En la campaña, respeta los límites duros de Google Ads: titulares de 30 caracteres máximo y descripciones de 90.",
  "- No uses nunca el carácter em-dash en los textos.",
].join("\n");

export async function generateSeedPlan(
  brief: string,
  kinds: SeedPlanKind[],
): Promise<SeedPlan> {
  const shape = Object.fromEntries(
    kinds.map((k) => [k, PLAN_SCHEMAS[k]]),
  ) as Record<string, z.ZodTypeAny>;

  const runsModel = await getRunsModel();

  const res = await generateObject({
    model: runsModel,
    schema: z.object(shape),
    system: SYSTEM,
    prompt: [
      "## Brief",
      brief,
      "",
      `Genera el contenido de ejemplo para: ${kinds.join(", ")}.`,
    ].join("\n"),
  });

  await recordUsage({
    scope: "seed_brief",
    model: runsModel,
    usage: res.usage ?? null,
    meta: { kinds, brief_length: brief.length },
  });

  return sanitizePlan(res.object as SeedPlan);
}

/**
 * Red de seguridad sobre los límites duros que validan los InputSchema de
 * cada módulo (zod). El LLM respeta los describes casi siempre; si se pasa
 * en longitud, recortamos en vez de dejar caer el seed completo.
 */
function sanitizePlan(plan: SeedPlan): SeedPlan {
  if (plan.campaign) {
    plan.campaign = {
      ...plan.campaign,
      queries: plan.campaign.queries.slice(0, 5).map((q) => q.slice(0, 120)),
      headlines: plan.campaign.headlines
        .slice(0, 15)
        .map((h) => trimToLength(h, 30)),
      descriptions: plan.campaign.descriptions
        .slice(0, 5)
        .map((d) => trimToLength(d, 90)),
    };
  }
  if (plan.copy) {
    plan.copy = { ...plan.copy, blocks: plan.copy.blocks.slice(0, 10) };
  }
  if (plan.pricing) {
    plan.pricing = { ...plan.pricing, prices: plan.pricing.prices.slice(0, 8) };
  }
  if (plan.funnel) {
    plan.funnel = { ...plan.funnel, steps: plan.funnel.steps.slice(0, 12) };
  }
  return plan;
}

/** Recorta sin dejar palabras a medias cuando es posible. */
function trimToLength(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}
