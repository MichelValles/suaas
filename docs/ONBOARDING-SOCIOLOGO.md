# Onboarding del sociólogo experto · Gravity

> Guión completo para que un/a sociólogo/a se incorpore a Gravity, **conozca** qué hay, **asimile** cómo funciona y sea capaz de **juzgar y validar** las salidas del sistema. Fecha de redacción: 2026-07-22 (contra v0.76.0).
>
> Este documento no repite la teoría: la referencia. El corazón del encargo, la **validación humana de las salidas simuladas**, está en la sección 6.

---

## 0. Cómo usar este documento

Gravity es una plataforma de **validación temprana**: anticipa la eficacia de un mensaje, una campaña o una decisión antes de comprometer tráfico real, para saber qué funciona antes de invertir en ello. Lo consigue con **perfiles calibrados**: registros estructurados de usuario (personalidad, barreras, historia, intención) que condicionan a un LLM para que responda «en la voz» de ese usuario ante un estímulo (una landing, un anuncio, un precio, un buscador). Tu trabajo no es usar la herramienta: es **auditar si lo que produce es creíble, fiel y, en la medida de lo posible, predictivo**, y montar el protocolo para que esa validación sea sistemática y repetible.

Orden de lectura sugerido (detallado como itinerario en la sección 8):

1. `docs/PROYECTO.md`: qué es, stack, modelo de datos. 20 minutos.
2. `docs/ARQUITECTURA-CONCEPTUAL.md`: síntesis en cuatro preguntas (arquitectura, qué computa, estado, diferencial). Es la puerta de entrada de alto nivel.
3. `docs/PERFILES-CALIBRADOS.md`: el motor al detalle, escrito para una audiencia experta en behavioural economics y sociología. Es tu documento de cabecera.
4. `docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`: la base teórica y empírica con las fuentes verificadas y las cifras de validación existentes.
5. `docs/GRAVITY-MODEL.md` y `docs/GRAVITY-MODEL-IVI.md`: el marco estratégico y su aplicación al caso IVI.
6. Este documento, sección 6 en adelante: qué vas a validar y cómo.

Convención de este texto: cuando cito «§8.1» me refiero a una sección de `PERFILES-CALIBRADOS.md` salvo que diga otra cosa.

---

## 1. Qué es Gravity y qué NO es (la tesis y su estatuto epistemológico)

**La tesis de producto** (`GRAVITY-MODEL.md`): «la decisión se toma antes del clic». El sistema intenta anticipar cómo reacciona un tipo de usuario a un mensaje, ANTES de gastar en tráfico real, simulando su reacción con un perfil calibrado.

**El estatuto de lo que produce, y esto es lo primero que tienes que interiorizar**: todo es **medición declarativa simulada**. No hay un modelo computacional de conducta detrás (no es un agente cognitivo tipo ACT-R ni una microsimulación). Hay un LLM (familia Claude por defecto) al que se le da un registro estructurado del usuario y se le pide que responda como esa persona. Las «métricas» (intención de clic, comprensión, intensidad de intención) son **autoinformes de un modelo de lenguaje condicionado**, no observaciones de conducta.

Consecuencia práctica para ti: la pregunta de validación no es «¿es verdad?», sino una escalera de preguntas cada vez más exigentes:

1. ¿Es **internamente coherente** con el perfil? (fidelidad de simulación)
2. ¿Un **experto humano** la juzgaría igual que el juez automático? (fiabilidad del proxy)
3. ¿Es **indistinguible** de una voz humana real? (validez aparente fuerte)
4. ¿**Correlaciona** con conducta o con VoC real? (validez de criterio)
5. ¿**Predice** un KPI real (CTR, conversión)? (validez predictiva)

Qué se puede afirmar hoy y qué no está en `PERFILES-CALIBRADOS §7` («qué citar y qué no») y §9 (guion de síntesis). Lee esas dos secciones antes de formarte opinión.

---

## 2. La unidad de análisis: el perfil calibrado

Un perfil (esquema en `lib/profiles.ts`, explicado en `PERFILES-CALIBRADOS §1`) tiene estas capas:

