# Perfiles calibrados: anatomía, fundamentos y límites del motor

> **Propósito**: este documento explica el sistema de perfiles de Gravity con el rigor necesario para sostener una conversación con una persona experta en Behavioural Economics y sociología. Para cada componente responde tres preguntas: qué hay exactamente en el código, qué constructo académico encarna (con autores y obras canónicas) y dónde la operacionalización se queda corta frente al constructo. La honestidad sobre los límites es deliberada: es la parte que una revisora académica va a auditar primero.
>
> **Relación con los demás documentos**: el marco estratégico (por qué se simula y en qué plano) está en [`GRAVITY-MODEL.md`](./GRAVITY-MODEL.md). La base teórica fundacional del motor está en [`CONOCIMIENTO-USUARIOS-SINTETICOS.md`](./CONOCIMIENTO-USUARIOS-SINTETICOS.md). Los dos sets de perfiles construidos con investigación real están en [`IVI-PUBLICO-OBJETIVO.md`](./IVI-PUBLICO-OBJETIVO.md) y [`ADESLAS-DENTAL-PUBLICO-OBJETIVO.md`](./ADESLAS-DENTAL-PUBLICO-OBJETIVO.md).
>
> **Verificado contra el código a v0.63.3 (2026-07-19).** Cada afirmación lleva su cita `archivo:línea`. Al cambiar cualquier pieza del sistema de perfiles, actualizar este documento en la misma sesión.

---

## 0. Qué es exactamente un perfil calibrado (y qué no es)

Un **perfil calibrado** son dos cosas acopladas:

1. **Un registro estructurado**: demografía, cinco rasgos de personalidad Big Five en escala 0..1, tres listas de barreras COM-B en texto libre, una viñeta narrativa (backstory) y un enunciado de intención en formato JTBD. La fuente de verdad es un conjunto de esquemas zod (`lib/profiles.ts:12-42`), persistidos como jsonb en la tabla `profiles` de Supabase.
2. **Un agente**: un LLM (Claude Sonnet 4.6 por defecto; Opus 4.7 solo para el Reasoner del chat, `lib/gateway.ts:18-22`) condicionado por un system prompt que serializa ese registro (`lib/prompts.ts:14-72`).

Lo que **no** es, y conviene decirlo en la primera conversación antes de que lo pregunten: **no existe ningún modelo computacional de conducta**. No hay funciones de utilidad, ni umbrales calculados, ni parámetros de muestreo (ninguna llamada del proyecto fija `temperature` ni `topP`; verificado por búsqueda global). Todos los constructos que siguen se operacionalizan como **instrucciones en lenguaje natural más esquemas de salida estructurada** (zod + `generateObject`): el LLM declara los valores, el sistema no los calcula. El término preciso es **medición declarativa simulada**, y así debe presentarse. El sistema es defendible como instrumento de cribado barato y rápido previo a la validación humana (que la propia base teórica fija como gold standard irrenunciable); presentado como simulación predictiva calibrada, no lo sería.

### Tabla síntesis: mecanismo real → constructo académico

| Mecanismo real | Constructo académico | Autores canónicos | Solidez de la operacionalización |
|---|---|---|---|
| `big_five` 0..1 en el prompt (%) | Modelo de los Cinco Factores | Costa y McCrae (1992); Goldberg (1990, 1993) | Media: rasgos válidos, efecto conductual no validado |
| HEXACO-24 del onboard | Modelo HEXACO; formato Brief HEXACO Inventory | Ashton y Lee (2007); Lee y Ashton (2004); De Vries (2013) | Media-baja: instrumento propio sin validación; mapeo E→N discutible |
| `com_b_barriers` | Modelo COM-B / Behaviour Change Wheel | Michie, van Stralen y West (2011) | Parcial: solo déficits, sin estructura interna ni BCTs |
| `intent_context` (JTBD) | Jobs To Be Done; job story | Christensen et al. (2016); Ulwick (2005); Klement (2013) | Alta como formato, sin validación de contenido |
| Vector Intent Momentum | Intención conductual; teoría de campo | Ajzen (1991); Fishbein y Ajzen (1975); Lewin (1936, 1951) | Baja como medida: juicio del LLM sin fórmula ni dinámica |
| Backstory / vignette | Método de viñetas; identidad narrativa | Alexander y Becker (1978); Rossi y Nock (1982); McAdams (1993) | Media: viñeta como identidad, no como diseño factorial |
| `social_friction` (lente del Reasoner) | Habitus y capital cultural; dominación simbólica | Bourdieu (1979) | Baja: declarativa, solo chat, sin validar (ver 3.4) |
| Óptima / fuga / repesca | Expectativa-valor; carga cognitiva; brecha intención-conducta | Kahneman (2011); Sweller (1988); Sheeran (2002) | Media: autoclasificación del propio agente |
| Talker-Reasoner | Procesamiento dual (Sistemas 1 y 2) | Kahneman (2011); Stanovich y West (2000); Christakopoulou, Mourad y Matarić (2024) | Alta como arquitectura, pero solo en el chat 1:1 |
| `effort` / `effort_ratio` | Customer Effort Score; esfuerzo percibido | Dixon, Freeman y Toman (2010) | Baja: media de juicios del LLM |
| Negative prompting | Características de demanda; deseabilidad social; sicofancia | Orne (1962); Crowne y Marlowe (1960); Sharma et al. (2023) | Alta como control por diseño |
| Cegado del brief; juez sin persona | Expectativa del experimentador; cegado | Rosenthal (1966) | Alta: es cegado real por diseño |
| Rúbricas por bandas | Escalas con anclajes conductuales (BARS) | Smith y Kendall (1963) | Alta como formato |
| Razonar antes de puntuar | Anclaje; elección basada en razones | Tversky y Kahneman (1974); Shafir, Simonson y Tversky (1993) | Media: mitigación plausible, no validada aquí |
| Pricing (`willingness_to_pay`) | Justicia de precio (NO disposición a pagar) | Kahneman, Knetsch y Thaler (1986); Xia, Monroe y Cox (2004) | Constructo mal etiquetado (ver 5.3) |
| GEO | Gatekeeping; flujo en dos pasos | White (1950); Katz y Lazarsfeld (1955) | Analogía sólida, medición nueva |
| Momentum/Triggers | Reconocimiento del problema y búsqueda de información; trigger | Engel, Kollat y Blackwell (1968); Howard y Sheth (1969); Fogg (2009) | Media (brecha de fidelidad cerrada en v0.72.3: ver 5.6) |
| Propiedad psicológica / aha moment | Propiedad psicológica; yo extendido; dotación | Pierce, Kostova y Dirks (2001, 2003); Belk (1988); Thaler (1980) | **No implementado**: solo doctrina |
| Instancias | Equifinalidad; comprensión weberiana del sentido | von Bertalanffy (1968); Weber (1922) | **No implementado**: solo doctrina |

---

## 1. Anatomía del perfil

### 1.1 El esquema (fuente de verdad: `lib/profiles.ts:12-42`)

