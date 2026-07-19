import { generateObject } from "ai";
import { z } from "zod";
import { REASONER_MODEL } from "@/lib/gateway";
import { chunks } from "@/lib/experiments/shared";
import { createProfile, ProfileInputSchema, type ProfileInput } from "@/lib/profiles";
import { recordUsage } from "@/lib/usage";

/**
 * Generación de perfiles vignettes con el Reasoner.
 *
 * Cada perfil se genera a partir de un "seed brief" curado para que el
 * conjunto cubra variedad de demografías, segmentos, ocupaciones y
 * contextos vitales españoles. El prompt fuerza al modelo a producir un
 * `ProfileInput` válido (zod schema) con backstory en primera persona
 * sutilmente narrativa.
 */

const SeedOutputSchema = z.object({
  name: z.string().min(1).describe("Nombre + apellido o nombre + edad. Ej: «Lucía 34» o «Marc Vidal»."),
  demographics: z.object({
    age: z.number().int().min(18).max(85),
    gender: z.enum(["hombre", "mujer", "otro"]),
    occupation: z
      .string()
      .min(2)
      .describe("Ocupación concreta y coloquial, sin tecnicismos HR. Ej: «cajera en supermercado», «autónomo del transporte»."),
    income_band: z.string().min(2),
    geo: z.string().min(2),
  }),
  big_five: z.object({
    openness: z.number().min(0).max(1),
    conscientiousness: z.number().min(0).max(1),
    extraversion: z.number().min(0).max(1),
    agreeableness: z.number().min(0).max(1),
    neuroticism: z.number().min(0).max(1),
  }),
  com_b_barriers: z.object({
    capability: z.array(z.string()).min(1).max(4),
    opportunity: z.array(z.string()).min(1).max(4),
    motivation: z.array(z.string()).min(1).max(4),
  }),
  backstory: z
    .string()
    .min(80)
    .describe(
      "120-220 caracteres en tercera persona. Ancla la persona en una rutina concreta + un dolor + una motivación. Sin meta-comentarios.",
    ),
});