| Capa | Qué es | Marco académico | Dónde vive |
|---|---|---|---|
| Demografía | edad, género, ocupación, renta, geo | descriptivo | `demographics` (jsonb) |
| Big Five (OCEAN) | 5 rasgos 0..1 | FFM; en onboard, HEXACO-24 mapeado | `big_five` (jsonb) |
| Barreras COM-B | capacidad / oportunidad / motivación | Michie et al. | `com_b_barriers` (jsonb) |
| Backstory | viñeta narrativa | vignette methodology | `backstory` (text) |
| JTBD (intención) | «Cuando…, quiero…, para poder…» | Jobs To Be Done / TPB | `intent_context` (text) |
| Momentum | vector {intensidad, dirección, velocidad} | teoría de campo de Lewin | dinámico, por Trigger |

Las **cuatro vías de creación** (formulario manual, CSV, onboard determinista, seeds) y sus inconsistencias conocidas están en `§1.2` y `§1.5`. Importante para ti: no todos los perfiles se generan igual, y eso afecta a su fidelidad. El onboard usa psicometría determinista (HEXACO-24 real, el LLM solo «viste» la narrativa); los seeds los inventa el LLM entero. Un plan de validación serio **estratifica por vía de creación**.

**Los perfiles reales que ya existen** son tu material de partida:
- 15 perfiles de **IVI** (reproducción asistida), documentados en `docs/IVI-PUBLICO-OBJETIVO.md`, creados desde una investigación multiagente del público objetivo con taxonomía de 12 segmentos.
- 3 perfiles de **SegurCaixa Adeslas Dental**, en `docs/ADESLAS-DENTAL-PUBLICO-OBJETIVO.md`, con 6 segmentos.
- El resto son perfiles base del formulario.

Estos dos sets tienen **investigación de mercado detrás** (cifras verificadas, fuentes), así que son los candidatos naturales para contrastar contra realidad.

---

## 3. Los módulos: qué estímulo, qué salida, qué mide cada uno

Esta tabla es tu mapa de «qué output tengo que juzgar». El detalle de fidelidad por módulo está en `PERFILES-CALIBRADOS §5`.

| Módulo | Estímulo que ve el perfil | Salida principal (la voz) | Métrica de producto | Se guarda en |
|---|---|---|---|---|
| **Claridad 5s** | una pantalla, «vista» 5 s | recuerdo, oferta percibida, barreras | comprensión (juez sin persona), claridad, conducta | `five_second_responses` |
| **Campañas** | anuncio (Search/Meta/TikTok) + landing | qué le ofrece, razonamiento, barreras, versión ideal | intención de clic, claridad, credibilidad, match landing | `campaign_responses` |
| **Intent Momentum** | un Trigger (escenario de activación) | relato en su voz, primeros pasos, canales, frenos | vector {intensidad, dirección, velocidad} | `momentum_challenges.results` |
| **GEO Tester** | una query real a un buscador IA | (ninguna: sonda desnuda, sin persona) | presencia/posición/tono de la marca | `geo_analyses` |
| **Copy resonance** | piezas de copy | reacción por pieza | resonancia | tablas copy |
| **Pricing** | una oferta con precio | reacción | «justo» (justicia de precio, no WTP) | tablas pricing |
| **Embudos** | pasos de un funnel | avance/abandono por paso | conversión por paso | tablas funnel |
| **A/B** | dos variantes (5s) | igual que 5s, por variante | comparación A vs B | via runs 5s |
| **Chat** | conversación libre | turnos en voz del perfil (Talker-Reasoner) | cualitativo | `messages` |
| **Intent (JTBD)** | (generación, no reacción) | el propio `intent_context` | fidelidad del JTBD (on-demand) | `profiles.intent_context` |

Detalle clave que tienes que entender de cada módulo antes de juzgarlo (todo en `§5`): qué está «cegado» (el perfil no ve el brief del anunciante, para no contaminar), qué usa juez sin persona, y qué es ficción del prompt (la «exposición de 5 segundos» no es un límite físico, es una instrucción; eso afecta a la validez ecológica).

---

## 4. Cómo se genera la voz del perfil (la caja negra, abierta)

Toda la voz del perfil sale de una única función, `buildSystemPrompt` (`lib/prompts.ts`, explicada en `§4.1`). Combina las capas del perfil en un system prompt e incluye **negative prompts anti-complacencia** («no eres servicial», «eres escéptico ante el marketing», «no suenes como ChatGPT»). El chat, y solo el chat, añade una arquitectura dual **Talker-Reasoner** (`§4.2`).

Los **controles experimentales** son, metodológicamente, lo mejor del sistema y lo primero que un revisor externo valora (`§4.3` y `§8.6`). Debes conocerlos porque son la respuesta a la mitad de las críticas:

1. **Cegado del brief**: en campañas, el perfil reacciona al anuncio sin conocer la intención interna del anunciante (evita el sesgo de cámara de eco).
2. **Juez sin persona**: la comprensión del 5s y de campañas la mide un juez neutral, no el propio perfil.
3. **Rúbricas por bandas (BARS) y orden razón→score**: el juez razona antes de puntuar, para que el número salga del texto y no al revés.
4. **Muestreo determinista de estímulos por sujeto**: en campañas, cada perfil ve una combinación de anuncio reproducible (mismo perfil, mismo estímulo).
5. **Chequeo de consistencia interna** (`behavior_inconsistencies`): marca respuestas cuya conducta declarada contradice su propia intención.

---

## 5. El juez de calidad automático (qué es, qué mide y por qué NO te sustituye)

Durante esta última fase se ha construido un **juez de calidad de las salidas** (código en `lib/eval.ts`, hallazgos en `§8.7`). Tienes que entenderlo bien porque tu primera tarea será **validar el juez** (sección 6.3).

- **Qué es**: un segundo LLM que puntúa la CALIDAD de una salida como simulación fiel del perfil. Por defecto es **OpenAI (`openai/gpt-5.4`)**, de una **familia distinta** al modelo objetivo (Claude), deliberadamente, para romper la circularidad de «juzgar a Claude con Claude» (`§8.1`).
- **Qué puntúa** (0..1 cada una, más un veredicto y un `failure_mode`):
  - `role_fidelity`: ¿habla en primera persona como el usuario, sin sonar a IA?
  - `grounding`: ¿está anclada en los atributos concretos de ESTE perfil, o es genérica?
  - `non_sycophancy`: ¿mantiene el escepticismo, no es complaciente?
  - `naturalness`: ¿suena a persona real, no a ChatGPT idealizado?
- **Dónde corre**:
  - En los runs de **Claridad 5s**, **Campañas** e **Intent Momentum**: juzga una **muestra** de las salidas y guarda la nota (panel «Calidad de la simulación» en la vista del run).
  - En el módulo **Intent (JTBD)**: **on-demand** desde la ficha del perfil (botón «Evaluar calidad»).
  - En **`/evaluacion`**: contra un **golden set** de casos fijos que estresan fallos concretos (romper rol, respuesta genérica, complacencia, sonar a IA), con historial y señal de regresión entre versiones.
- **Su límite, y esto es central**: el juez es **otro LLM**. Mide la opinión de un LLM sobre otro. No es validación humana ni validación empírica. Sirve para **comparar modelos**, **cazar regresiones** de prompt entre versiones y **pre-filtrar a escala**. Tu papel es decir si ese proxy es fiable (sección 6.3) y qué le falta.

Los **hallazgos ya documentados y fechados** de cómo se comporta el juez, y cómo una mala configuración da lecturas falsamente bajas, están en `§8.7`. Léelos: te ahorran repetir errores (p. ej.: si al juez le pasas campos mecánicos en lista, penaliza «robótico» aunque la voz sea buena).

---

## 6. El protocolo de validación humana (el núcleo del encargo)

Aquí es donde tu criterio de sociólogo sustituye al mío. Lo que sigue es un **protocolo por niveles**, de menos a más exigente y más caro. No hace falta hacerlos todos de golpe: cada nivel produce evidencia utilizable y decide si merece la pena el siguiente.

### 6.1 Qué estás validando exactamente (marco de validez)

Separa dos cosas que se confunden constantemente:

- **Fidelidad de simulación** (interna): ¿la salida es coherente con el perfil y con una persona plausible? Es alcanzable y barata de medir.
- **Validez externa**: ¿la salida se corresponde con la conducta o el discurso de humanos reales de ese segmento? Es cara y requiere ground truth.

Tipos de validez y su alcanzabilidad hoy:

| Tipo | Pregunta | Alcanzable hoy | Nivel del protocolo |
|---|---|---|---|
| Aparente (face) | ¿parece creíble a un experto? | Sí | 6.2 |
| De contenido | ¿cubre los rasgos/barreras que debería? | Sí | 6.2 |
| De fiabilidad del proxy | ¿el juez automático coincide con el experto? | Sí | 6.3 |
| Aparente fuerte | ¿es indistinguible de una voz real? | Sí, si hay VoC real | 6.4 |
| De criterio / convergente | ¿correlaciona con datos reales? | Solo con ground truth | 6.5 |
| Predictiva | ¿predice un KPI real? | Solo con un test real alineado | 6.5 |
| De constructo | ¿los rasgos declarados se manifiestan? | Sí | 6.6 |

