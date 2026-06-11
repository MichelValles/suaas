import { createAbTest } from "@/lib/ab";
import { createCampaign, type Strategy } from "@/lib/campaigns";
import { createCopyDeck } from "@/lib/copy";
import { createFunnel } from "@/lib/funnels";
import { createGeoAnalysis } from "@/lib/geo";
import { createMomentumChallenge } from "@/lib/momentum";
import { createPricingOffer } from "@/lib/pricing";
import { listProfiles } from "@/lib/profiles";
import type {
  AbPlan,
  CampaignPlan,
  ClarityPlan,
  CopyPlan,
  FunnelPlan,
  GeoPlan,
  MomentumPlan,
  PricingPlan,
} from "@/lib/seed-brief";
import { createTarget, resolveOgImage } from "@/lib/targets";

/**
 * Construye ejemplos realistas en los 8 módulos para validar end-to-end
 * la plataforma con los 50 perfiles ya sembrados. Cada función crea los
 * registros y devuelve los ids para que el endpoint pueda enlazar el run.
 *
 * Cada seed acepta un plan opcional generado a partir de un brief
 * (lib/seed-brief.ts). Sin plan, usa los ejemplos estáticos de muestra.
 */

// ============================================================
// Claridad 5s (target individual con og:image resuelto en runtime)
// ============================================================

const FIVE_SECOND_DEFAULTS = {
  name: "Linear · purpose built for product development",
  url: "https://linear.app/",
  main_promise:
    "Linear es la herramienta para equipos de producto: issues, proyectos y roadmaps a velocidad récord.",
};

export async function seedFiveSecondExample(
  plan?: ClarityPlan,
): Promise<{ targetId: string }> {
  const spec = plan ?? FIVE_SECOND_DEFAULTS;
  const img = await resolveOgImage(spec.url);
  if (!img) {
    throw new Error(`No se pudo resolver og:image para ${spec.url}.`);
  }
  const target = await createTarget({
    name: spec.name,
    payload: {
      kind: "5s_test",
      main_promise: spec.main_promise,
      image_url: img,
      source_url: spec.url,
    },
  });
  return { targetId: target.id };
}

// ============================================================
// Copy (no requiere URLs)
// ============================================================