| Campo | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `name` | string | Sí | Nombre del perfil («Lucía 34», «Marc Vidal») |
| `demographics.age` | entero | Sí | 0..120 a nivel base; el formulario y el CSV restringen a 18..99; los seeds a 18..85 |
| `demographics.gender` | string | Sí | Texto libre a nivel base; el formulario impone `hombre \| mujer \| otro` |
| `demographics.occupation` | string | Sí | Coloquial («diseñadora freelance»), no jerga de RRHH |
| `demographics.income_band` | string | No | Texto libre; vocabularios distintos por vía de creación (ver 1.5) |
| `demographics.geo` | string | No | Ciudad o CCAA; formato distinto por vía de creación |
| `big_five` | 5 números 0..1 | Sí | `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` |
| `com_b_barriers` | 3 arrays de strings | Sí (pueden ir vacíos) | `capability`, `opportunity`, `motivation`; texto libre, una barrera por línea |
| `backstory` | string | Sí | Mínimo 20 caracteres a nivel base; las vías generadas exigen 120-220, en tercera persona |
| `source` | string | No | Valores reales: `manual`, `llm_seed`, `self_report`, más los dos sets de investigación (`investigacion-publico-ivi-2026-06`, `investigacion-publico-adeslas-dental-2026-06`) |
| `intent_context` | string | No | El JTBD: «Cuando [situación], quiero [motivación] para poder [resultado]» (máx. 220 caracteres en generación por lote) |
| `avatar_url` | string \| null | No | Retrato IA (Vercel Blob); lo escribe solo `lib/avatar.ts` |

Persistencia: `demographics`, `big_five` y `com_b_barriers` como jsonb (`supabase/migrations/0001_initial.sql:17-27`); `intent_context` llegó con el Gravity Model (migración 0015), `deleted_at` con la papelera (0017) y `avatar_url` con los retratos (0024). El borrado es soft delete para proteger los runs históricos; el borrado duro en cascada solo existe desde la papelera (`lib/profiles.ts:171-203`).

### 1.2 Las cuatro vías de creación

Cada vía tiene un estatus epistémico distinto, y esa diferencia importa en cualquier conversación metodológica:

| Vía | Ruta | Quién decide los rasgos | `source` | Estatus epistémico |
|---|---|---|---|---|
| **Formulario manual** | `/profiles/new` | El humano que rellena el formulario | `manual` | Juicio experto (o arbitrariedad) del creador |
| **Importación CSV** | `/profiles/import` | Quien preparó el CSV (17 columnas canónicas, máx. 500 filas; `lib/profile-csv.ts:9-27`) | el del CSV | Ídem; reutiliza la validación exacta del formulario |
| **Generación LLM** | `/profiles/seed` | Opus 4.7 inventa los rasgos a partir de 50 briefs curados de demografía española (`lib/seed-profiles.ts:51-102`) | `llm_seed` | Verosimilitud narrativa, no medición: el LLM asigna la personalidad |
| **Onboard público («gemelo digital»)** | `/onboard` | **Psicometría real**: un humano contesta un HEXACO-24 y los rasgos se calculan en código, sin LLM (`lib/onboard.ts:17-30`) | `self_report` | La única vía con medición psicométrica de una persona real |

A las cuatro vías se suman los dos **sets calibrados con investigación**: 15 perfiles IVI (reproducción asistida) y 3 de Adeslas Dental, construidos con investigación multiagente verificada adversarialmente (14 y 16 verificadores respectivamente, con cifras tumbadas documentadas) e insertados por SQL. Su decisión de diseño más citable: **cero menciones de marca** en `intent_context`, backstory y barreras (verificado con query), para que los perfiles lleguen «vírgenes» a los tests (`docs/IVI-PUBLICO-OBJETIVO.md:58`).

La agregación posterior (medias de un run, conteos de conducta) **no distingue el origen de los perfiles**: un gemelo psicométrico y un personaje inventado por Opus pesan lo mismo en la media.

### 1.3 El retrato

`lib/avatar.ts` genera un retrato fotorrealista (Imagen 4, ~0,04 $) usando solo demografía y un «mood» derivado del neuroticismo (≥ 0,7: expresión cansada y digna; ≤ 0,5: calmada; intermedio: reservada). El nombre nunca viaja al prompt y la UI lo etiqueta como generado por IA. Dos decisiones de implementación relevantes para la sección 8.4: el género se binariza (todo lo que no matchea `hombre|varón|masculino` genera retrato de mujer, incluido «otro»; `lib/avatar.ts:29-30`) y la nacionalidad solo distingue española o francesa.

### 1.4 Segmentación y exportación

Los filtros del explorador operan por texto (AND de palabras, insensible a acentos), rango de edad y rango de cada rasgo Big Five (`lib/profile-filters.ts:49-103`). El haystack textual incluye nombre, ocupación, género, renta, geo, barreras COM-B y source, y **excluye deliberadamente la backstory**: la viñeta condiciona la simulación pero no es segmentable. No existen facetas dedicadas para COM-B ni para renta.

### 1.5 Inconsistencias conocidas entre vías (para no descubrirlas en la conversación)

- **Vocabularios de renta incompatibles**: seeds `<15k, 15-25k, 25-35k, ...`, onboard `<20k, 20-35k, ...`, formulario texto libre. Imposibilita segmentar por ingresos de forma fiable.
- **Rangos de edad por capa**: 0..120 (esquema base), 18..99 (formulario y CSV), 18..85 (seeds).
- **Backstory con tres estándares**: mínimo 20 (base), 80 con objetivo 120-220 (seeds y onboard). Un perfil manual puede entrar con viñeta casi vacía y degradar el grounding en silencio.
- **Género**: el onboard colapsa «no binario» y «prefiero no decirlo» en «otro» (`lib/onboard.ts:115-119`); el retrato binariza (1.3).
- **Formato de geo**: «ciudad, ES» (seeds) frente a nombre de CCAA (onboard).

---

## 2. Los cimientos psicológicos, componente a componente

### 2.1 Big Five (OCEAN): la capa de personalidad persistida

**Qué hay.** Cinco escalares continuos 0..1, inyectados en el system prompt como porcentajes: «Big Five: Apertura 70% · Conciencia 55% · ...» (`lib/prompts.ts:19-25`). El glosario castellano (`lib/big-five.ts`) orienta la lectura alto/bajo por rasgo. El neuroticismo además alimenta la expresión del retrato.

**Constructo.** El Modelo de los Cinco Factores: Costa y McCrae (1992, NEO-PI-R), Goldberg (1990, 1993). La elección es ortodoxa: es la taxonomía dominante en psicología diferencial y la más presente en el corpus de entrenamiento de los LLM, lo que probablemente maximiza el efecto del condicionamiento.

**Lo que la experta objetará.** (1) El eslabón rasgo→conducta es el más débil de la psicología de la personalidad (el «coeficiente de personalidad» de ~0,3 de Mischel, *Personality and Assessment*, 1968, y todo el debate persona-situación): aquí ese eslabón se delega íntegramente a la interpretación que el LLM haga de «Extraversión 40%», sin validación de que ese número module de forma monótona y calibrada el texto generado. (2) Los rasgos son escalares puntuales, no distribuciones ni facetas: un perfil es un centroide, no una persona muestreada de una población. (3) Los valores tienen tres orígenes con estatus epistémico muy distinto (sección 1.2) que la agregación no distingue.