Regla de oro: **no afirmes un nivel de validez que no hayas medido**. El sistema ya reconoce sus huecos (`§6`, `§8`); tu credibilidad depende de mantener esa honestidad.

### 6.2 Nivel 1 · Validez aparente y de contenido (revisión experta cualitativa)

**Objetivo**: un dictamen experto de si las salidas son creíbles y fieles, y un catálogo de fallos.

**Procedimiento**:
1. **Muestreo estratificado** (ver 6.7): por módulo, por segmento/perfil y por vía de creación del perfil. Empieza con 40-60 salidas por módulo.
2. Califica cada salida a ciegas (sin ver la nota del juez) con una **rúbrica de experto**. Propuesta de rúbrica (reutiliza las 4 dimensiones del juez para que sean comparables en 6.3, más banderas cualitativas):
   - Fidelidad de rol (0-4), anclaje en el perfil (0-4), no complacencia (0-4), naturalidad (0-4).
   - Banderas booleanas: `caricatura` (rasgo exagerado hasta el estereotipo), `WEIRD` (registro/valores de clase media occidental impuestos), `complaciente`, `rompe_rol`, `jerga_UX` (habla como analista, no como usuario), `alucinación` (inventa atributos del producto o del perfil).
   - Nota cualitativa libre: qué «tell» delata que es simulado.
3. Consolida en un **informe de face validity** por módulo: distribución de notas, top fallos, ejemplos.

**Salida**: dictamen «apto / apto con reservas / no apto» por módulo y un catálogo de fallos que alimenta el ciclo de mejora (6.8).

### 6.3 Nivel 2 · Acuerdo humano ↔ máquina (validar el juez automático)

Este es el nivel que la organización necesita primero: si el juez automático coincide contigo, puede **escalar** tu criterio a miles de salidas. Si no, no hay que fiarse de sus números.

**Diseño**:
- **Doble ciego**: puntúa las MISMAS salidas que el juez puntuó, sin ver su nota, en orden aleatorizado.
- Incluye los **casos golden** de `/evaluacion` (donde ya sabemos qué fallo estresa cada caso) como anclas.
- Un **segundo experto** puntúa un subconjunto, para medir tu propia fiabilidad (inter-rater humano-humano) y no confundir «el juez falla» con «los humanos tampoco coinciden».

**Métricas** (calcula sobre las dimensiones y el veredicto):
- Dimensiones continuas (0..1): correlación de **Spearman** (robusta) y **Pearson**; **coeficiente de correlación intraclase (ICC)** para acuerdo absoluto; **Bland-Altman** para detectar sesgo sistemático (¿el juez puntúa siempre más alto que tú?); error absoluto medio.
- `failure_mode` y veredicto binarizado (apto/no apto): **kappa de Cohen** (o **weighted kappa** si ordinal); matriz de confusión para ver QUÉ fallo confunde.
- Fiabilidad humano-humano: la misma batería entre los dos expertos.

**Criterios de aceptación** (orientativos, ajústalos): correlación de Spearman ≥ 0,7 e ICC ≥ 0,6 en las dimensiones, kappa ≥ 0,6 en el veredicto, y un sesgo Bland-Altman no significativo. Si se cumplen, el juez es un proxy usable para regresión y pre-filtro. Si no, el entregable es un **informe de recalibración**: qué dimensión falla, con qué sesgo, y una propuesta de reformulación del prompt del juez (que vive en `lib/eval.ts`, es texto editable).

### 6.4 Nivel 3 · Discriminación ciega (Turing invertido)

**Objetivo**: ¿puedes distinguir una respuesta simulada de una VoC humana real del mismo contexto?

**Procedimiento**: mezcla salidas simuladas con transcripciones/verbatims reales de VoC (entrevistas, reviews, respuestas abiertas de encuesta) del mismo segmento y estímulo. A ciegas, clasifica cada una como «real» o «simulada».

**Métricas**: tasa de acierto frente al azar (test binomial), **d-prime** (sensibilidad de detección) y sesgo de respuesta. Cataloga los **tells** cuando aciertes (qué marcó la diferencia: exceso de estructura, vocabulario impostado, ausencia de contradicción humana, etc.).