export async function seedCopyExample(
  plan?: CopyPlan,
): Promise<{ deckId: string }> {
  if (plan) {
    const deck = await createCopyDeck({
      name: plan.name,
      description: plan.description,
      context: plan.context,
      blocks: plan.blocks,
    });
    return { deckId: deck.id };
  }
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

export async function seedPricingExample(
  plan?: PricingPlan,
): Promise<{ offerId: string }> {
  if (plan) {
    const offer = await createPricingOffer({
      name: plan.name,
      description: plan.description,
      currency: plan.currency,
      anchor_price: plan.anchor_price ?? null,
      prices: plan.prices,
    });
    return { offerId: offer.id };
  }
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
  name: "Landing plataformas dev · Vercel vs Netlify",
  hypothesis:
    "Vercel ancla la propuesta en velocidad y la integración con Next.js. Netlify se posiciona como plataforma horizontal con foco en team collaboration.",
  a: {
    name: "Vercel · platform for web devs",
    url: "https://vercel.com/",
    promise: "Despliega proyectos modernos a la frontera de la red con previews por commit.",
  },
  b: {
    name: "Netlify · build, deploy and scale",
    url: "https://www.netlify.com/",
    promise: "Plataforma para construir, desplegar y escalar webs modernas con un único workflow.",
  },
};

export async function seedAbExample(plan?: AbPlan): Promise<{
  abTestId: string;
  aTargetId: string;
  bTargetId: string;
}> {
  const spec = plan ?? AB_DEFAULTS;
  const [aImg, bImg] = await Promise.all([
    resolveOgImage(spec.a.url),
    resolveOgImage(spec.b.url),
  ]);
  if (!aImg) {
    throw new Error(`No se pudo resolver og:image para ${spec.a.url}.`);
  }
  if (!bImg) {
    throw new Error(`No se pudo resolver og:image para ${spec.b.url}.`);
  }

  const a = await createTarget({
    name: spec.a.name,
    payload: {
      kind: "5s_test",
      main_promise: spec.a.promise,
      image_url: aImg,
      source_url: spec.a.url,
    },
  });
  const b = await createTarget({
    name: spec.b.name,
    payload: {
      kind: "5s_test",
      main_promise: spec.b.promise,
      image_url: bImg,
      source_url: spec.b.url,
    },
  });

  const ab = await createAbTest({
    name: spec.name,
    hypothesis: spec.hypothesis,
    target_a_id: a.id,
    target_b_id: b.id,
  });

  return { abTestId: ab.id, aTargetId: a.id, bTargetId: b.id };
}

// ============================================================
// Funnel (4 pasos Stripe)
// ============================================================

const FUNNEL_DEFAULTS = {
  name: "Onboarding Stripe · descubrir, evaluar, decidir",
  description:
    "Recorrido típico de un nuevo visitante a Stripe: aterriza, profundiza en producto, valida con casos reales y decide entrar por la página de precios.",
  steps: [
    {
      name: "Home",
      intent: "Entender qué hace Stripe y para quién es.",
      url: "https://stripe.com/es-es",
    },
    {
      name: "Producto · Pagos",
      intent: "Evaluar la capacidad concreta de la plataforma de pagos.",
      url: "https://stripe.com/es-es/payments",
    },
    {
      name: "Casos de éxito",
      intent: "Validar con prueba social que merece la pena confiar en Stripe.",
      url: "https://stripe.com/es-es/customers",
    },
    {
      name: "Precios",
      intent: "Decidir si los precios encajan y dar el siguiente paso.",
      url: "https://stripe.com/es-es/pricing",
    },
  ],
};

export async function seedFunnelExample(
  plan?: FunnelPlan,
): Promise<{ funnelId: string }> {
  const spec = plan ?? FUNNEL_DEFAULTS;
  const resolved = await Promise.all(
    spec.steps.map(async (s) => {
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
    name: spec.name,
    description: spec.description,
    steps: resolved,
  });

  return { funnelId: funnel.id };
}

// ============================================================
// Campaign Tester (RSA con landing real)
// ============================================================

const CAMPAIGN_DEFAULTS = {
  name: "Vercel · Paid Search agosto",
  brief:
    "Diferencial vs Netlify: Next.js 16 nativo, edge global, previews por commit. Evitamos jerga interna (Fluid Compute, ISR) en titulares.",
  final_url: "https://vercel.com/",
  queries: [
    "hosting next.js",
    "deploy aplicación react",
    "alternativa netlify",
  ],
  headlines: [
    "Despliega Next.js en 30s",
    "Vista previa por commit",
    "Edge global, sin config",
    "Free tier sin caducidad",
    "Mejor que Netlify en Next",
  ],
  descriptions: [
    "Conecta tu repo y deploya en segundos. Previews por PR, rollback con un clic.",
    "Plataforma full-stack para Next.js: edge functions, AI Gateway y analytics nativos.",
  ],
};

export async function seedCampaignExample(
  plan?: CampaignPlan,
): Promise<{ campaignId: string }> {
  const spec = plan ?? CAMPAIGN_DEFAULTS;
  const img = await resolveOgImage(spec.final_url);
  if (!img) {
    throw new Error(`No se pudo resolver og:image para ${spec.final_url}.`);
  }
  // Search exige nombre de empresa y logo 1:1 desde v0.45.1 (bloque
  // Business information de la spec 17092074): se derivan del dominio.
  const host = new URL(spec.final_url).hostname.replace(/^www\./, "");
  const companyName = (
    host.split(".")[0].charAt(0).toUpperCase() + host.split(".")[0].slice(1)
  ).slice(0, 25);
  const campaign = await createCampaign({
    name: spec.name,
    channels: ["google"],
    strategy: "search",
    brief: spec.brief,
    final_url: spec.final_url,
    landing_image_url: img,
    landing_source_url: spec.final_url,
    queries: spec.queries,
    headlines: spec.headlines,
    descriptions: spec.descriptions,
    company_name: companyName,
    creatives: [
      {
        kind: "image",
        role: "logo_square",
        url: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
        label: "Logo (favicon del dominio)",
      },
    ],
  });
  return { campaignId: campaign.id };
}

// ============================================================
// GEO (análisis de visibilidad en buscadores IA; no requiere URLs)
// ============================================================

const GEO_DEFAULTS: GeoPlan = {
  name: "Visibilidad IA · Flat 101",
  brand_name: "Flat 101",
  brand_description:
    "Consultora española de negocio digital especializada en CRO, analítica y experimentación. Más de 200 marcas optimizan sus ratios de conversión con su framework de tests medibles.",
  segments: [
    {
      label: "E-commerce estancado",
      jtbd: "Cuando mi tienda online lleva meses sin crecer, quiero saber qué está frenando la conversión para poder vender más sin gastar más en captación.",
      query: "mejor agencia CRO España ecommerce",
    },
    {
      label: "Director de marketing con presupuesto a defender",
      jtbd: "Cuando tengo que justificar la inversión digital ante dirección, quiero un partner que mida el impacto de cada cambio para poder demostrar retorno.",
      query: "consultora optimización conversión con casos de éxito",
    },
    {
      label: "Startup en crecimiento",
      jtbd: "Cuando mi producto ya tiene tracción pero el funnel hace aguas, quiero expertos en experimentación para poder escalar sin romper la economía unitaria.",
      query: "agencia experimentación A/B testing startups",
    },
  ],
};

export async function seedGeoExample(
  plan?: GeoPlan,
): Promise<{ geoId: string }> {
  const spec = plan ?? GEO_DEFAULTS;
  const analysis = await createGeoAnalysis({
    name: spec.name,
    brand_name: spec.brand_name,
    brand_description: spec.brand_description,
    segments: spec.segments,
  });
  return { geoId: analysis.id };
}

// ============================================================
// Momentum (Trigger de activación; necesita perfiles asignados)
// ============================================================

const MOMENTUM_DEFAULTS: MomentumPlan = {
  name: "Revisión dental pospuesta",
  trigger_scenario:
    "Llevas semanas notando sensibilidad en una muela al tomar café. Esta mañana, al morder una tostada, el pinchazo ha sido tan fuerte que has soltado el desayuno. No tienes dentista de confianza en tu ciudad actual.",
  brand_context:
    "Cadena de clínicas dentales con primera visita y diagnóstico gratuitos, financiación a 12 meses sin intereses y cita online en menos de 48 horas.",
};

export async function seedMomentumExample(
  plan: MomentumPlan | undefined,
  profileIds: string[],
): Promise<{ momentumId: string }> {
  const spec = plan ?? MOMENTUM_DEFAULTS;
  const ids =
    profileIds.length > 0 ? profileIds : await pickRandomProfileIds(3);
  if (ids.length === 0) {
    throw new Error(
      "No hay perfiles en la base: siembra perfiles antes de crear el Trigger de ejemplo.",
    );
  }
  const challenge = await createMomentumChallenge({
    name: spec.name,
    trigger_scenario: spec.trigger_scenario,
    brand_context: spec.brand_context,
    profile_ids: ids,
  });
  return { momentumId: challenge.id };
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

/**
 * Perfiles priorizados por rango de edad (la audiencia natural del test),
 * completando con aleatorios si no hay suficientes en el rango.
 */
export async function pickProfileIdsByAgeRange(
  minAge: number,
  maxAge: number,
  n: number,
): Promise<string[]> {
  const profiles = await listProfiles();
  if (profiles.length === 0) return [];
  const inRange = profiles
    .filter(
      (p) =>
        typeof p.demographics?.age === "number" &&
        p.demographics.age >= minAge &&
        p.demographics.age <= maxAge,
    )
    .sort(() => Math.random() - 0.5);
  const rest = profiles
    .filter((p) => !inRange.includes(p))
    .sort(() => Math.random() - 0.5);
  return [...inRange, ...rest].slice(0, Math.min(n, profiles.length)).map((p) => p.id);
}

// ============================================================
// Campañas IVI: un ejemplo por estrategia implementada
// ============================================================

/**
 * Crea 6 campañas de ejemplo (una por estrategia implementada) sobre la
 * marca real IVI (ivi.es, clínicas de reproducción asistida). El copy es
 * fiel a sus claims públicos (tasas hasta un 23% superiores a la media,
 * 35 clínicas, financiación TIN 0%, Plan IVI Baby con garantía) y las
 * imágenes son URLs reales de su web más su favicon como logo.
 */
export async function seedCampaignStrategiesExample(): Promise<{
  campaigns: { strategy: Strategy; campaignId: string }[];
}> {
  const FINAL_URL = "https://ivi.es/";
  const IMG_OG = "https://ivi.es/wp-content/uploads/2018/09/ivi.jpg";
  const IMG_BANNER_1 = "https://ivi.es/wp-content/uploads/2025/11/340x192_01.jpg";
  const IMG_BANNER_2 = "https://ivi.es/wp-content/uploads/2025/11/340x192_02.jpg";
  const LOGO = "https://www.google.com/s2/favicons?domain=ivi.es&sz=128";
  const YT_ID = "9EyqYhxfz2Q"; // Anuncio IVI «La noticia de mi vida»

  const landing = (await resolveOgImage(FINAL_URL)) ?? IMG_OG;

  const shared = {
    channels: ["google"] as ["google"],
    brief:
      "IVI: clínicas líderes de reproducción asistida en España desde 1990. 35 clínicas, tasas de éxito hasta un 23% superiores a la media, financiación hasta 24 meses sin intereses (TIN 0%) y Plan IVI Baby con garantía de devolución.",
    intended_message:
      "IVI te ayuda a ser madre con tasas de éxito superiores a la media y garantía de devolución",
    final_url: FINAL_URL,
    landing_image_url: landing,
    landing_source_url: FINAL_URL,
  };

  const logoCreative = {
    kind: "image" as const,
    role: "logo_square" as const,
    url: LOGO,
    label: "Logo IVI (favicon)",
  };

  const headlines30 = [
    "Clínicas de Fertilidad IVI",
    "FIV con garantía de éxito",
    "Tasas 23% sobre la media",
    "1ª visita sin compromiso",
    "Financiación TIN 0%",
    "35 clínicas en España",
  ];
  const descriptions90 = [
    "Reproducción asistida desde 1990. Tasas de éxito hasta un 23% superiores a la media.",
    "Financia tu tratamiento hasta 24 meses sin intereses. Pide tu primera cita hoy.",
    "Plan IVI Baby: serás mamá o te devolvemos el dinero. 35 clínicas en toda España.",
  ];
  const longHeadline =
    "Serás mamá, o te devolvemos el dinero: así es el Plan IVI Baby";

  const campaigns: { strategy: Strategy; campaignId: string }[] = [];

  // Search (RSA): queries de intención de compra + empresa y logo.
  const search = await createCampaign({
    ...shared,
    name: "IVI · Search · FIV y fertilidad",
    strategy: "search",
    queries: ["clinica de fertilidad", "fecundacion in vitro precio", "ovodonacion españa"],
    headlines: headlines30,
    descriptions: descriptions90,
    company_name: "IVI",
    creatives: [logoCreative],
  });
  campaigns.push({ strategy: "search", campaignId: search.id });

  // Display (RDA): banner con titular largo, en webs afines.
  const display = await createCampaign({
    ...shared,
    name: "IVI · Display · Plan IVI Baby",
    strategy: "display",
    queries: ["maternidad", "fertilidad a los 35"],
    headlines: headlines30.slice(0, 3),
    descriptions: descriptions90.slice(0, 2),
    company_name: "IVI",
    long_headline: longHeadline,
    cta: "Más información",
    creatives: [
      { kind: "image", role: "landscape_image", url: IMG_BANNER_1, label: "Banner 1" },
      { kind: "image", role: "square_image", url: IMG_OG, label: "Imagen marca" },
      logoCreative,
    ],
  });
  campaigns.push({ strategy: "display", campaignId: display.id });

  // Performance Max: grupo de recursos completo (incluye titular corto ≤15c).
  const pmax = await createCampaign({
    ...shared,
    name: "IVI · PMax · Captación integral",
    strategy: "pmax",
    queries: ["fertilidad", "embarazo a los 40", "ovodonacion"],
    headlines: ["Sé mamá con IVI", ...headlines30],
    descriptions: descriptions90,
    company_name: "IVI",
    long_headline: longHeadline,
    cta: "Contactar",
    creatives: [
      { kind: "image", role: "landscape_image", url: IMG_BANNER_2, label: "Banner 2" },
      { kind: "image", role: "square_image", url: IMG_OG, label: "Imagen marca" },
      logoCreative,
      {
        kind: "youtube",
        role: "video_youtube",
        url: `https://www.youtube.com/watch?v=${YT_ID}`,
        youtube_id: YT_ID,
        thumbnail_url: `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`,
        label: "Spot «La noticia de mi vida»",
      },
    ],
  });
  campaigns.push({ strategy: "pmax", campaignId: pmax.id });

  // Demand Gen: tarjeta de feed (titulares de hasta 40c, uno de ≤30c).
  const demandGen = await createCampaign({
    ...shared,
    name: "IVI · Demand Gen · Discover",
    strategy: "demand_gen",
    queries: ["maternidad", "tratamientos de fertilidad"],
    headlines: [
      "9 de cada 10 pacientes IVI lo consiguen",
      "Tu camino a la maternidad empieza aquí",
      "Fertilidad con garantías",
    ],
    descriptions: descriptions90.slice(0, 2),
    company_name: "IVI",
    cta: "Más información",
    creatives: [
      { kind: "image", role: "landscape_image", url: IMG_BANNER_1, label: "Banner 1" },
      { kind: "image", role: "square_image", url: IMG_OG, label: "Imagen marca" },
      logoCreative,
    ],
  });
  campaigns.push({ strategy: "demand_gen", campaignId: demandGen.id });

  // Video: pre-roll con el spot real de IVI.
  const video = await createCampaign({
    ...shared,
    name: "IVI · Video · La noticia de mi vida",
    strategy: "video",
    queries: ["quiero ser madre", "fiv experiencias"],
    headlines: ["Tu historia empieza en IVI"],
    descriptions: ["Miles de familias lo han logrado con IVI. Primera visita sin compromiso."],
    long_headline:
      "El primer paso hacia la noticia de tu vida: primera visita sin compromiso",
    cta: "Pide cita",
    creatives: [
      {
        kind: "youtube",
        role: "video_youtube",
        url: `https://www.youtube.com/watch?v=${YT_ID}`,
        youtube_id: YT_ID,
        thumbnail_url: `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`,
        label: "Spot «La noticia de mi vida»",
      },
    ],
  });
  campaigns.push({ strategy: "video", campaignId: video.id });

  // Shopping: el estudio de fertilidad como producto de ficha.
  const shopping = await createCampaign({
    ...shared,
    name: "IVI · Shopping · Estudio de fertilidad",
    strategy: "shopping",
    queries: ["estudio fertilidad precio", "test fertilidad mujer"],
    headlines: [],
    descriptions: [],
    product: {
      id: "IVI-EST-FERT-01",
      title:
        "Estudio de fertilidad completo IVI: analítica hormonal, ecografía y consulta médica",
      description:
        "Estudio de fertilidad completo en cualquiera de las 35 clínicas IVI de España: analítica hormonal (AMH), ecografía ginecológica y consulta con un especialista en reproducción asistida para valorar tu caso y orientarte sobre el tratamiento más adecuado.",
      price: "190.00 EUR",
      availability: "in_stock",
      brand: "IVI",
      gtin: null,
      mpn: "EST-FERT-01",
      condition: null,
    },
    creatives: [
      { kind: "image", role: "generic", url: IMG_BANNER_2, label: "Imagen del producto" },
    ],
  });
  campaigns.push({ strategy: "shopping", campaignId: shopping.id });

  return { campaigns };
}
