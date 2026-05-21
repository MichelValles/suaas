/**
 * Glosario COM-B (Michie, van Stralen & West, 2011).
 * Modelo que descompone qué frena o permite una conducta en 3 ejes:
 * Capability + Opportunity + Motivation -> Behavior.
 *
 * Lo usan el formulario de creación de perfil y la vista de detalle como
 * tooltips junto a cada eje. Textos cortos, orientados a UX.
 */
export const COM_B_BARRIERS = {
  capability: {
    label: "Capacidad",
    description:
      "Lo que tiene o le falta a la persona para actuar: conocimiento, habilidades, salud física y mental. Ej.: 'no entiende el vocabulario financiero', 'no llega a la pantalla con el pulgar'.",
  },
  opportunity: {
    label: "Oportunidad",
    description:
      "Lo que su entorno le permite o le impone: recursos, dispositivos, normas sociales, presión del momento. Ej.: 'sólo dispone del móvil', 'tiene a los niños alrededor'.",
  },
  motivation: {
    label: "Motivación",
    description:
      "Lo que mueve o frena por dentro: hábitos automáticos, emociones, objetivos, creencias. Ej.: 'desconfía de neobancos por una mala experiencia', 'odia los formularios largos'.",
  },
} as const;

export const COM_B_INTRO =
  "El modelo COM-B (Michie et al., 2011) descompone qué frena o permite una conducta en tres ejes: Capacidad, Oportunidad y Motivación. Una barrera por línea. Vacío = sin barreras en esa categoría.";

export type ComBBarrierKey = keyof typeof COM_B_BARRIERS;