**Interpretación**: acierto cercano al azar indica alta fidelidad superficial; acierto alto es información valiosísima (te dice qué corregir en el prompt). Requiere tener VoC real, así que suele venir del cliente (IVI, Adeslas) o de un panel.

### 6.5 Nivel 4 · Validez de criterio y predictiva (contra ground truth)

Es la evidencia más fuerte y la más cara. Solo es posible cuando existe un resultado real con el que comparar.

**Variantes**:
- **Convergente con VoC**: correlacionar las barreras/temas que emergen en los perfiles con los de un estudio VoC independiente del mismo público (análisis temático comparado; solapamiento de códigos).
- **De criterio con datos de campaña reales**: alinear un experimento simulado con un test A/B o una campaña real ya lanzada. Comparar el **ranking** de variantes (intención de clic simulada vs CTR real) con **tau de Kendall**; medir **acierto direccional** (¿la variante que el sistema dice mejor lo fue?) y **calibración** (¿una intención de 0,7 se traduce en algo cercano al 70% de la métrica real?, con curvas de calibración).
- **Predictiva prospectiva**: preregistrar la predicción del sistema ANTES de lanzar la campaña real y contrastar después. Es el estándar de oro y el que da derecho a hablar de «predicción».

**Advertencia metodológica**: las métricas de producto NO son comparables 1:1 con las de la plataforma publicitaria (p. ej. «intención de clic ≥ 0,5» es un umbral interno, no un CTR). Lo que se valida es el **orden y la dirección**, no el nivel absoluto. Esto ya está anotado en la propia UI del run de campañas y en `§5`.

### 6.6 Nivel 5 · Auditoría de sesgos y validez de constructo

Ataca las tres debilidades estructurales que el propio sistema reconoce (`§8.1`, `§8.2`, `§8.4`):

- **Circularidad** (`§8.1`): ¿las «barreras detectadas» son de la población o son la teoría implícita de la conducta que tiene el modelo? Test: contrasta las barreras que emergen contra una taxonomía o VoC independiente; si coinciden con lo que ya sabe cualquier LLM y no con lo específico del segmento, hay circularidad.
- **Varianza distribucional** (`§8.2`): ¿los perfiles son centroides/caricaturas sin la dispersión de una población real? Test: mide la varianza intra-segmento de las salidas y compárala con la varianza de VoC real; una simulación demasiado «limpia» delata caricatura.
- **WEIRD y diversidad** (`§8.4`): audita registro sociolingüístico, clase y cultura. ¿Todos «hablan» como clase media urbana occidental aunque el perfil no lo sea?
- **Constructo Big Five / COM-B**: ¿los rasgos declarados se MANIFIESTAN en las salidas? Diseño limpio: coge perfiles que solo difieran en un rasgo (p. ej. conciencia alta vs baja) ante el mismo estímulo y comprueba si la diferencia esperada aparece (más pasos metódicos, más cautela). Es validez de constructo por manipulación.

### 6.7 Muestreo, tamaño y registro

- **Muestreo**: estratificado por (módulo × segmento × vía de creación), con una cuota de **casos golden** (conocidos) más aleatorios. Evita juzgar solo los perfiles «bonitos» de IVI/Adeslas.
- **Tamaños orientativos**: face validity, 40-60 por módulo; acuerdo con el juez, mínimo 80-120 salidas para un kappa/ICC estable (y haz un cálculo de potencia para el umbral que fijes); discriminación, suficientes pares para un binomial con potencia; criterio, tantas variantes reales como puedas alinear.
- **Registro y trazabilidad**: los datos ya se persisten y son reproducibles:
  - Notas del juez: en `evals` (golden set, con `app_version` para comparar entre versiones) y en el `meta`/resultado de cada run (5s, campañas, momentum).
  - Consumo y coste por llamada: `gateway_usage` (scope `quality_judge` para el juez), visible en `/tokens`.
  - Determinismo: el muestreo de estímulos por sujeto es reproducible; cada eval guarda la versión de la app. Anota SIEMPRE la versión (`lib/version.ts`) con la que evalúas.

### 6.8 Criterios de aceptación y ciclo de mejora

El bucle operativo es: **validar → detectar fallo → refinar el prompt → re-medir**. Los prompts son texto editable (`buildSystemPrompt`, las tareas de cada módulo, el prompt del juez en `lib/eval.ts`). La señal de regresión de `/evaluacion` (delta respecto a la evaluación anterior del mismo modelo) te dice si un cambio mejora o empeora. Fija umbrales por nivel al empezar y trátalos como preinscritos, para no mover la portería a posteriori.