### 2.2 HEXACO-24 y el mapeo a OCEAN: la única psicometría real del sistema

**Qué hay.** El onboard público administra 24 ítems Likert 1..5, cuatro por cada dimensión H/E/X/A/C/O, con 8 ítems invertidos (`lib/hexaco.ts:58-94`). El scoring es determinista y vive en código, no en el LLM: inversión `6 - raw`, media por dimensión, normalización `(media - 1) / 4` (`lib/hexaco.ts:117-136`). El mapeo a OCEAN también es determinista: O=O, C=C, X→Extraversión, A=A, y **Neuroticismo = Emocionalidad HEXACO directa, sin invertir** (`lib/hexaco.ts:144-152`; Emocionalidad alta se lee como Neuroticismo alto, decisión ratificada en `docs/ROADMAP.md:387`). Honestidad-Humildad no se persiste como rasgo (Big Five solo tiene cinco): se pasa al LLM como contexto para que se refleje narrativamente en la backstory cuando es claramente alta o baja.

**Constructo.** El modelo HEXACO de Ashton y Lee (2007; Lee y Ashton 2004, HEXACO-PI). El formato de 24 ítems con 4 por dimensión replica el Brief HEXACO Inventory de De Vries (2013), y al menos un ítem es adaptación reconocible del banco original (h2, el ítem de integridad sobre «robar millones»). La decisión de calcular los rasgos en código y **prohibir al LLM recalcularlos** («Los rasgos Big Five ya están CALCULADOS, no los recalcules», `lib/onboard.ts:225-240`) es metodológicamente elogiable: separa medición psicométrica de generación narrativa.

**Lo que la experta objetará.** (1) Instrumento propio sin validación: sin fiabilidad (alfa/omega con 4 ítems por escala suele ser pobre), sin invarianza, sin baremos. (2) El mapeo Emocionalidad→Neuroticismo es la decisión psicométrica más discutible: correlacionan pero no son isomorfos (en HEXACO la ira carga en Amabilidad baja y la sentimentalidad de E no tiene contraparte en N; Ashton y Lee lo tratan como una rotación del espacio factorial, no una identidad). (3) Descartar H de la persistencia es irónico: la aportación diferencial de HEXACO es precisamente Honestidad-Humildad (predictor de integridad y materialismo); aquí sobrevive solo como matiz narrativo. (4) Las 24 respuestas crudas no se persisten en el perfil: no hay re-scoring ni auditoría posible a posteriori.

### 2.3 COM-B: el diagnóstico de barreras

**Qué hay.** Tres arrays de texto libre (`capability`, `opportunity`, `motivation`), inyectados como línea «Barreras COM-B: Capacidad: ...; Oportunidad: ...; Motivación: ...» en el prompt de persona. El Reasoner del chat debe citar las barreras activas por turno indicando el eje (`lib/agents.ts:24-28`). Se rellenan a mano (una por línea), por el LLM en seeds (1..4 por eje) o por el LLM del onboard anclado en frases textuales del usuario (1..3 por eje).

**Constructo.** El modelo COM-B de Michie, van Stralen y West (2011, «The behaviour change wheel», *Implementation Science*): la conducta emerge de la interacción de Capacidad, Oportunidad y Motivación. La elección es acertada para UX/CRO porque COM-B nació exactamente para diagnosticar por qué una conducta objetivo no ocurre.

**Lo que la experta objetará.** (1) La operacionalización usa **solo la mitad deficitaria del modelo**: COM-B define capacidades y oportunidades también como habilitadores, y aquí solo existen listas de barreras. (2) Se pierde la estructura interna: no hay distinción capacidad física/psicológica, oportunidad física/social, ni motivación reflexiva/automática (esta última, central en Michie y muy conductual-económica, desaparece). (3) No hay vínculo con la rueda de intervenciones ni con la taxonomía de técnicas de cambio conductual (Michie et al. 2013, BCT Taxonomy v1): el sistema diagnostica barreras pero no mapea remedios de forma estructurada. (4) Al ser texto libre, la agregación de barreras se hace por normalización superficial de strings, no por constructo.

### 2.4 `intent_context`: el JTBD como variable del perfil

**Qué hay.** Un enunciado por perfil con formato instruido «Cuando [situación], quiero [motivación] para poder [resultado]», inyectado como bloque «## Contexto de intención (JTBD)» en todas las llamadas con perfil (`lib/prompts.ts:60-62`). Existe generación en lote (`/api/profiles/batch-intent`, máximo 220 caracteres).

**Constructo.** Jobs To Be Done: Christensen, Hall, Dillon y Duncan (*Competing Against Luck*, 2016) y la tradición de Ulwick (2005). Matiz filológico que una experta apreciará: la plantilla exacta no es de Christensen sino la *job story* de Alan Klement popularizada por Intercom (2013). El movimiento de fondo (segmentar por circunstancia e intención, no por demografía) tiene pedigrí anterior: Yankelovich (1964, «New Criteria for Market Segmentation», *HBR*). Conecta además con Ajzen: el JTBD funciona aquí como el requisito de correspondencia (acción, objetivo, contexto) que la teoría de la conducta planificada exige para que la intención prediga conducta.

**Lo que la experta objetará.** Un job por perfil, único y estático: sin jerarquía funcional/emocional/social (central en Christensen), sin múltiples jobs por persona, sin fuerzas de progreso (push/pull/ansiedad/hábito). Y la «hipersegmentación» es doctrinal: no existe la entidad segmento en el código, solo el campo textual por perfil (los 12 segmentos de IVI viven en documentación).

### 2.5 Backstory: la viñeta como identidad

**Qué hay.** Narrativa obligatoria en tercera persona («una rutina concreta + un dolor + una motivación», `lib/seed-profiles.ts:42-47`; en el onboard, con frases textuales del humano). Se inyecta íntegra bajo «## Tu historia». Los sets de investigación cierran cada backstory con una frase «Se informa en...» para codificar canales, porque el esquema no tiene campo de canales.

**Constructo.** El método de viñetas de la investigación por encuestas: Alexander y Becker (1978), Rossi y Nock (1982, *Measuring Social Judgments: The Factorial Survey Approach*). La base teórica del proyecto lo llama «Grounded Modeling»: datos estructurados + vignette. Como recurso de identidad simulada conecta con la identidad narrativa de McAdams (1993, *The Stories We Live By*). **Lectura sociológica defendible**: las backstories codifican de facto posiciones de clase y capital cultural (banda de renta, «baja alfabetización digital», «llamadas mejor que mensajes», ciudad de provincia frente a capital), es decir, un habitus folk en el sentido de Bourdieu (*La Distinction*, 1979). Desde v0.63.5 esa lectura deja de ser solo implícita: el Reasoner del chat emite una lente de **fricción simbólica** (`social_friction`) que evalúa disonancia de clase y legitimidad leyendo el habitus del perfil (ver 3.4). Sigue siendo **operacionalización parcial y declarativa** (un juicio del LLM, solo en el chat, sin variable estructural de capital/campo/trayectoria en el esquema ni validación), no una medida; pero ya no es mera inspiración.

