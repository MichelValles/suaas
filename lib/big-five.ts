/**
 * Glosario de los cinco rasgos OCEAN.
 * Lo usa el formulario de creación de perfil y la vista de detalle para
 * mostrar tooltips de cada rasgo. Mantener las descripciones cortas (1-2
 * frases) y orientadas a alto/bajo.
 */
export const BIG_FIVE_TRAITS = {
  openness: {
    label: "Apertura",
    description:
      "Curiosidad por lo nuevo, ideas abstractas, arte. Alto: explora y prueba antes que nadie. Bajo: prefiere lo conocido y la rutina.",
  },
  conscientiousness: {
    label: "Conciencia",
    description:
      "Organización, disciplina, planificación. Alto: metódico, cumple plazos. Bajo: improvisa y deja cosas para después.",
  },
  extraversion: {
    label: "Extraversión",
    description:
      "Energía social y búsqueda de estímulo. Alto: hablador y dinámico. Bajo: prefiere reflexionar a solas y se cansa de la gente.",
  },
  agreeableness: {
    label: "Amabilidad",
    description:
      "Cooperación, empatía, confianza en los demás. Alto: conciliador y servicial. Bajo: competitivo y escéptico.",
  },
  neuroticism: {
    label: "Neuroticismo",
    description:
      "Inestabilidad emocional. Alto: ansioso y reactivo al estrés. Bajo: tranquilo y resiliente ante imprevistos.",
  },
} as const;

export const BIG_FIVE_INTRO =
  "El modelo Big Five (OCEAN) describe la personalidad en cinco rasgos continuos de 0 a 1: Apertura, Conciencia, Extraversión, Amabilidad y Neuroticismo. Cada perfil mezcla un nivel propio en cada eje, y esos niveles condicionan cómo razona y reacciona a lo que le pongas delante.";

export type BigFiveTraitKey = keyof typeof BIG_FIVE_TRAITS;