// 50 seeds curados que cubren un mapa amplio del público español.
export const PROFILE_SEEDS: string[] = [
  "Estudiante de ingeniería 21, Granada, vive con sus padres, primer reto laboral, gamer pero responsable.",
  "Ingeniera junior 24, Madrid, primer trabajo en consultora, ansiedad social, alquila con dos amigos.",
  "Diseñadora freelance 32, Barcelona, ingresos irregulares, escéptica del marketing, busca clientes éticos.",
  "Comercial 47, Sevilla, divorciado, cuida a su madre mayor, cansado, valora el tiempo.",
  "Profesor interino 36, Vigo, hipoteca recién firmada, mediación cultural, lee mucho.",
  "Estudiante de doctorado 28, Barcelona, conciencia ecológica, vegana, redes sociales como activismo.",
  "Camarero 22, Murcia, sueldo bajo, sueña con montar un food truck, sigue tutoriales en TikTok.",
  "Enfermera 41, Bilbao, dos hijos pequeños, turnos rotativos, valora la rapidez por encima de todo.",
  "Director de marketing 39, Madrid, sueldo alto, viaja por trabajo, decide rápido, poca paciencia.",
  "Jubilado 68, Valencia, ex maestro, descubrió el iPad este año, desconfía de los pop-ups.",
  "Autónoma cuidados 52, Toledo, segunda activa familiar, baja alfabetización digital, llamadas mejor que mensajes.",
  "Estudiante ESO 17 (ya 18 cumplidos), Asturias, deportista federado, decide por imagen de marca.",
  "Tester de software 30, Málaga, TDAH leve, va al gimnasio, valora claridad por encima de copy.",
  "Periodista freelance 44, Madrid, ingresos volátiles, cinismo profesional, lee headlines con doble lectura.",
  "Pareja sin hijos 33+34, A Coruña, fan de minimalismo, ahorradores, planean comprar piso fuera de la ciudad.",
  "Repartidor 27, Sevilla, sin contrato fijo, móvil low-end, datos limitados, decisiones por precio.",
  "Mom blogger 38, Valencia, dos hijos, gestiona la economía familiar, lee reseñas antes de comprar.",
  "Médico residente 29, Salamanca, agotado, depende del móvil para todo, busca eficiencia.",
  "Trabajadora social 45, Zaragoza, hijos mayores, escéptica institucional, valora honestidad por encima de promesas.",
  "Carpintero autónomo 51, Cuenca, trabajo manual, herramientas concretas, desconfía de promesas comerciales.",
  "Emprendedor tech 35, Barcelona, ex-empleado de big tech, lee newsletters, decide rápido si la propuesta es clara.",
  "Estudiante Erasmus 22, Salamanca-Italia, presupuesto justo, busca planes baratos, vive intensamente.",
  "Ama de casa 49, Murcia, gestiona hogar de 5, segunda usuaria de tecnología, sus hijos le configuran las apps.",
  "Funcionario administración 55, Madrid, estabilidad económica, ritmo lento, desconfía del cambio.",
  "Doctorando ciencias 31, Valencia, salario residente, vive con pareja precaria, lee mucho inglés.",
  "Cocinero de hotel 38, Cádiz, trabajo nocturno, agotado en su día libre, busca soluciones rápidas.",
  "Recién graduada en derecho 24, Pamplona, busca despacho, ansiedad por la primera entrevista.",
  "Padre soltero 42, Bilbao, hijo de 10, organiza vida en torno al cole, valora apps prácticas.",
  "Influencer mediana 29, Barcelona, 40k seguidores Instagram, vive de campañas, cliente exigente.",
  "Repostero artesano 36, Toledo, montó tienda con su pareja, miedo a perder clientes, escucha mucho a usuarios.",
  "Estudiante de filosofía 23, Madrid, beca, cuestiona todo, escribe en revistas digitales.",
  "Veterinaria rural 47, Lleida, vive en pueblo de 800 habitantes, mala cobertura, valora simplicidad.",
  "Asesor financiero 50, Madrid, conservador, conoce a su cliente, no se deja influir por hype.",
  "Adolescente 18 recién cumplidos, Sevilla, primer móvil pagado por él, decide por estética y comunidad.",
  "Inmigrante latina 33, Madrid, dos años en España, manda dinero a casa, valora trámites simples.",
  "Empresaria pyme textil 56, Murcia, herencia familiar, contabilidad manual, miedo a la digitalización forzada.",
  "DevOps senior 41, Bilbao, teletrabaja, ingresos altos, valora deep work, evita apps invasivas.",
  "Camarera 26, Sevilla, propina como ingreso clave, móvil con pantalla rota, decisiones por urgencia.",
  "Madre soltera 34, Valencia, hija de 4, trabajo temporal, presupuesto justo, decide por seguridad emocional.",
  "Investigadora postdoc 35, Salamanca, contrato precario, escribe papers, lee científicamente las landings.",
  "Operador de máquina 48, Bilbao, sindicalista, desconfía del marketing corporativo, decide en consenso familiar.",
  "Adolescente con esquí 19, Sierra Nevada, hija de hostelería, vive seis meses al año fuera, decide por amigos.",
  "Pequeño productor de vino 45, La Rioja, marca personal, viaja a ferias, valora autenticidad.",
  "Diseñador gráfico junior 26, Vigo, primer alquiler propio, sueldo medio-bajo, decide por estética y precio.",
  "Asistente sanitario 40, Tenerife, turnos largos, dos hijos adolescentes, decide rápido tras agotamiento.",
  "Programador autodidacta 23, Tarragona, sin estudios oficiales, comunidad online, valora documentación clara.",
  "Profesora yoga 39, Granada, retiro espiritual, decide por valores, ignora copy agresivo.",
  "Albañil 50, Murcia, jornadas de 10 horas, móvil sólo para llamadas y WhatsApp, decide en familia.",
  "Estudiante diseño 21, Madrid, vive de prácticas no remuneradas, busca portfolio, decide por estética.",
  "Conductor de taxi 53, Sevilla, conoce la ciudad mejor que las apps, escéptico de big tech, prudente.",
];

export type GeneratedProfile = {
  seed: string;
  input: ProfileInput;
  latencyMs: number;
};