**Lo que la experta objetará.** (1) En la tradición de Rossi la viñeta es un **diseño experimental**: se varían sistemáticamente sus dimensiones para estimar los pesos del juicio. Aquí la viñeta es carga de identidad fija; no hay diseño factorial en ningún módulo. (2) El mínimo real son 20 caracteres: el grounding puede degradarse en silencio con perfiles manuales. (3) La viñeta condiciona la simulación pero está excluida del buscador (1.4).

---

## 3. Los constructos dinámicos

### 3.1 Intent Momentum: el vector {intensidad, dirección, velocidad}

**Qué hay.** Dos superficies. (a) En el chat, el Reasoner (Opus) emite por turno `momentum {intensity 0..1, direction approaching|stable|drifting, velocity accelerating|steady|decelerating}`, descrito literalmente como «Intent Momentum del usuario en este turno (Gravity Model)» (`lib/agents.ts:45-65`). (b) En el módulo Momentum/Triggers, una llamada por perfil emite el mismo vector más narrativa, primeros pasos, canales, barreras y el JTBD en palabras del propio perfil (`lib/momentum.ts:63-106`). **No existe fórmula determinista en ningún sitio**: los tres componentes son salida estructurada del LLM guiada por descripciones zod.

**Constructo.** Dos capas. La primera es la **intención conductual** de la teoría de la acción razonada/planificada: Fishbein y Ajzen (1975), Ajzen (1991). La `intensity` 0..1 es una operacionalización directa de la fuerza de la intención, el predictor proximal de la conducta en TPB; las barreras COM-B juegan el papel del control conductual percibido. La segunda capa, y es la genealogía más precisa de la metáfora completa, es la **teoría de campo de Kurt Lewin** (*Principles of Topological Psychology*, 1936; *Field Theory in Social Science*, 1951): la conducta como resultante de fuerzas con valencia, dirección y magnitud en un espacio vital. La formalización «la intención es un vector, la marca ejerce atracción, el usuario orbita» es lewiniana casi término a término. Es el ancla académica más legítima del Gravity Model y conviene citarla como tal.

**Lo que la experta objetará.** (1) Es una medida declarada por el modelo, no derivada: sin validación de consistencia entre ejecuciones ni calibración contra intención humana. (2) `velocity` presupone dinámica temporal, pero el Reasoner no tiene memoria de sus propios estados: el historial que ve solo contiene turnos humano y Talker (`app/api/chat/route.ts:79-86`), así que estima una derivada sin serie temporal. (3) En el chat, el vector se calcula con Opus cada turno pero no influye en nada: no pasa al Talker ni se persiste como métrica agregada; solo se pinta en la UI. (4) El propio proyecto declara el hueco de la trayectoria temporal (`GRAVITY-MODEL.md`, conceptos sin implementación).

### 3.2 Conductas óptima / fuga / repesca

**Qué hay.** Enum `behavior_class` con tres valores, **autoclasificado por el propio agente** («Clasifica TU propia conducta», `lib/experiments/five-second.ts:54-58`). Existe en dos módulos con el mismo enum y criterio operacional distinto:

| Módulo | óptima | fuga | repesca |
|---|---|---|---|
| Claridad 5s | Entendió el mensaje y seguiría hacia la acción | Carga cognitiva o promesa poco clara: abandonaría | Dudas, pero la intención sigue viva: recuperable |
| Campañas | Conecta con su intención: haría click | Ignora el anuncio y sigue con lo suyo | Sin click ahora, pero la necesidad sigue viva |

En ambos, NULL significa «sin clasificar» (filas anteriores al Gravity Model). En embudos, copy y pricing la taxonomía no existe: el embudo colapsa fuga y repesca en un booleano `would_continue`.

**Constructo.** La taxonomía discretiza tres marcos: **fuga** es un juicio de expectativa-valor (la formulación «coste percibido > beneficio esperado» es utilidad esperada subjetiva en lenguaje llano; el mecanismo invocado, la carga cognitiva, es Sweller 1988); **óptima** corresponde a la facilidad cognitiva (el *cognitive ease* de Kahneman 2011); **repesca** es la clase teóricamente más interesante: nombra la **brecha intención-conducta** (Sheeran 2002), intención viva sin acción.

**Lo que la experta objetará.** (1) Es un autoinforme del simulacro: el mismo agente que percibe clasifica su conducta, sin observación conductual independiente. El único control de coherencia del sistema es `behavior_inconsistencies` en campañas (fuga con `intent_to_click ≥ 0,5` u óptima con `< 0,3`; umbrales hard-coded, `lib/experiments/campaign.ts:2335-2338`). (2) La semántica cambia por módulo bajo el mismo nombre: adaptación deliberada, pero rompe la comparabilidad si no se explicita. (3) Ningún módulo cruza `behavior_class` con el vector momentum: las dos piezas centrales del Gravity Model nunca se encuentran en los datos.

### 3.3 `effort` y `effort_ratio`

**Qué hay.** El Reasoner emite `effort` 0..1 por turno («0 = fluido, 1 = a punto de abandonar»); la métrica de sesión `effort_ratio` es la media aritmética de esos valores (`app/api/chat/route.ts:182-195`). El embudo pide `effort` por paso.

**Constructo.** El Customer Effort Score trasplantado al agente (Dixon, Freeman y Toman 2010, «Stop Trying to Delight Your Customers», *HBR*), con la carga cognitiva de Sweller como sustrato. La tesis original (el esfuerzo predice deslealtad mejor que la satisfacción) justifica el uso del esfuerzo como proxy de abandono.

**Lo que la experta objetará.** El CES original es un ítem autoinformado por clientes reales tras una interacción real; aquí es un juicio del LLM sobre una fricción simulada, promediado. La etiqueta «métrica predictiva de abandono» de la base teórica es aspiracional: no hay validación predictiva contra abandono real.

### 3.4 `social_friction`: la lente de fricción simbólica (habitus)

**Qué hay.** Desde v0.63.5 el plan del Reasoner incluye un objeto `social_friction` con `intensity` 0..1, `trigger` y `habitus_note` (`lib/agents.ts`). Es la capa **macrosociológica** que faltaba: más allá de las barreras funcionales COM-B, evalúa si el registro de la interacción (tono, jerga, peticiones de datos, trato de la marca) genera disonancia de clase, exclusión cultural o pérdida de legitimidad, leyendo el habitus y el capital cultural del perfil. Se pinta en el panel «Razonamiento» del chat y, cuando es alta, el Reasoner la refleja en `plan` para que el Talker la module en la voz del perfil (no se inyecta al Talker por una vía nueva: viaja por el `plan` existente).

**Constructo.** El habitus y el capital cultural de Bourdieu (*La Distinction*, 1979); la «ruptura de simetría de clase» ante una táctica extractiva es un caso de dominación simbólica. Verificado en vivo (19-jul-2026): ante la captura de lead «teléfono por PDF», Lucía Sáez (capital cultural alto, metódica) produjo `social_friction.intensity 0,7` con `habitus_note` «lee el gate del PDF como táctica comercial poco seria, impropia de un servicio médico», y el turno viró a momentum `drifting/decelerating` y tono escéptico; ante un saludo neutro, 0,2.