---

## 7. La infraestructura: cómo accedes, dónde está el dato, cómo lanzas

Referencias: `docs/PROYECTO.md` (modelo de datos, auth), `docs/DESARROLLO.md` (comandos, env, deploy), `docs/Plan-venta.md` (instancias dedicadas por cliente).

**Acceso**:
- La app está en `https://suaas.flat101.business`. El acceso es un **gate por contraseña** (cookie `auth_suaas`); no hay roles por usuario todavía, así que tu acceso será compartido o un login propio que te habiliten.
- Para análisis cuantitativo necesitarás **lectura de la base de datos** (Supabase Postgres). Pide acceso de solo lectura al proyecto Supabase; ahí puedes lanzar SQL contra las tablas de resultados.

**Las superficies de la app que vas a usar**:
- **`/evaluacion`**: el banco de pruebas del juez (golden set), con historial por versión, detalle por caso y señal de regresión. Tu punto de partida para el Nivel 2.
- **`/tokens`**: observabilidad. Inspector por llamada (fecha, scope, modelo, tokens, coste real en USD, latencia, ok/fallo), filtrable y paginado, y coste acumulado. Aquí ves lo que cuesta cada evaluación.
- **La vista de cada run** (5s, campañas, momentum): panel «Calidad de la simulación» + tabla de respuestas con drill-down por perfil (recuerdo, razonamiento, barreras, versión ideal, y la nota del juez en las muestreadas).
- **La ficha del perfil**: demografía, Big Five, COM-B, backstory, el JTBD con «Evaluar calidad», y el chat en vivo con el perfil.
- **`/diag`**: estado del esquema, tracking de migraciones, modo beta.

**Las tablas que importan para tu análisis** (Postgres):
- `profiles`: la unidad de análisis (incluye `intent_context`, `optimized_for`, `source`).
- `five_second_responses`, `campaign_responses`: una fila por (perfil, estímulo); la nota del juez viaja en `meta.quality`.
- `momentum_challenges.results` (jsonb): resultados de Momentum con la nota del juez adjunta en los muestreados.
- `geo_analyses`: análisis GEO por segmento.
- `evals`: historial de evaluaciones del golden set (agregados + detalle por caso en `cases`).
- `gateway_usage`: telemetría de todas las llamadas al modelo (para coste y auditoría).

**Extracción de datos para trabajar offline**:
- CSV directo: la vista de un run de **campañas** exporta CSV (incluye formato para Google Ads / Meta / TikTok).
- El resto: consulta SQL de solo lectura contra las tablas de arriba (o pide que se te exporte). No hay todavía un exportador genérico para 5s/momentum/geo; es un hueco conocido y se puede añadir si tu análisis lo necesita.

**Modelos y coste**: el modelo objetivo y el del chat se eligen en `/tokens` (catálogo Anthropic + OpenAI); el juez por defecto es `openai/gpt-5.4`. Hay un tope de presupuesto diario (`budgetGate`) que corta los runs si se supera. Antes de lanzar una batería grande de evaluación, mira el coste estimado (aparece en las pantallas de lanzamiento) y el consumo en `/tokens`.

---

## 8. Itinerario de onboarding por fases

**Semana 1 · Conocer**
1. Lee, en orden, `PROYECTO.md` → `ARQUITECTURA-CONCEPTUAL.md` → `PERFILES-CALIBRADOS.md`.
2. Recorre la app: abre 3 fichas de perfil de IVI, lee sus capas, chatea con uno.
3. Lanza un test de Claridad 5s con 4 perfiles y lee el resultado entero, incluido el panel de calidad.
4. Abre `/evaluacion` y ejecuta una evaluación del golden set; lee un caso en detalle.

**Semana 2 · Asimilar**
5. Reconstruye tú mismo la tabla del punto 3 (módulo → estímulo → salida → métrica → tabla) verificándola contra `§5`.
6. Lee 50 salidas reales (mezcla de módulos y segmentos) y anota, sin rúbrica todavía, qué te chirría. Este es tu calibrado como juez humano.
7. Lee `§8` completo (las críticas y cómo se responden) y `§8.7` (los hallazgos de fidelidad ya medidos y fechados).

