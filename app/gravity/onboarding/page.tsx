import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { OnboardingNav, type OnbSection } from "./onboarding-nav";

export const metadata = {
  title: "Onboarding del sociólogo · Gravity",
};

const SECTIONS: OnbSection[] = [
  { id: "intro", num: "00", title: "Cómo usar este guión" },
  { id: "que-es", num: "01", title: "Qué es Gravity y su estatuto" },
  { id: "perfil", num: "02", title: "El perfil calibrado" },
  { id: "modulos", num: "03", title: "Los módulos y sus salidas" },
  { id: "voz", num: "04", title: "Cómo se genera la voz" },
  { id: "juez", num: "05", title: "El juez de calidad" },
  { id: "validacion", num: "06", title: "Validación humana (núcleo)" },
  { id: "infra", num: "07", title: "Infraestructura y datos" },
  { id: "itinerario", num: "08", title: "Itinerario por fases" },
  { id: "limites", num: "09", title: "Límites y honestidad" },
  { id: "glosario", num: "10", title: "Glosario y documentos" },
];

export default function OnboardingPage() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="SISTEMA · Onboarding"
        title="Onboarding del sociólogo experto"
        description="Guión completo para conocer, asimilar y juzgar Gravity. Qué hay, qué hace y cómo lo hace, con el protocolo de validación humana de las salidas en el centro (sección 06). Referencia la documentación viva del proyecto."
        descriptionVariant="panel"
        actions={
          <Link href="/gravity" className="btn-pill">
            Volver a Gravity Model
          </Link>
        }
      />

      <div className="onboarding-shell">
        <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
          {/* 00 */}
          <Section id="intro" num="00" title="Cómo usar este guión">
            <Lead>
              Gravity es una plataforma de <Hl>validación temprana</Hl>:
              anticipa la eficacia de un mensaje, una campaña o una decisión
              antes de comprometer tráfico real, para saber qué funciona antes
              de invertir en ello. Lo consigue con perfiles calibrados
              (registros estructurados de usuario) que condicionan a un modelo
              de lenguaje para que responda «en la voz» de ese usuario ante un
              estímulo (una landing, un anuncio, un precio, un buscador). Tu
              trabajo no es usar la herramienta: es auditar si lo que produce es
              creíble, fiel y, en la medida de lo posible, predictivo, y montar
              el protocolo para que esa validación sea sistemática y repetible.
            </Lead>
            <SubLabel>Orden de lectura recomendado</SubLabel>
            <ol style={olStyle}>
              <Li>
                <Doc>PROYECTO.md</Doc>: qué es, stack, modelo de datos.
              </Li>
              <Li>
                <Doc>ARQUITECTURA-CONCEPTUAL.md</Doc>: la síntesis en cuatro
                preguntas. Puerta de entrada de alto nivel.
              </Li>
              <Li>
                <Doc>PERFILES-CALIBRADOS.md</Doc>: el motor al detalle, escrito
                para una audiencia experta. Tu documento de cabecera.
              </Li>
              <Li>
                <Doc>CONOCIMIENTO-USUARIOS-SINTETICOS.md</Doc>: base teórica y
                empírica con las fuentes verificadas.
              </Li>
              <Li>
                <Doc>GRAVITY-MODEL.md</Doc> y <Doc>GRAVITY-MODEL-IVI.md</Doc>: el
                marco estratégico y su caso real.
              </Li>
              <Li>Este guión, de la sección 06 en adelante: qué validar y cómo.</Li>
            </ol>
            <Note>
              Cuando aquí se cita «§8.1» se refiere a una sección de{" "}
              <Doc>PERFILES-CALIBRADOS.md</Doc> salvo que se diga otra cosa.
            </Note>
          </Section>

          {/* 01 */}
          <Section
            id="que-es"
            num="01"
            title="Qué es Gravity y su estatuto epistemológico"
          >
            <Body>
              La tesis de producto es «la decisión se toma antes del clic». El
              sistema intenta anticipar cómo reacciona un tipo de usuario a un
              mensaje antes de gastar en tráfico real, simulando su reacción con
              un perfil calibrado.
            </Body>
            <Callout variant="key" title="Interioriza esto primero">
              Todo es <Hl>medición declarativa simulada</Hl>. No hay un modelo
              computacional de conducta detrás: hay un LLM (familia Claude por
              defecto) al que se le da un registro estructurado del usuario y se
              le pide que responda como esa persona. Las «métricas» (intención
              de clic, comprensión, intensidad) son autoinformes de un modelo de
              lenguaje condicionado, no observaciones de conducta.
            </Callout>
            <Body>
              La pregunta de validación no es «¿es verdad?», sino una escalera
              de preguntas cada vez más exigentes:
            </Body>
            <div style={cardGrid(220)}>
              <StepCard n="1" title="Coherencia interna">
                ¿Es coherente con el perfil y con una persona plausible?
                (fidelidad de simulación)
              </StepCard>
              <StepCard n="2" title="Fiabilidad del proxy">
                ¿Un experto humano la juzgaría igual que el juez automático?
              </StepCard>
              <StepCard n="3" title="Indistinguibilidad">
                ¿Es indistinguible de una voz humana real? (validez aparente
                fuerte)
              </StepCard>
              <StepCard n="4" title="Correlación">
                ¿Correlaciona con conducta o con VoC real? (validez de criterio)
              </StepCard>
              <StepCard n="5" title="Predicción">
                ¿Predice un KPI real (CTR, conversión)? (validez predictiva)
              </StepCard>
            </div>
            <Note>
              Qué se puede afirmar hoy y qué no está en <Doc>§7</Doc> y{" "}
              <Doc>§9</Doc> de <Doc>PERFILES-CALIBRADOS</Doc>.
            </Note>
          </Section>

          {/* 02 */}
          <Section id="perfil" num="02" title="La unidad de análisis: el perfil">
            <Body>
              Un perfil (esquema en <Code>lib/profiles.ts</Code>, detalle en{" "}
              <Doc>§1</Doc>) tiene estas capas:
            </Body>
            <DataTable
              head={["Capa", "Qué es", "Marco académico", "Campo"]}
              rows={[
                ["Demografía", "edad, género, ocupación, renta, geo", "descriptivo", <Code key="d">demographics</Code>],
                ["Big Five (OCEAN)", "5 rasgos 0..1", "FFM; HEXACO-24 en onboard", <Code key="b">big_five</Code>],
                ["Barreras COM-B", "capacidad / oportunidad / motivación", "Michie et al.", <Code key="c">com_b_barriers</Code>],
                ["Backstory", "viñeta narrativa", "vignette methodology", <Code key="bk">backstory</Code>],
                ["JTBD", "«Cuando…, quiero…, para poder…»", "Jobs To Be Done / TPB", <Code key="i">intent_context</Code>],
                ["Momentum", "vector {intensidad, dirección, velocidad}", "teoría de campo de Lewin", "dinámico"],
              ]}
            />
            <SubLabel>Cuatro vías de creación, distinta fidelidad</SubLabel>
            <Body>
              Formulario manual, CSV, onboard determinista y seeds (<Doc>§1.2</Doc>,{" "}
              <Doc>§1.5</Doc>). El onboard usa psicometría determinista (HEXACO-24
              real, el LLM solo «viste» la narrativa); los seeds los inventa el
              LLM entero. Un plan de validación serio{" "}
              <Hl>estratifica por vía de creación</Hl>.
            </Body>
            <SubLabel>Los perfiles reales de partida</SubLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Pill>15 perfiles IVI · reproducción asistida · 12 segmentos</Pill>
              <Pill>3 perfiles SegurCaixa Adeslas Dental · 6 segmentos</Pill>
              <Pill>resto · perfiles base del formulario</Pill>
            </div>
            <Note>
              IVI y Adeslas tienen investigación de mercado detrás
              (<Doc>IVI-PUBLICO-OBJETIVO.md</Doc>,{" "}
              <Doc>ADESLAS-DENTAL-PUBLICO-OBJETIVO.md</Doc>): son los candidatos
              naturales para contrastar contra realidad.
            </Note>
          </Section>

          {/* 03 */}
          <Section id="modulos" num="03" title="Los módulos: estímulo, salida, métrica">
            <Body>
              Tu mapa de «qué output tengo que juzgar». Detalle de fidelidad por
              módulo en <Doc>§5</Doc>.
            </Body>
            <DataTable
              head={["Módulo", "Estímulo", "Salida (la voz)", "Métrica", "Tabla"]}
              rows={[
                ["Claridad 5s", "una pantalla, 5 s", "recuerdo, oferta percibida, barreras", "comprensión, claridad, conducta", <Code key="1">five_second_responses</Code>],
                ["Campañas", "anuncio + landing", "qué le ofrece, razonamiento, versión ideal", "intención de clic, credibilidad, match", <Code key="2">campaign_responses</Code>],
                ["Intent Momentum", "un Trigger", "relato, primeros pasos, canales, frenos", "vector {int, dir, vel}", <Code key="3">momentum_challenges</Code>],
                ["GEO Tester", "query a buscador IA", "(ninguna: sonda desnuda)", "presencia/posición/tono de marca", <Code key="4">geo_analyses</Code>],
                ["Copy / Pricing", "copy / oferta con precio", "reacción por pieza", "resonancia / justicia de precio", "tablas propias"],
                ["Embudos / A/B", "pasos / dos variantes", "avance por paso / por variante", "conversión / A vs B", "runs"],
                ["Chat", "conversación libre", "turnos en voz (Talker-Reasoner)", "cualitativo", <Code key="5">messages</Code>],
                ["Intent (JTBD)", "generación, no reacción", "el propio intent_context", "fidelidad del JTBD (on-demand)", <Code key="6">profiles</Code>],
              ]}
            />
            <Callout variant="info" title="Antes de juzgar cada módulo">
              Entiende qué está «cegado» (el perfil no ve el brief del
              anunciante), qué usa juez sin persona (comprensión) y qué es
              ficción del prompt: la «exposición de 5 segundos» es una
              instrucción, no un límite físico. Eso afecta a la validez
              ecológica.
            </Callout>
          </Section>

          {/* 04 */}
          <Section id="voz" num="04" title="Cómo se genera la voz (la caja negra, abierta)">
            <Body>
              Toda la voz sale de una única función,{" "}
              <Code>buildSystemPrompt</Code> (<Code>lib/prompts.ts</Code>,{" "}
              <Doc>§4.1</Doc>), que combina las capas e incluye negative prompts
              anti-complacencia («no eres servicial», «eres escéptico ante el
              marketing», «no suenes como ChatGPT»). Solo el chat añade la
              arquitectura dual <Hl>Talker-Reasoner</Hl> (<Doc>§4.2</Doc>).
            </Body>
            <SubLabel>Los controles experimentales (lo mejor del sistema)</SubLabel>
            <Body>
              Son la respuesta a la mitad de las críticas (<Doc>§4.3</Doc>,{" "}
              <Doc>§8.6</Doc>). Debes conocerlos:
            </Body>
            <ol style={olStyle}>
              <Li>
                <Hl>Cegado del brief</Hl>: el perfil reacciona al anuncio sin
                conocer la intención interna del anunciante.
              </Li>
              <Li>
                <Hl>Juez sin persona</Hl>: la comprensión la mide un juez
                neutral, no el propio perfil.
              </Li>
              <Li>
                <Hl>Rúbricas BARS y orden razón→score</Hl>: el juez razona antes
                de puntuar, para que el número salga del texto.
              </Li>
              <Li>
                <Hl>Muestreo determinista de estímulos</Hl>: mismo perfil, mismo
                estímulo, reproducible.
              </Li>
              <Li>
                <Hl>Chequeo de consistencia interna</Hl>: marca respuestas cuya
                conducta contradice su propia intención.
              </Li>
            </ol>
          </Section>

          {/* 05 */}
          <Section id="juez" num="05" title="El juez de calidad automático">
            <Body>
              Un segundo LLM puntúa la calidad de una salida como simulación
              fiel del perfil (código en <Code>lib/eval.ts</Code>, hallazgos en{" "}
              <Doc>§8.7</Doc>). Tu primera tarea será validarlo (sección 06.3).
            </Body>
            <div style={cardGrid(200)}>
              <DimCard label="role_fidelity">
                ¿Habla en primera persona como el usuario, sin sonar a IA?
              </DimCard>
              <DimCard label="grounding">
                ¿Está anclada en los atributos concretos de ESTE perfil?
              </DimCard>
              <DimCard label="non_sycophancy">
                ¿Mantiene el escepticismo, no es complaciente?
              </DimCard>
              <DimCard label="naturalness">
                ¿Suena a persona real, no a ChatGPT idealizado?
              </DimCard>
            </div>
            <SubLabel>Dónde corre</SubLabel>
            <ul style={ulStyle}>
              <Li>
                En los runs de 5s, campañas y Momentum: juzga una muestra y
                guarda la nota (panel «Calidad de la simulación»).
              </Li>
              <Li>
                En Intent (JTBD): on-demand desde la ficha del perfil.
              </Li>
              <Li>
                En <Link href="/evaluacion" style={linkStyle}>/evaluacion</Link>:
                contra un golden set de casos fijos, con historial y señal de
                regresión.
              </Li>
            </ul>
            <Callout variant="warn" title="Su límite, y es central">
              El juez es <Hl>otro LLM</Hl> de una familia distinta (OpenAI,{" "}
              <Code>gpt-5.4</Code>) para romper la circularidad de «juzgar a
              Claude con Claude» (<Doc>§8.1</Doc>). Mide la opinión de un LLM
              sobre otro. NO es validación humana ni empírica: sirve para
              comparar modelos, cazar regresiones y pre-filtrar a escala. Tu
              papel es decir si ese proxy es fiable.
            </Callout>
          </Section>

          {/* 06 */}
          <Section
            id="validacion"
            num="06"
            title="El protocolo de validación humana"
            kicker="El núcleo del encargo"
          >
            <Body>
              Un protocolo por niveles, de menos a más exigente y más caro. Cada
              nivel produce evidencia utilizable y decide si merece la pena el
              siguiente.
            </Body>

            <SubLabel>06.1 · Qué estás validando (marco de validez)</SubLabel>
            <Body>
              Separa <Hl>fidelidad de simulación</Hl> (¿coherente con el
              perfil?, barata) de <Hl>validez externa</Hl> (¿se corresponde con
              humanos reales?, cara, necesita ground truth).
            </Body>
            <DataTable
              head={["Tipo de validez", "Pregunta", "Hoy", "Nivel"]}
              rows={[
                ["Aparente (face)", "¿parece creíble a un experto?", "Sí", "06.2"],
                ["De contenido", "¿cubre rasgos/barreras?", "Sí", "06.2"],
                ["Fiabilidad del proxy", "¿el juez coincide con el experto?", "Sí", "06.3"],
                ["Aparente fuerte", "¿indistinguible de voz real?", "Si hay VoC", "06.4"],
                ["De criterio / predictiva", "¿correlaciona / predice datos reales?", "Con ground truth", "06.5"],
                ["De constructo", "¿los rasgos se manifiestan?", "Sí", "06.6"],
              ]}
            />
            <Callout variant="key" title="Regla de oro">
              No afirmes un nivel de validez que no hayas medido. El sistema ya
              reconoce sus huecos (<Doc>§6</Doc>, <Doc>§8</Doc>): tu credibilidad
              depende de mantener esa honestidad.
            </Callout>

            <SubLabel>Los cinco niveles</SubLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <LevelCard
                n="1"
                title="Validez aparente y de contenido"
                sub="Revisión experta cualitativa"
                objetivo="Dictamen experto de si las salidas son creíbles y fieles, más un catálogo de fallos."
                items={[
                  <>Muestreo estratificado (módulo × segmento × vía de creación); 40 a 60 salidas por módulo.</>,
                  <>Rúbrica a ciegas con las 4 dimensiones del juez (0-4) más banderas: <Code>caricatura</Code>, <Code>WEIRD</Code>, <Code>complaciente</Code>, <Code>rompe_rol</Code>, <Code>jerga_UX</Code>, <Code>alucinación</Code>.</>,
                  <>Nota cualitativa: qué «tell» delata que es simulado.</>,
                ]}
                metricas="Distribución de notas, top fallos, ejemplos."
                aceptacion="Dictamen apto / apto con reservas / no apto por módulo."
              />
              <LevelCard
                n="2"
                title="Acuerdo humano ↔ máquina"
                sub="Validar el juez automático"
                objetivo="Si el juez coincide contigo, puede escalar tu criterio a miles de salidas. Si no, no hay que fiarse de sus números."
                items={[
                  <>Doble ciego: puntúas las MISMAS salidas que el juez, sin ver su nota, en orden aleatorizado.</>,
                  <>Incluye los casos golden como anclas; un segundo experto puntúa un subconjunto (fiabilidad humano-humano).</>,
                ]}
                metricas="Continuas: Spearman/Pearson, ICC (acuerdo absoluto), Bland-Altman (sesgo). Categóricas: kappa de Cohen / weighted. Confusión por failure_mode."
                aceptacion="Orientativo: Spearman ≥ 0,7, ICC ≥ 0,6, kappa ≥ 0,6 y sesgo no significativo → proxy usable. Si no, informe de recalibración del prompt del juez (lib/eval.ts)."
              />
              <LevelCard
                n="3"
                title="Discriminación ciega"
                sub="Turing invertido"
                objetivo="¿Puedes distinguir una respuesta simulada de una VoC humana real del mismo contexto?"
                items={[
                  <>Mezcla salidas simuladas con verbatims reales de VoC del mismo segmento y estímulo; clasifica a ciegas.</>,
                  <>Cataloga los «tells» cuando aciertes.</>,
                ]}
                metricas="Acierto vs azar (binomial), d-prime, sesgo de respuesta."
                aceptacion="Acierto cercano al azar = alta fidelidad superficial. Requiere VoC real (cliente o panel)."
              />
              <LevelCard
                n="4"
                title="Validez de criterio y predictiva"
                sub="Contra ground truth"
                objetivo="La evidencia más fuerte y más cara. Solo con un resultado real con el que comparar."
                items={[
                  <>Convergente con VoC: análisis temático comparado, solapamiento de códigos.</>,
                  <>De criterio con campañas reales: comparar el ranking de variantes (intención simulada vs CTR real) con tau de Kendall; acierto direccional y calibración.</>,
                  <>Predictiva: preregistra la predicción ANTES de lanzar la campaña real.</>,
                ]}
                metricas="Kendall tau (rankings), curvas de calibración, acierto direccional."
                aceptacion="Las métricas de producto no son 1:1 con la plataforma (un umbral interno no es un CTR): se valida orden y dirección, no el nivel absoluto."
              />
              <LevelCard
                n="5"
                title="Auditoría de sesgos y constructo"
                sub="No necesita ground truth externo"
                objetivo="Ataca las tres debilidades estructurales que el propio sistema reconoce."
                items={[
                  <>Circularidad (<Doc>§8.1</Doc>): ¿las barreras son de la población o del modelo? Contrasta contra taxonomía/VoC independiente.</>,
                  <>Varianza distribucional (<Doc>§8.2</Doc>): ¿centroides/caricaturas? Mide varianza intra-segmento vs real.</>,
                  <>WEIRD (<Doc>§8.4</Doc>): audita registro sociolingüístico, clase, cultura.</>,
                  <>Constructo: perfiles que solo difieran en un rasgo (conciencia alta vs baja) ante el mismo estímulo; ¿aparece la diferencia esperada?</>,
                ]}
                metricas="Solapamiento de códigos, ratios de varianza, contrastes por manipulación de rasgo."
                aceptacion="Cuantifica las debilidades, no las escondas."
              />
            </div>

            <SubLabel>06.7 · Muestreo, tamaño y registro</SubLabel>
            <ul style={ulStyle}>
              <Li>
                Muestreo estratificado con cuota de casos golden más aleatorios.
                Evita juzgar solo los perfiles «bonitos».
              </Li>
              <Li>
                Tamaños orientativos: face validity 40-60/módulo; acuerdo con el
                juez 80-120 salidas para un kappa/ICC estable (haz cálculo de
                potencia).
              </Li>
              <Li>
                Registro reproducible: notas del juez en <Code>evals</Code> (con{" "}
                <Code>app_version</Code>) y en el <Code>meta</Code>/resultado de
                cada run; coste en <Code>gateway_usage</Code>. Anota siempre la
                versión de la app con la que evalúas.
              </Li>
            </ul>

            <SubLabel>06.8 · Ciclo de mejora</SubLabel>
            <Body>
              El bucle es <Hl>validar → detectar fallo → refinar el prompt →
              re-medir</Hl>. Los prompts son texto editable; la señal de
              regresión de <Link href="/evaluacion" style={linkStyle}>/evaluacion</Link>{" "}
              dice si un cambio mejora o empeora. Fija umbrales por adelantado y
              trátalos como preinscritos.
            </Body>
          </Section>

          {/* 07 */}
          <Section id="infra" num="07" title="Infraestructura: acceso, datos, lanzamiento">
            <Body>
              Referencias: <Doc>PROYECTO.md</Doc> (modelo de datos, auth),{" "}
              <Doc>DESARROLLO.md</Doc> (comandos, deploy), <Doc>Plan-venta.md</Doc>{" "}
              (instancias por cliente).
            </Body>
            <SubLabel>Acceso</SubLabel>
            <Body>
              La app está en <Code>suaas.flat101.business</Code>, tras un gate
              por contraseña (cookie <Code>auth_suaas</Code>); no hay roles por
              usuario todavía. Para análisis cuantitativo necesitarás lectura de
              la base de datos (Supabase Postgres): pide acceso de solo lectura.
            </Body>
            <SubLabel>Superficies de la app</SubLabel>
            <div style={cardGrid(230)}>
              <RouteCard href="/evaluacion" title="Evaluación">
                Golden set del juez, historial por versión, detalle por caso y
                señal de regresión. Punto de partida del Nivel 2.
              </RouteCard>
              <RouteCard href="/tokens" title="Tokens · Observabilidad">
                Inspector por llamada (fecha, scope, modelo, tokens, coste USD,
                latencia, ok/fallo) y coste acumulado.
              </RouteCard>
              <RouteCard href="/profiles" title="Fichas de perfil">
                Las capas del perfil, el JTBD con «Evaluar calidad» y el chat en
                vivo con el perfil.
              </RouteCard>
              <RouteCard href="/diag" title="Diagnóstico">
                Estado del esquema, tracking de migraciones, modo beta.
              </RouteCard>
            </div>
            <SubLabel>Tablas que importan</SubLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                "profiles",
                "five_second_responses",
                "campaign_responses",
                "momentum_challenges.results",
                "geo_analyses",
                "evals",
                "gateway_usage",
              ].map((t) => (
                <Pill key={t} mono>
                  {t}
                </Pill>
              ))}
            </div>
            <Note>
              La nota del juez viaja en <Code>meta.quality</Code> de las filas de
              respuesta. Extracción: CSV directo en la vista de un run de
              campañas; el resto por SQL de solo lectura (no hay exportador
              genérico para 5s/momentum/geo todavía, es un hueco conocido).
            </Note>
            <SubLabel>Modelos y coste</SubLabel>
            <Body>
              El modelo objetivo se elige en{" "}
              <Link href="/tokens" style={linkStyle}>/tokens</Link>; el juez por
              defecto es <Code>openai/gpt-5.4</Code>. Hay un tope de presupuesto
              diario que corta los runs si se supera: mira el coste estimado
              antes de lanzar una batería grande.
            </Body>
          </Section>

          {/* 08 */}
          <Section id="itinerario" num="08" title="Itinerario de onboarding por fases">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <PhaseCard phase="Semana 1" title="Conocer">
                Lee, en orden, PROYECTO → ARQUITECTURA-CONCEPTUAL →
                PERFILES-CALIBRADOS. Recorre la app: 3 fichas de IVI, chatea con
                un perfil, lanza un test de 5s y lee el resultado entero
                (incluido el panel de calidad). Ejecuta una evaluación del golden
                set.
              </PhaseCard>
              <PhaseCard phase="Semana 2" title="Asimilar">
                Reconstruye la tabla módulo → estímulo → salida → métrica
                verificándola contra §5. Lee 50 salidas reales y anota qué te
                chirría (tu calibrado como juez humano). Lee §8 y §8.7.
              </PhaseCard>
              <PhaseCard phase="Semana 3-4" title="Juzgar (primer entregable)">
                Monta el Nivel 1 (face validity) sobre una muestra estratificada.
                Monta el Nivel 2 (acuerdo con el juez) y emite el dictamen «el
                juez es/no es un proxy fiable» con su recalibración si procede.
              </PhaseCard>
              <PhaseCard phase="Después" title="Según acceso a ground truth">
                Nivel 3 (discriminación) con VoC real; Nivel 4
                (criterio/predictiva) con un test real alineado; Nivel 5
                (sesgos/constructo) en paralelo, que no necesita ground truth
                externo.
              </PhaseCard>
            </div>
            <Note>
              Cada fase cierra con un documento en <Code>docs/</Code>: misma
              disciplina de documentación viva y fechada que el resto del
              proyecto.
            </Note>
          </Section>

          {/* 09 */}
          <Section id="limites" num="09" title="Límites y honestidad (qué NO afirmar)">
            <Callout variant="honesty" title="Lo que no se puede decir sin haberlo medido">
              <ul style={{ ...ulStyle, marginTop: 4 }}>
                <Li>
                  <Hl>No es un modelo de conducta</Hl>: es un LLM condicionado.
                  No digas «predice» sin validez predictiva (Nivel 4).
                </Li>
                <Li>
                  <Hl>El juez no es validación humana</Hl>: un 0,9 significa
                  «otro modelo lo ve fiel», no «es real».
                </Li>
                <Li>
                  <Hl>Doctrina sin implementar</Hl> (<Doc>§6</Doc>): hay
                  constructos que se nombran pero no están construidos.
                </Li>
                <Li>
                  <Hl>El grounding real no es VoC primaria</Hl> (<Doc>§8.5</Doc>):
                  los perfiles vienen de investigación de escritorio y del
                  conocimiento del modelo, salvo VoC del cliente.
                </Li>
              </ul>
            </Callout>
            <SubLabel>Las tres debilidades estructurales (§8)</SubLabel>
            <div style={cardGrid(230)}>
              <WeakCard title="Circularidad">
                Intra-familia de modelos: quien genera, actúa y juzga puede
                compartir sesgos.
              </WeakCard>
              <WeakCard title="Sin varianza">
                Perfiles como centroides; falta la dispersión de una población
                real.
              </WeakCard>
              <WeakCard title="Validez ecológica">
                Exposiciones instruidas (la «vista de 5 s» es ficción del
                prompt).
              </WeakCard>
            </div>
            <Body>
              Tu trabajo no es esconderlas: es <Hl>cuantificarlas</Hl>.
            </Body>
          </Section>

          {/* 10 */}
          <Section id="glosario" num="10" title="Glosario y mapa de documentos">
            <SubLabel>Glosario mínimo</SubLabel>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <Def term="Perfil calibrado">
                registro estructurado (demografía + Big Five + COM-B + backstory
                + JTBD) que condiciona al LLM. La unidad de análisis.
              </Def>
              <Def term="JTBD">
                la intención en formato «Cuando…, quiero…, para poder…». Vive en{" "}
                <Code>intent_context</Code>.
              </Def>
              <Def term="COM-B">
                modelo de barreras (Capacidad, Oportunidad, Motivación) de Michie
                et al.
              </Def>
              <Def term="Intent Momentum">
                vector {"{"}intensidad, dirección, velocidad{"}"} del interés del
                perfil ante un Trigger.
              </Def>
              <Def term="Juez / LLM-as-judge">
                segundo modelo que puntúa una salida. El de comprensión (sin
                persona) mide acierto; el de calidad (otra familia) mide
                fidelidad.
              </Def>
              <Def term="Golden set">
                casos fijos y reproducibles que estresan fallos concretos, en{" "}
                <Link href="/evaluacion" style={linkStyle}>/evaluacion</Link>.
              </Def>
              <Def term="Medición declarativa simulada">
                el estatuto de todos los datos: autoinforme de un LLM, no
                observación de conducta.
              </Def>
            </dl>

            <SubLabel>Mapa de documentos (docs/)</SubLabel>
            <div style={cardGrid(220)}>
              <DocGroup title="Alto nivel">
                ARQUITECTURA-CONCEPTUAL · GRAVITY-MODEL
              </DocGroup>
              <DocGroup title="Motor al detalle">
                PERFILES-CALIBRADOS · CONOCIMIENTO-USUARIOS-SINTETICOS
              </DocGroup>
              <DocGroup title="Casos reales">
                GRAVITY-MODEL-IVI · IVI-PUBLICO-OBJETIVO ·
                ADESLAS-DENTAL-PUBLICO-OBJETIVO · GEO-PRUEBA-IVI
              </DocGroup>
              <DocGroup title="Infra y negocio">
                PROYECTO · DESARROLLO · Plan-venta · SISTEMA-DISENO
              </DocGroup>
              <DocGroup title="Estado">
                ROADMAP · SIGUIENTE-PASO · AUDITORIA-SEGURIDAD
              </DocGroup>
            </div>

            <SubLabel>Checklist de «listo para juzgar»</SubLabel>
            <ul style={{ ...ulStyle, listStyle: "none", paddingLeft: 0 }}>
              {[
                "He leído PROYECTO, ARQUITECTURA-CONCEPTUAL y PERFILES-CALIBRADOS enteros.",
                "Tengo acceso a la app y a Supabase en lectura.",
                "He lanzado un run de cada módulo principal y leído su salida completa.",
                "Entiendo la diferencia entre fidelidad de simulación y validez externa.",
                "Entiendo qué mide el juez automático y por qué no me sustituye.",
                "He fijado por adelantado los umbrales de aceptación de cada nivel.",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "rgba(var(--fg),0.8)",
                    padding: "5px 0",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: "1px solid rgba(var(--fg),0.3)",
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="onboarding-aside">
          <OnboardingNav sections={SECTIONS} />
        </aside>
      </div>
    </AppShell>
  );
}