**Lo que la experta objetará.** (1) Solo existe en el **chat 1:1** (donde vive el Reasoner), no en los tests por lotes donde se decide el CRO. (2) Es **medición declarativa simulada**: otro juicio del LLM sin verdad de terreno; añade una lente constructual, no rigor empírico. (3) Mide fricción **simbólica** (clase, legitimidad), no la **relacional** (prueba social, fuerza de lazos de Granovetter), que sigue sin operacionalizarse. Para ser una señal de conversión debería llevarse a los esquemas de los experimentos y validarse contra juicio experto. Hueco de roadmap, no capacidad consolidada.

---

## 4. Cómo habla el perfil: la arquitectura de simulación

### 4.1 `buildSystemPrompt`: la única voz del perfil

`lib/prompts.ts:14-72` serializa el registro en un system prompt con esta estructura, en este orden: identidad y anti-ruptura de rol («Eres {name}. Hablas siempre en primera persona como este usuario, NUNCA como un asistente de IA, ni meta-comentas sobre el hecho de ser una simulación»); «## Quién eres» (demografía en una línea, Big Five en porcentajes, barreras COM-B); «## Tu historia» (backstory literal); «## Cómo te comportas» (siete reglas de conducta, ver 4.3); «## Contexto de intención (JTBD)» si existe; y «## Antipatrones» («No suenes como ChatGPT», «No empieces con "Como [perfil]..."», «No expliques tu razonamiento meta», «No idealices ni dramatices: actúa como una persona real con un nivel de energía limitado»).

Es la vía de inyección de **todos** los experimentos con runs (5s, A/B, embudos, copy, pricing, campañas) y del chat. La única excepción es el módulo Momentum (ver 5.6). Los campos `source` y `avatar_url` nunca entran en ningún prompt.

### 4.2 Talker-Reasoner: procesamiento dual, pero solo en el chat

**Qué hay.** Solo en el chat 1:1: `reason()` (Opus, `generateObject`) produce un plan estructurado por turno (estado percibido, intención, barreras COM-B activas, tono de un enum de 7, effort, momentum y una pauta interna); `talkStream()` (Sonnet, `streamText`) responde en voz del perfil con el plan inyectado en su system (`lib/agents.ts:86-158`). Del plan solo pasan al Talker estado, intención, tono, barreras y pauta; **effort y momentum no**. Los planes se persisten como trazas de Chain-of-Thought pero jamás se re-inyectan al contexto.

**Constructo.** El procesamiento dual de Kahneman (*Thinking, Fast and Slow*, 2011; formalizado por Stanovich y West 2000), mediado por el paper «Agents Thinking Fast and Slow: A Talker-Reasoner Architecture» (Christakopoulou, Mourad y Matarić, Google DeepMind, 2024), que la base teórica describe sin citar formalmente.

**Lo que la experta objetará.** (1) Cobertura: la arquitectura dual existe en un solo módulo de ocho; los experimentos batch son una sola pasada que colapsa deliberación y expresión. (2) Sin continuidad de estado interno: cada turno re-infiere energía, emoción y momentum desde el texto visible; el cansancio acumulado (el «ruido emocional» cuya ausencia la propia base teórica lista como riesgo) no puede acumularse por diseño. (3) La analogía Sistema 1/2 es arquitectural, no cognitiva: nada garantiza que Opus razone «lento» y Sonnet responda «intuitivo» en el sentido de Kahneman; son dos LLM con prompts distintos.

### 4.3 Los controles experimentales (lo mejor del sistema)

Cuatro mecanismos que son metodología experimental genuina y conviene reivindicar como tales:

1. **Negative prompting** (`lib/prompts.ts:55-58`): «NO eres servicial ni complaciente: si algo no te interesa, lo dices», «Eres escéptico ante el marketing y las promesas grandilocuentes; pides pruebas», «NO inventes funcionalidades del producto que se está testando». Es el análogo directo del control de **características de demanda** (Orne 1962: el sujeto experimental intenta complacer al investigador) y de la **deseabilidad social** (Crowne y Marlowe 1960), trasladado al sesgo específico de los LLM: la sicofancia (Sharma et al. 2023). Límite: es prevención por prompt sin detección a posteriori; no existe clasificador de ruptura de rol ni de complacencia residual.
2. **Cegado del brief** (`lib/experiments/campaign.ts:1141-1144`): el brief del anunciante no se inyecta jamás al agente-persona (el código lo justifica citando el sesgo de cámara de eco de la base teórica); solo alimenta al **juez neutral sin persona**. Cerebro respeta la misma regla: el contexto de marca no entra en los tests a ciegas (5s, embudos) ni en la sonda desnuda del GEO. Es cegado experimental genuino: control de la expectativa del experimentador (Rosenthal 1966). Junto con el scoring determinista del onboard, la decisión metodológica más sólida del sistema.
3. **Rúbricas por bandas**: los scores 0..1 llevan anclajes conductuales por tramo («0,0-0,2 lo ignorarías por completo; ... 0,8-1,0 click casi seguro») con instrucción anti-tendencia-central («No te refugies en valores medios») y anti-clemencia («Sé estricto con jerga... No premies adivinanzas»). Formalmente son **escalas con anclajes conductuales** (BARS: Smith y Kendall 1963), la respuesta clásica de la psicometría industrial a la tendencia central del evaluador.
4. **Orden razón→número** (`lib/experiments/campaign.ts:82-93`): el esquema de salida genera percepción y razonamiento ANTES de los scores «para que el número salga del texto y no al revés». Mitigación de **anclaje** (Tversky y Kahneman 1974) emparentada con la elección basada en razones (Shafir, Simonson y Tversky 1993), aunque la motivación documentada en el código es técnica (el clustering de valores medios observado en LLM).

Límite común: ninguna de estas mitigaciones está validada dentro del sistema (no hay comparación con/sin rúbrica ni test del orden de claves); son buenas prácticas heredadas de la literatura de LLM-as-judge aplicadas por diseño.

**Endurecimiento posterior (v0.62.0 y v0.63.0), para no leer el motor como el de v0.61.15.** Desde v0.62.0, `buildSystemPrompt` sanea `backstory`, barreras COM-B e `intent_context` con los guardarraíles anti-inyección (`sanitizeInline`: recorte por fuente y neutralización de delimitadores; `lib/prompts.ts:1,30,49,61`), de modo que las piezas importables (CSV, onboard) entran como caracterización y no como instrucciones ejecutables. Desde v0.63.0, Momentum y GEO recuperan el contexto de marca de Cerebro por RAG (pgvector con `openai/text-embedding-3-small`, `lib/rag.ts`, migración 0029) en lugar del volcado íntegro, con fallback al modo legado; el cegado del brief y la exclusión de documentos `sensitive` se mantienen intactos.

---

## 5. El perfil en cada módulo: tabla de fidelidad

