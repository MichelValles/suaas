import { createAbTest } from "@/lib/ab";
import { createCopyDeck } from "@/lib/copy";
import { createFunnel } from "@/lib/funnels";
import { createPricingOffer } from "@/lib/pricing";
import { listProfiles } from "@/lib/profiles";
import { createTarget, resolveOgImage } from "@/lib/targets";

/**
 * Construye ejemplos realistas en los 4 módulos para validar end-to-end
 * la plataforma con los 50 perfiles ya sembrados. Cada función crea los
 * registros y devuelve los ids para que el endpoint pueda enlazar el run.
 */

// ============================================================
// Copy (no requiere URLs)
// ============================================================

export async function seedCopyExample(): Promise<{ deckId: string }> {
  const deck = await createCopyDeck({
    name: "Headline CRO · Flat 101",
    description: "Cuatro variantes para captar leads de empresas con tráfico estancado.",
    context: "Hero de la landing del servicio de CRO de Flat 101",
    blocks: [
      {
        label: "v1 · directo con dato",
        text: "Convertimos un 32% más de tu tráfico actual. Sin tocar SEO ni gastar más en ads.",
      },
      {
        label: "v2 · emocional con dolor",
        text: "Cada visita que no compra te cuesta dinero. Recuperamos las que ya estaban a punto de convertir.",
      },
      {
        label: "v3 · prueba social",
        text: "Más de 200 marcas multiplican sus ventas con nuestro framework de CRO. Sin promesas, sólo tests medibles.",
      },
      {
        label: "v4 · específico por sector",
        text: "Especialistas en e-commerce: auditoría CRO en 48h con plan de tests priorizados por impacto.",
      },
    ],
  });
  return { deckId: deck.id };
}

// ============================================================
// Pricing (no requiere URLs)
// ============================================================

export async function seedPricingExample(): Promise<{ offerId: string }> {
  const offer = await createPricingOffer({
    name: "Suscripción · Flat 101 Lab",
    description:
      "Acceso mensual al laboratorio de SUAAS: tests ilimitados de claridad y embudo, perfiles personalizados a tu sector y un report trimestral con prioridades CRO accionables.",
    currency: "EUR",
    anchor_price: 299,
    prices: [
      { label: "founder · early adopter", price: 99 },
      { label: "actual · estándar", price: 299 },
      { label: "agency · multi-cliente", price: 499 },
      { label: "enterprise · ilimitado", price: 999 },
    ],
  });
  return { offerId: offer.id };
}

// ============================================================
// A/B test (URLs hipoteca BBVA vs ING)
// ============================================================

const AB_DEFAULTS = {
  name: "Landing hipoteca · BBVA vs ING",
  hypothesis:
    "La landing de ING comunica más rápido el tipo de interés porque el CTA y el dato conviven en el hero. BBVA arrastra el ojo a la calculadora.",
  a: {
    name: "BBVA · hipoteca fija",
    url: "https://www.bbva.es/personas/productos/hipotecas/hipoteca-fija.html",
    promise: "Hipoteca a tipo fijo desde el 2,50% TIN sin comisiones de apertura.",
  },
  b: {
    name: "ING · hipoteca Naranja fija",
    url: "https://www.ing.es/hipotecas/hipoteca-naranja",
    promise: "Hipoteca Naranja Fija sin comisiones y con un proceso 100% online.",
  },
};

export async function seedAbExample(): Promise<{
  abTestId: string;
  aTargetId: string;
  bTargetId: string;
}> {
  const [aImg, bImg] = await Promise.all([
    resolveOgImage(AB_DEFAULTS.a.url),
    resolveOgImage(AB_DEFAULTS.b.url),
  ]);
  if (!aImg) {
    throw new Error(`No se pudo resolver og:image para ${AB_DEFAULTS.a.url}.`);
  }
  if (!bImg) {
    throw new Error(`No se pudo resolver og:image para ${AB_DEFAULTS.b.url}.`);
  }

  const a = await createTarget({
    name: AB_DEFAULTS.a.name,
    payload: {
      kind: "5s_test",
      main_promise: AB_DEFAULTS.a.promise,
      image_url: aImg,
      source_url: AB_DEFAULTS.a.url,
    },
  });
  const b = await createTarget({
    name: AB_DEFAULTS.b.name,
    payload: {
      kind: "5s_test",
      main_promise: AB_DEFAULTS.b.promise,
      image_url: bImg,
      source_url: AB_DEFAULTS.b.url,
    },
  });

  const ab = await createAbTest({
    name: AB_DEFAULTS.name,
    hypothesis: AB_DEFAULTS.hypothesis,
    target_a_id: a.id,
    target_b_id: b.id,
  });

  return { abTestId: ab.id, aTargetId: a.id, bTargetId: b.id };
}

// ============================================================
// Funnel (4 pasos Filmin)
// ============================================================

const FUNNEL_DEFAULTS = {
  name: "Onboarding Filmin · descubrimiento a suscripción",
  description:
    "Recorrido típico de un nuevo visitante: aterriza, explora catálogo, evalúa una película y decide suscribirse.",
  steps: [
    {
      name: "Home",
      intent: "Entender qué es Filmin y por qué es distinto de Netflix/Prime.",
      url: "https://www.filmin.es/",
    },
    {
      name: "Colección destacada",
      intent: "Descubrir contenido curado que diferencie a Filmin.",
      url: "https://www.filmin.es/coleccion/lo-mejor",
    },
    {
      name: "Ficha de película",
      intent: "Evaluar interés concreto por una película disponible.",
      url: "https://www.filmin.es/pelicula/el-fabuloso-destino-de-amelie-poulain",
    },
    {
      name: "Página de suscripción",
      intent: "Elegir plan y completar la suscripción.",
      url: "https://www.filmin.es/registro",
    },
  ],
};

export async function seedFunnelExample(): Promise<{ funnelId: string }> {
  const resolved = await Promise.all(
    FUNNEL_DEFAULTS.steps.map(async (s) => {
      const img = await resolveOgImage(s.url);
      if (!img) {
        throw new Error(`No se pudo resolver og:image para ${s.url}`);
      }
      return {
        name: s.name,
        intent: s.intent,
        payload: { kind: "url" as const, image_url: img, source_url: s.url },
      };
    }),
  );

  const funnel = await createFunnel({
    name: FUNNEL_DEFAULTS.name,
    description: FUNNEL_DEFAULTS.description,
    steps: resolved,
  });

  return { funnelId: funnel.id };
}

// ============================================================
// Selector de perfiles aleatorios (para lanzar runs auto)
// ============================================================

export async function pickRandomProfileIds(n: number): Promise<string[]> {
  const profiles = await listProfiles();
  if (profiles.length === 0) return [];
  const shuffled = [...profiles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, profiles.length)).map((p) => p.id);
}