**Semana 3-4 · Juzgar (primer entregable)**
8. Monta el **Nivel 1** (face validity) sobre una muestra estratificada: rúbrica, 40-60 salidas por módulo, informe.
9. Monta el **Nivel 2** (acuerdo con el juez): puntúa a ciegas las salidas que juzgó el juez, calcula correlación/ICC/kappa, emite el dictamen «el juez es/no es un proxy fiable» con su recalibración si procede.

**Después · según acceso a ground truth**
10. Nivel 3 (discriminación) cuando haya VoC real; Nivel 4 (criterio/predictiva) cuando haya un test real alineado; Nivel 5 (sesgos/constructo) en paralelo, que no necesita ground truth externo.

Cada fase cierra con un documento en `docs/` (misma disciplina que el resto del proyecto: documentación viva, fechada).

---

## 9. Límites y honestidad (qué NO afirmar)

- **No es un modelo de conducta**: es un LLM condicionado. No digas «el sistema predice» sin haber medido validez predictiva (Nivel 4).
- **El juez no es validación humana**: es un LLM juzgando a otro. Un 0,9 del juez significa «otro modelo lo ve fiel», no «es real».
- **Doctrina sin implementar** (`PERFILES-CALIBRADOS §6`): hay constructos que se nombran pero no están implementados (revísalos para no presentarlos como capacidad).
- **Las tres debilidades estructurales** (`§8`): circularidad intra-familia de modelos, ausencia de varianza distribucional (perfiles como centroides) y validez ecológica de exposiciones instruidas. Tu trabajo no es esconderlas: es cuantificarlas.
- **El grounding real no es VoC primaria** (`§8.5`): los perfiles vienen de investigación de escritorio y del conocimiento del modelo, no de entrevistas primarias, salvo que el cliente aporte VoC.

---

## 10. Glosario y mapa de documentos

**Glosario mínimo**:
- **Perfil calibrado**: registro estructurado (demografía + Big Five + COM-B + backstory + JTBD) que condiciona al LLM. La unidad de análisis.
- **JTBD (Jobs To Be Done)**: la intención del usuario en formato «Cuando…, quiero…, para poder…». Vive en `intent_context`.
- **COM-B**: modelo de barreras (Capacidad, Oportunidad, Motivación) de Michie et al.
- **Intent Momentum**: vector {intensidad, dirección, velocidad} que describe cómo se mueve el interés del perfil ante un Trigger.
- **Juez / LLM-as-judge**: segundo modelo que puntúa la calidad de una salida. El de comprensión (sin persona) mide acierto; el de calidad (otra familia) mide fidelidad.
- **Golden set**: casos fijos y reproducibles que estresan fallos concretos, en `/evaluacion`.
- **Cegado del brief**: el perfil no ve la intención del anunciante al reaccionar.
- **Medición declarativa simulada**: el estatuto de todos los datos del sistema (autoinforme de un LLM, no observación de conducta).

**Mapa de documentos** (todos en `docs/`, índice en `docs/README.md`):
- Alto nivel: `ARQUITECTURA-CONCEPTUAL.md`, `GRAVITY-MODEL.md`.
- Motor al detalle: `PERFILES-CALIBRADOS.md` (tu cabecera), `CONOCIMIENTO-USUARIOS-SINTETICOS.md`.
- Casos reales: `GRAVITY-MODEL-IVI.md`, `IVI-PUBLICO-OBJETIVO.md`, `ADESLAS-DENTAL-PUBLICO-OBJETIVO.md`, `GEO-PRUEBA-IVI.md`.
- Infraestructura y negocio: `PROYECTO.md`, `DESARROLLO.md`, `Plan-venta.md`, `SISTEMA-DISENO.md`.
- Estado y decisiones: `ROADMAP.md`, `SIGUIENTE-PASO.md`, `AUDITORIA-SEGURIDAD.md`.

**Checklist de «listo para juzgar»**:
- [ ] He leído `PROYECTO`, `ARQUITECTURA-CONCEPTUAL` y `PERFILES-CALIBRADOS` enteros.
- [ ] Tengo acceso a la app y a Supabase en lectura.
- [ ] He lanzado un run de cada módulo principal y leído su salida completa.
- [ ] Entiendo la diferencia entre fidelidad de simulación y validez externa.
- [ ] Entiendo qué mide el juez automático y por qué no me sustituye.
- [ ] He fijado por adelantado los umbrales de aceptación de cada nivel.