La uniformidad que sugiere «los perfiles se inyectan en todo» tiene excepciones que conviene conocer de memoria:

| Módulo | ¿`buildSystemPrompt` completo? | Arquitectura | Conductas ó/f/r | Vector momentum | Nota |
|---|---|---|---|---|---|
| Chat 1:1 | Sí | **Talker-Reasoner** (Opus + Sonnet) | No | **Sí, por turno** (inerte: no pasa al Talker ni se agrega) | El único módulo dual; único que emite `social_friction` (3.4) |
| Claridad 5s | Sí | Una pasada + juez sin persona | **Sí** (autoclasificada) | No | La «exposición de 5 s» es ficción del prompt, no límite físico |
| A/B | Sí (hereda del 5s) | Dos runs 5s en paralelo, misma muestra | Sí | No | Análisis emparejado en la vista |
| Embudos | Sí | Una pasada por paso, secuencial con dropoff real | No (`would_continue` booleano) | No | Memoria episódica de pasos previos en el prompt |
| Copy | Sí | Una pasada por bloque | No | No | `sentiment`, `clarity`, `persuasion`, `would_click` |
| Pricing | Sí | Una pasada por precio | No | No | `willingness_to_pay` mide justicia de precio, ver 5.3 |
| Campañas | Sí | Snippet + landing condicional + juez + versión ideal | **Sí** (semántica de ads) | No | El módulo con más controles (cegado, rúbricas, muestreo determinista) |
| **Momentum/Triggers** | **Sí** (desde v0.72.3) | Una pasada por perfil | No | **Sí, por escenario** | Antes usaba persona reducida; desde v0.72.3 usa `buildSystemPrompt` completo |

### 5.3 Pricing: el constructo mal etiquetado

El campo `willingness_to_pay` se define en el prompt como «cómo de justo te parece ese precio (1 = totalmente justo, 0 = abuso)» (`lib/experiments/pricing.ts:77`). **Eso no es disposición a pagar: es justicia de precio percibida**, el constructo de Kahneman, Knetsch y Thaler (1986, «Fairness as a Constraint on Profit Seeking») y Xia, Monroe y Cox (2004, «The Price Is Unfair!»). La WTP canónica se mide con mecanismos de compatibilidad de incentivos (Becker, DeGroot y Marschak 1964) o con Van Westendorp (1976); nada de eso existe aquí. Sí son legítimos: el `anchor_price` opcional como manipulación explícita de anclaje, y el `sweet_spot = max(would_buy_rate × price)` como argmax de ingreso esperado sobre 2..8 precios, que es una heurística útil pero **no** la «curva de elasticidad vía Monte Carlo» que promete la base teórica (no hay Monte Carlo ni estimación de elasticidad). Re-etiquetado en la UI (v0.72.2): en la vista del run el chip pasa de «WTP» a «Justo», con tooltip y leyenda que aclaran «cómo de justo le parece el precio (1 = justo, 0 = abuso), no disposición a pagar»; el campo interno conserva el nombre `willingness_to_pay` por compatibilidad de datos.

### 5.6 Momentum/Triggers: persona completa (brecha de fidelidad cerrada en v0.72.3)