// ============================================================
// Primitivas de presentación
// ============================================================

function Section({
  id,
  num,
  title,
  kicker,
  children,
}: {
  id: string;
  num: string;
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="onboarding-section"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            className="mono"
            style={{ fontSize: 12, color: "var(--accent-text)", letterSpacing: "0.08em" }}
          >
            {num}
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(20px, 2.4vw, 27px)",
              color: "var(--text-strong)",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h2>
        </div>
        {kicker && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
              paddingLeft: 24,
            }}
          >
            {kicker}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--text-secondary)",
        margin: "6px 0 0",
      }}
    >
      {children}
    </h3>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 16,
        lineHeight: 1.65,
        color: "rgba(var(--fg),0.8)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 14,
        lineHeight: 1.68,
        color: "rgba(var(--fg),0.68)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12.5,
        lineHeight: 1.6,
        color: "rgba(var(--fg),0.5)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "var(--text-strong)", fontWeight: 700 }}>{children}</strong>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="mono"
      style={{
        fontSize: "0.86em",
        color: "var(--accent-text)",
        background: "rgba(var(--fg),0.05)",
        padding: "1px 6px",
        borderRadius: 4,
      }}
    >
      {children}
    </code>
  );
}

function Doc({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{ fontSize: "0.86em", color: "rgba(var(--fg),0.75)" }}
    >
      {children}
    </span>
  );
}

const olStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const ulStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const linkStyle: React.CSSProperties = {
  color: "var(--accent-text)",
  textDecoration: "none",
  borderBottom: "1px dotted rgba(var(--fg),0.3)",
};

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(var(--fg),0.72)" }}>
      {children}
    </li>
  );
}

function cardGrid(min: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 12,
  };
}

function Callout({
  variant,
  title,
  children,
}: {
  variant: "key" | "warn" | "honesty" | "info";
  title: string;
  children: React.ReactNode;
}) {
  // color de acento por variante (info no tiene acento propio)
  const accent =
    variant === "key"
      ? "var(--accent-500)"
      : variant === "warn"
        ? "var(--warning-text)"
        : variant === "honesty"
          ? "var(--error-text)"
          : null;
  // El alfa se aplica con color-mix (válido y theme-aware); pegar hex tras un
  // var() no funciona (los tokens sustituidos no se fusionan).
  const labelColor = accent ?? "var(--accent-text)";
  const barColor = accent ?? "rgba(var(--fg),0.32)";
  const ringColor = accent
    ? `color-mix(in srgb, ${accent} 45%, transparent)`
    : "rgba(var(--fg),0.1)";
  const tint =
    variant === "key" ? "rgba(250,204,13,0.05)" : "rgba(var(--fg),0.02)";
  return (
    <div
      style={{
        border: `1px solid ${ringColor}`,
        borderLeft: `3px solid ${barColor}`,
        borderRadius: "var(--radius-md)",
        background: tint,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        {title}
      </span>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: "rgba(var(--fg),0.78)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DataTable({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "rgba(var(--fg),0.82)",
          minWidth: 520,
        }}
      >
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="mono"
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(var(--fg),0.5)",
                  fontWeight: 400,
                  borderBottom: "1px solid rgba(var(--fg),0.14)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(var(--fg),0.06)" }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "9px 12px",
                    verticalAlign: "top",
                    lineHeight: 1.5,
                    color: j === 0 ? "var(--text-strong)" : "rgba(var(--fg),0.7)",
                    fontWeight: j === 0 ? 600 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepCard({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={miniCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--accent-text)" }}>
          {n}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-strong)",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      </div>
      <p style={cardBody}>{children}</p>
    </div>
  );
}

function DimCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={miniCard}>
      <span className="mono" style={{ fontSize: 12, color: "var(--accent-text)" }}>
        {label}
      </span>
      <p style={cardBody}>{children}</p>
    </div>
  );
}

function RouteCard({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ ...miniCard, textDecoration: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 700 }}>
          {title}
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--accent-text)" }}>
          {href}
        </span>
      </div>
      <p style={cardBody}>{children}</p>
    </Link>
  );
}

function WeakCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        ...miniCard,
        borderColor: "color-mix(in srgb, var(--error-text) 40%, transparent)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--error-text)", fontWeight: 600 }}>
        {title}
      </span>
      <p style={cardBody}>{children}</p>
    </div>
  );
}

function DocGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={miniCard}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(var(--fg),0.5)",
        }}
      >
        {title}
      </span>
      <p style={{ ...cardBody, fontFamily: "var(--font-mono)", fontSize: 12 }}>
        {children}
      </p>
    </div>
  );
}

function PhaseCard({
  phase,
  title,
  children,
}: {
  phase: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderLeft: "3px solid var(--accent-500)",
        paddingLeft: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent-text)" }}>
          {phase}
        </span>
        <span style={{ fontSize: 17, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)" }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(var(--fg),0.65)", margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function LevelCard({
  n,
  title,
  sub,
  objetivo,
  items,
  metricas,
  aceptacion,
}: {
  n: string;
  title: string;
  sub: string;
  objetivo: string;
  items: React.ReactNode[];
  metricas: string;
  aceptacion: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(var(--fg),0.1)",
        borderRadius: "var(--radius-md)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--accent-500)",
            border:
              "1px solid color-mix(in srgb, var(--accent-500) 45%, transparent)",
            borderRadius: "var(--radius-pill)",
            padding: "2px 9px",
          }}
        >
          Nivel {n}
        </span>
        <span style={{ fontSize: 17, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)" }}>
          {title}
        </span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent-text)" }}>
          {sub}
        </span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "rgba(var(--fg),0.72)", margin: 0 }}>
        {objetivo}
      </p>
      <ul style={{ ...ulStyle, gap: 5 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(var(--fg),0.65)" }}>
            {it}
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <MetaRow label="Métricas">{metricas}</MetaRow>
        <MetaRow label="Aceptación">{aceptacion}</MetaRow>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          minWidth: 74,
          paddingTop: 3,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(var(--fg),0.62)", flex: 1, minWidth: 200 }}>
        {children}
      </span>
    </div>
  );
}

function Pill({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={mono ? "mono" : undefined}
      style={{
        fontSize: mono ? 11 : 12.5,
        padding: "5px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1px solid rgba(var(--fg),0.12)",
        background: "rgba(var(--fg),0.03)",
        color: "rgba(var(--fg),0.72)",
      }}
    >
      {children}
    </span>
  );
}

function Def({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <dt style={{ fontSize: 14, color: "var(--text-strong)", fontWeight: 700 }}>
        {term}
      </dt>
      <dd style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(var(--fg),0.65)" }}>
        {children}
      </dd>
    </div>
  );
}

const miniCard: React.CSSProperties = {
  border: "1px solid rgba(var(--fg),0.08)",
  borderRadius: "var(--radius-md)",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "rgba(var(--fg),0.02)",
};

const cardBody: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "rgba(var(--fg),0.62)",
  margin: 0,
};