export type ProfileSeedEvent =
  | { type: "started"; total: number }
  | { type: "progress"; index: number; total: number; name: string; seed: string }
  | { type: "error"; index: number; total: number; seed: string; message: string }
  | { type: "done"; created: number; failed: number };

async function generateOneProfile(seed: string): Promise<GeneratedProfile> {
  const startedAt = Date.now();
  const result = await generateObject({
    model: REASONER_MODEL,
    schema: SeedOutputSchema,
    system: [
      "Eres un sociólogo digital del INE con experiencia en investigación cualitativa.",
      "Tu trabajo es fabricar UN perfil calibrado de un usuario español, realista.",
      "Devuelve EXACTAMENTE el objeto pedido por el schema. Sin comentarios meta.",
      "",
      "## Reglas de fidelidad",
      "- 'name': nombre + edad o nombre+apellido típico de España. Coherente con género y geografía.",
      "- 'age': respeta el rango sugerido del brief (±5 años).",
      "- 'gender': hombre | mujer | otro (literal). Si el brief dice 'autónoma' es mujer, etc.",
      "- 'occupation': coloquial, en castellano de la calle, no jerga LinkedIn.",
      "- 'income_band': cadena tipo '<15k', '15-25k', '25-35k', '35-50k', '50-80k', '>80k'.",
      "- 'geo': ciudad + ', ES'. Respeta el brief.",
      "- 'big_five' en escala 0..1 (no 0..100). Coherentes con la persona: no inventes una persona introvertida con extraversion 0.9.",
      "- 'com_b_barriers': 1-3 ítems por categoría, FRASES CORTAS y específicas. NO genéricas.",
      "  · capability: lo que NO sabe hacer / dónde le cuesta cognitivamente.",
      "  · opportunity: barreras de contexto / acceso / soporte social.",
      "  · motivation: miedos, escepticismos, prioridades emocionales.",
      "- 'backstory': 120-220 caracteres. Tercera persona. Una rutina concreta + un dolor + una motivación. Sin clichés, sin '...sueña con cambiar el mundo'.",
    ].join("\n"),
    prompt: `Brief del perfil:\n${seed}\n\nGenera el ProfileInput correspondiente respetando el brief.`,
  });
  const usage = result.usage ?? null;
  await recordUsage({
    scope: "seed_profile",
    model: REASONER_MODEL,
    usage,
    meta: { kind: "seed_profile", seed },
  }).catch(() => {});

  const input = ProfileInputSchema.parse({
    ...result.object,
    source: "llm_seed",
  });
  return { seed, input, latencyMs: Date.now() - startedAt };
}

/**
 * Orquestador en streaming: genera N perfiles en chunks de 4 y emite
 * eventos NDJSON conforme van llegando. La inserción en Supabase ocurre
 * inmediatamente, así si algo falla a mitad de camino se conservan los
 * perfiles ya creados.
 */
export async function* streamSeededProfiles(n: number): AsyncGenerator<ProfileSeedEvent> {
  const total = Math.min(Math.max(n, 1), PROFILE_SEEDS.length);
  const seeds = PROFILE_SEEDS.slice(0, total);
  yield { type: "started", total };

  let created = 0;
  let failed = 0;
  let index = 0;

  for (const chunk of chunks(seeds, 4)) {
    const results = await Promise.allSettled(chunk.map((s) => generateOneProfile(s)));
    for (let j = 0; j < results.length; j++) {
      const seed = chunk[j];
      const r = results[j];
      index += 1;
      if (r.status === "fulfilled") {
        try {
          await createProfile(r.value.input);
          created += 1;
          yield {
            type: "progress",
            index,
            total,
            name: r.value.input.name,
            seed,
          };
        } catch (err) {
          failed += 1;
          yield {
            type: "error",
            index,
            total,
            seed,
            message: (err as Error).message,
          };
        }
      } else {
        failed += 1;
        yield {
          type: "error",
          index,
          total,
          seed,
          message: (r.reason as Error)?.message ?? "Generation failed",
        };
      }
    }
  }
  yield { type: "done", created, failed };
}