**Hasta v0.72.2** el módulo canónico del Intent Momentum construía su propia persona ad hoc con solo edad, género, ocupación, geo, backstory y JTBD, **omitiendo Big Five, COM-B, renta y todos los negative prompts anti-complacencia**: era la brecha de fidelidad más grave (el módulo estrella del constructo estrella ignoraba la mitad de la calibración y el control anti-sicofancia). **Desde v0.72.3 usa `buildSystemPrompt(profile)`** como base (la misma voz canónica que el resto de módulos con run), así que ya inyecta Big Five, COM-B, backstory, JTBD y los negative prompts; sobre esa voz completa monta las instrucciones de la tarea (`lib/momentum.ts`). Verificado en producción: las barreras del resultado citan ahora las barreras COM-B del propio perfil. Además, su promesa «antes de que ninguna marca entre en el radar» solo vale en el caso por defecto: el challenge acepta un `brand_context` opcional que sí se inyecta («## Contexto de marca», `lib/momentum.ts:147-149`), y desde v0.59-v0.60 el selector de Cerebro lo rellena de forma sistemática. El módulo tiene por tanto dos modos que la interpretación debe distinguir: momentum desnudo (pre-marca) y momentum con gravedad de marca. Constructos aplicables: reconocimiento del problema y búsqueda de información de los modelos clásicos de conducta del consumidor (Engel, Kollat y Blackwell 1968; Howard y Sheth 1969) y el trigger del modelo B=MAP de Fogg (2009): el módulo mide exactamente motivación (intensity) y disparador (trigger_scenario), con las barreras como inverso de la capacidad.

---

## 6. Doctrina sin implementación (no presentar nunca como capacidad)

- **Propiedad psicológica y aha moment.** El constructo existe y es citable: propiedad psicológica (Pierce, Kostova y Dirks 2001, 2003: el estado en que el objeto se siente «mío»), el yo extendido de Belk (1988) y, en la vertiente conductual, el efecto dotación (Thaler 1980; Kahneman, Knetsch y Thaler 1990). El «aha moment» en sí es vocabulario de growth, no academia. Estado real: **cero implementación** (el Value Plane no tiene módulo).
- **Instancias.** La distinción perfil comportamental / instancias («mismo comportamiento observable, orígenes y palancas distintos») tiene dos anclas: la **equifinalidad** de la teoría de sistemas (von Bertalanffy 1968) y la comprensión weberiana del sentido (*Verstehen*, Weber 1922): la misma conducta observable exige interpretar el sentido subjetivo que la produce. Estado real: **no implementado**; la unidad real del sistema es el perfil individual.
- **Gravedad agregada y serie temporal del momentum.** La metáfora física completa (gravedad como fuerza acumulada de una cohorte) no tiene métrica, y el vector no se traza en el tiempo. La metáfora orbital debe presentarse como marco retórico-estratégico cuyo pariente académico legítimo es la teoría de campo de Lewin, no como modelo formal: no hay ni una ecuación en el sistema.

---

## 7. Qué citar y qué no ante la experta

**Citables con solidez** (el mecanismo real los respalda): Michie et al. 2011 (COM-B), Kahneman 2011 + Stanovich y West 2000 (dual-process, vía Christakopoulou et al. 2024), Ashton y Lee 2007 (HEXACO), Costa y McCrae 1992 (FFM), Ajzen 1991 (intención), Lewin 1936/1951 (teoría de campo, el ancla del Gravity Model), Sheeran 2002 (repesca como brecha intención-conducta), Orne 1962 + Sharma et al. 2023 (negative prompting), Rosenthal 1966 (cegado), Smith y Kendall 1963 (rúbricas BARS), Kahneman, Knetsch y Thaler 1986 (lo que pricing mide de verdad).

**Citables solo con reservas explícitas**:

- **Christensen (JTBD)**: sí, pero la plantilla operativa es la job story de Klement/Intercom, y la segmentación por jobs no existe como entidad de datos.
- **Bourdieu**: citable con matiz. El habitus está codificado de facto en las viñetas y, desde v0.63.5, parcialmente operacionalizado por la lente `social_friction` del Reasoner del chat (fricción simbólica, disonancia de clase; ver 3.4). Sigue siendo declarativo y solo en el chat, sin variable estructural de capital/campo en el esquema: preséntese como operacionalización parcial, no como medida validada.
- **Goffman**: aplicable solo como analogía del mecanismo de simulación (el system prompt define la situación y el guion; las reglas anti-ruptura son mantenimiento dramatúrgico del rol), no del usuario simulado.
- **Zero Moment of Truth (Lecinski 2011) y consumer decision journey (Court et al. 2009, McKinsey)**: parientes de industria de la tesis «la decisión se forma antes del clic»; citarlos como marcos de industria, no como academia.

**No citables** (sobreventa detectable):

- **Cialdini**: ninguno de los seis principios existe como variable, manipulación o rúbrica en el código.
- **Granovetter**: la dimensión relacional (prueba social, fuerza de lazos) sigue **sin operacionalizar**; la lista `channels` de Momentum no modela red, solo strings, y la lente `social_friction` (3.4) es simbólica, no relacional. Queda como hueco de roadmap: no citar como implementado.

*Actualización de estatus*: las **cifras de validación** de la base teórica (89,7%, 71,4%, la preferencia de expertos en ciego) y la encuesta N=1.093 **ya están rastreadas a su fuente primaria** (Yun et al. 2025 y User Interviews 2023) en `CONOCIMIENTO-USUARIOS-SINTETICOS.md` §2, que además corrige las atribuciones erróneas de Ishii, Stegbauer y Bouzit. Ya son citables; el aviso anterior de «sin referencia» está resuelto.

---

## 8. Las críticas que llegarán (y cómo responderlas con honestidad)

### 8.1 Circularidad LLM

*La crítica*: el mismo modelo (o la misma familia) genera los perfiles (Opus inventa Big Five y COM-B en seeds), los actúa (Sonnet) y los juzga (sonda y juez del 5s comparten `DEFAULT_MODEL`). Las «barreras detectadas» pueden ser regularidades del modelo, no de la población: el sistema podría estar midiendo la teoría implícita de la conducta que tiene Claude.

*Respuesta honesta*: es cierto y no está mitigado por modelo externo. Mitigaciones parciales citables: el onboard rompe el círculo en los rasgos (calculados desde respuestas humanas, sin LLM), los sets IVI/Adeslas se calibraron con verificación adversarial de datos, y la doctrina fija la validación humana como gold standard final. Mitigación ausente: jueces de otra familia de modelos.

### 8.2 Ausencia de varianza distribucional: perfiles como caricaturas

*La crítica*: sin temperatura ni muestreo explícito, sin self-consistency ni verbalized sampling, cada perfil es un punto, no una distribución: N perfiles no son una muestra, son N estereotipos cuidados. La literatura reciente documenta exactamente este riesgo de caricaturización y aplanamiento de la varianza intra-grupo en simulación con LLM (Cheng, Durmus y Jurafsky 2023; la homogeneización de Bommasani et al. 2022).

*Respuesta honesta*: correcto. El sistema mitiga por diversidad de diseño (50 briefs curados, «sin clones optimistas»), no por muestreo. Los agregados (medias, tasas, `intent_stddev`) deben leerse como dispersión entre personajes, no como varianza poblacional.

### 8.3 Validez ecológica

*La crítica*: las exposiciones son ficciones instruidas (los «5 segundos» no limitan nada físicamente; la restricción de memoria es obediencia instruida, no un mecanismo atencional), no hay fatiga ni coste de oportunidad real, y la conducta terminal es siempre una declaración. La brecha intención-conducta aplica dos veces: dentro del simulacro y entre el simulacro y el humano.

*Respuesta honesta*: cierto. A favor: framings naturalistas por placement en campañas («decides en menos de 2 segundos si sigues deslizando»), truncados del copy como los ve un usuario real, memoria episódica secuencial en embudos con abandono que corta de verdad el recorrido, y el muestreo determinista de estímulos por sujeto (reproducibilidad del estímulo, un control experimental genuino).

### 8.4 WEIRD y erosiones de diversidad

*La crítica*: Henrich, Heine y Norenzayan (2010). Un modelo entrenado mayoritariamente en inglés simulando a una autónoma de Toledo con baja alfabetización digital añade una capa de traducción cultural no medida. Y decisiones de implementación erosionan la diversidad declarada: el retrato binariza el género, el onboard colapsa «no binario» y «prefiero no decirlo» en «otro», y los vocabularios de renta son incompatibles entre vías.

*Respuesta honesta*: el sesgo WEIRD-estadounidense por defecto se mitiga con seeds deliberadamente españoles (demografía tipo INE, castellano coloquial), pero la capa de traducción cultural del modelo es real y no está medida. Las erosiones de implementación son deuda reconocida.

### 8.5 El grounding real no es VoC primaria

*La crítica*: el pilar 1 de la base teórica exige calibración con Voz del Cliente primaria (transcripciones, reseñas); los sets reales se calibraron con investigación secundaria verificada (registros sectoriales, INE, OCU, comparadores).

*Respuesta honesta*: es un grounding serio pero de otra especie: conocimiento de mercado verificado adversarialmente, no evidencia conductual de primera mano. La ingesta desde VoC o datasets conductuales (el comment de BD que promete `dataset:lifesnaps` nunca se materializó) sigue siendo decisión abierta del roadmap.

### 8.6 Fortalezas genuinas que reivindicar

Para equilibrar la conversación: (1) cegado real del brief y jueces sin persona; (2) psicometría determinista en el onboard con el LLM restringido a costurero narrativo y prohibición explícita de inventar; (3) rúbricas BARS y orden razón→score como controles del sesgo del juez; (4) muestreo determinista de estímulos por sujeto; (5) chequeo de consistencia interna `behavior_inconsistencies`; (6) descontaminación de marca verificada con query en los sets de investigación; (7) el reconocimiento explícito y público de los huecos entre doctrina e implementación, que es exactamente el tipo de honestidad que una revisora académica premia.

### 8.7 Hallazgos de fidelidad medidos (sesión 2026-07-22)

Registro fechado de lo aprendido al llevar el juez de calidad (OpenAI, otra familia que el objetivo Anthropic, para romper la circularidad de §8.1) a los módulos y refinar sus prompts. Todo verificado con runs reales en producción. Metodología del juez: puntúa fidelidad de rol, anclaje en el perfil, no complacencia y naturalidad (0..1), con orden razón→score. Es medición declarativa simulada (juez = otro LLM), no valida contra humanos; sirve para comparar y cazar regresiones.

- **La fidelidad puede estar presente pero oculta al juez (Recall 5s, `v0.74.1`)**: el recuerdo crudo de un vistazo de 5 s es casi idéntico entre perfiles (todos ven «bebé + IVI Madrid + seminograma»); el filtro del perfil vive en `barriers_detected` (Hélène: «seminograma parece para hombres cuando busco ovodonación», «atención en francés»; Patricia: «IVI es cadena de fondo de inversión, me chirría»). Juzgar solo recall + oferta percibida daba anclaje ~0,2 («genérico»); pasar al juez también las barreras subió el anclaje a ~0,9 y el global a ~0,89. No fue gaming: era una medición incompleta. Lección: el juez debe recibir la reacción COMPLETA, no solo la parte más visible.
- **Instrucciones que inducen estructura leen como «robótico» (Campañas `v0.74.2`, Momentum `v0.74.3`/`v0.75.0`)**: «qué te llama, qué te frena» producía un pro/contra ordenado (naturalidad ~0,71, fallo «robótico»); pedir una reacción de primer impulso en su voz la subió a ~0,79-0,88. En Momentum, además, pasar al juez la narrativa MÁS las listas (`first_steps`, barreras) hacía leer todo como un formulario; juzgar solo la voz (relato + necesidad + frenos) y avisar de que los frenos vienen en lista subió la naturalidad de ~0,72 a ~0,88-0,91.
- **El juez discrimina fórmula de manual vs JTBD anclado (Intent `v0.74.4`/`v0.76.0`)**: un JTBD rico y anclado puntúa global ~0,87 (anclaje 0,99); un JTBD formulaico de una frase, ~0,44 (anclaje 0,42, naturalidad 0,38, «genérico»). El prompt de generación anti-fórmula (`v0.74.4`) ataca justo esa brecha.
- **No todos los módulos tienen voz de perfil (GEO `v0.74.5`)**: la sonda GEO es desnuda (sin persona, por diseño); su lever de realismo es que la query sea conversacional (como se habla a un asistente IA), no keyword de Google. Ahí no hay juez de calidad de simulación, sino guía de la query.
- **Regla transversal de medición**: al juez de fidelidad se le pasa la VOZ del perfil (relato, oferta percibida, JTBD) más las barreras/frenos (donde vive el filtro), pero NO los campos mecánicos (planes en lista, scores), y se le recuerda que la comprensión/el acierto del contenido se miden aparte. Confundir fidelidad con comprensión o penalizar el formato de la herramienta produce lecturas falsamente bajas.

---

## 9. Guion de síntesis para la conversación

1. El perfil es un registro estructurado (FFM + COM-B + viñeta + JTBD) que condiciona a un LLM; no hay modelo computacional de conducta detrás. Todo es medición declarativa simulada.
2. La elección de marcos es ortodoxa y coherente: FFM/HEXACO para disposiciones, COM-B para barreras, JTBD/TPB para intención, dual-process para la arquitectura de conversación.
3. El ancla académica del Gravity Model es la teoría de campo de Lewin: intención como vector con intensidad, dirección y magnitud en un espacio de fuerzas.
4. La única psicometría real del sistema es el onboard: HEXACO-24 con scoring determinista en código y el LLM prohibido de recalcular rasgos.
5. Los controles experimentales existen y son serios: cegado del brief, jueces sin persona, rúbricas BARS, orden razón→número, negative prompting anti-sicofancia.
6. Las tres debilidades estructurales: circularidad intra-familia de modelos, ausencia de varianza distribucional (perfiles como centroides) y validez ecológica de exposiciones instruidas.
7. Dos incoherencias históricas, ya corregidas: el módulo Momentum omitía la mitad de la calibración del perfil (cerrado en v0.72.3: ahora usa `buildSystemPrompt`), y `willingness_to_pay` medía justicia de precio pese al nombre (re-etiquetado en la UI en v0.72.2).
8. Propiedad psicológica, instancias y gravedad agregada son doctrina de diseño, no capacidades.
9. El posicionamiento defendible: instrumento de cribado rápido y barato aguas arriba de la validación humana, que sigue siendo el gold standard declarado.
10. Las cifras de validación de la base teórica (89,7%, 71,4%) no tienen fuente recuperada: no usarlas ante una audiencia académica.

---

## 10. Referencias del mapeo

Ajzen, I. (1991). The theory of planned behavior. *Organizational Behavior and Human Decision Processes*. · Alexander, C. S. y Becker, H. J. (1978). The use of vignettes in survey research. *Public Opinion Quarterly*. · Ashton, M. C. y Lee, K. (2007). Empirical, theoretical, and practical advantages of the HEXACO model. *Personality and Social Psychology Review*. · Belk, R. (1988). Possessions and the extended self. *Journal of Consumer Research*. · Christakopoulou, K., Mourad, S. y Matarić, M. (2024). Agents thinking fast and slow: A Talker-Reasoner architecture. Google DeepMind. · Christensen, C. M., Hall, T., Dillon, K. y Duncan, D. S. (2016). *Competing Against Luck*. · Costa, P. T. y McCrae, R. R. (1992). NEO-PI-R. · De Vries, R. E. (2013). The 24-item Brief HEXACO Inventory (BHI). *Journal of Research in Personality*. · Dixon, M., Freeman, K. y Toman, N. (2010). Stop trying to delight your customers. *Harvard Business Review*. · Fogg, B. J. (2009). A behavior model for persuasive design. · Henrich, J., Heine, S. J. y Norenzayan, A. (2010). The weirdest people in the world? *Behavioral and Brain Sciences*. · Kahneman, D. (2011). *Thinking, Fast and Slow*. · Kahneman, D., Knetsch, J. L. y Thaler, R. (1986). Fairness as a constraint on profit seeking. *American Economic Review*. · Katz, E. y Lazarsfeld, P. F. (1955). *Personal Influence*. · Lewin, K. (1936). *Principles of Topological Psychology*; (1951). *Field Theory in Social Science*. · Michie, S., van Stralen, M. M. y West, R. (2011). The behaviour change wheel. *Implementation Science*. · Mischel, W. (1968). *Personality and Assessment*. · Orne, M. T. (1962). On the social psychology of the psychological experiment. *American Psychologist*. · Pierce, J. L., Kostova, T. y Dirks, K. T. (2001, 2003). Toward a theory of psychological ownership. *Academy of Management Review*; *Review of General Psychology*. · Rosenthal, R. (1966). *Experimenter Effects in Behavioral Research*. · Rossi, P. H. y Nock, S. L. (1982). *Measuring Social Judgments: The Factorial Survey Approach*. · Shafir, E., Simonson, I. y Tversky, A. (1993). Reason-based choice. *Cognition*. · Sharma, M. et al. (2023). Towards understanding sycophancy in language models. · Sheeran, P. (2002). Intention-behavior relations. *European Review of Social Psychology*. · Smith, P. C. y Kendall, L. M. (1963). Retranslation of expectations (BARS). *Journal of Applied Psychology*. · Stanovich, K. E. y West, R. F. (2000). Individual differences in reasoning. *Behavioral and Brain Sciences*. · Sweller, J. (1988). Cognitive load during problem solving. *Cognitive Science*. · Thaler, R. (1980). Toward a positive theory of consumer choice. *Journal of Economic Behavior and Organization*. · Tversky, A. y Kahneman, D. (1974). Judgment under uncertainty. *Science*. · Weber, M. (1922). *Economía y sociedad* (Verstehen). · Xia, L., Monroe, K. B. y Cox, J. L. (2004). The price is unfair! *Journal of Marketing*.
