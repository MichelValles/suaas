# Gravity en cuatro preguntas: arquitectura, cómputo, estado y diferencial

> **Qué es este documento.** Una respuesta directa y honesta a cuatro preguntas sobre Gravity: qué capas usa para representar a un usuario, qué computa con ellas, qué está construido de verdad y qué lo diferencia de la segmentación de CRM. Es una **síntesis**: la fuente de verdad del marco estratégico es [`GRAVITY-MODEL.md`](./GRAVITY-MODEL.md), la del motor de perfiles es [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md), y la base teórica y de validación es [`BASE-CONOCIMIENTO.md`](./BASE-CONOCIMIENTO.md). Si algo aquí contradice a esos tres, ellos mandan.
>
> **Una advertencia que recorre todo el documento.** No hay ningún modelo computacional de conducta detrás de Gravity: ni funciones de utilidad, ni curvas, ni muestreo, ni `temperature` fijada en ninguna llamada. Todo lo que sigue (los vectores, los scores, las barreras) es **medición declarativa simulada**: valores que un LLM declara guiado por esquemas y rúbricas, no que un modelo formal calcula. El sistema es defendible como instrumento de cribado barato y rápido **aguas arriba** de la validación con humanos (el gold standard irrenunciable de la propia doctrina); presentado como simulación predictiva calibrada, no lo sería.

---

## Pregunta 1. La arquitectura conceptual: ¿qué capas usa para representar a un usuario o audiencia?

Gravity tiene **dos arquitecturas superpuestas** que conviene no confundir. Una describe **dónde** actúa la marca sobre el usuario (los planos). La otra describe **de qué está hecho** un usuario (las capas del perfil). El vector de intención y el contexto de marca son el tejido que las conecta.

### 1.A. Los tres planos de influencia (el marco estratégico)

El modelo parte de una tesis: **la decisión se toma antes de llegar a la web; la web ya no es donde se elige, es donde se confirma una elección formada fuera.** De ahí que no haya un embudo lineal, sino una **órbita**: el usuario no recorre etapas, orbita alrededor de la marca, y cada interacción modifica su intención. Para actuar sobre esa órbita hay tres **planos de influencia** (superficies que el usuario cruza constantemente, no fases):

| Plano | Función | Momento respecto al clic |
|---|---|---|
| **Construction Plane** | Crea el contexto gravitacional: por qué una marca empieza a existir en la órbita del usuario. Aquí se genera la primera atracción y se mide la intención. | **Pre-clic** |
| **Acceleration Plane** | Modula el momentum: cómo la intención se refuerza o se debilita en el primer punto de contacto (respuesta de IA, anuncio), que ya no es la web. | **Pre-clic** |
| **Value Plane** | Estabiliza la órbita: convierte la decisión ya tomada en relación (onboarding, propiedad psicológica). | **En y post-clic** |

Dos tercios del modelo (Construction y Acceleration) operan **antes del clic**. Esa es la columna vertebral de Gravity.

### 1.B. Las capas de un perfil calibrado (la representación del usuario)

Un usuario se representa como un **perfil calibrado**: un registro estructurado (esquema zod en `lib/profiles.ts`, persistido como jsonb en Supabase) que condiciona a un agente LLM. Las capas, con su nombre real de campo y su fundamento:

| Capa (campo real) | Qué contiene | Constructo académico |
|---|---|---|
| **Demografía** (`demographics`) | Edad, género, ocupación coloquial, banda de renta, geo. | Datos de base de la viñeta. |
| **Personalidad** (`big_five`) | Los cinco rasgos OCEAN (Apertura, Conciencia, Extraversión, Amabilidad, Neuroticismo) en escala 0..1, inyectados como porcentajes. | Modelo de los Cinco Factores (Costa y McCrae 1992). |
| **Barreras** (`com_b_barriers`) | Tres listas de texto libre: Capacidad, Oportunidad, Motivación. Son los obstáculos que impiden la conducta objetivo. | COM-B / Behaviour Change Wheel (Michie et al. 2011). |
| **Trasfondo** (`backstory`) | Viñeta narrativa en tercera persona que conecta una rutina, un dolor y una motivación. Codifica de facto clase y capital cultural. | Método de viñetas; identidad narrativa (McAdams 1993). |
| **Intención** (`intent_context`) | El Job To Be Done: «Cuando [situación], quiero [motivación] para poder [resultado]». Se inyecta en TODAS las llamadas del perfil. | JTBD (Christensen 2016; job story de Klement 2013). |
| **Origen** (`source`) | Cómo se creó el perfil: `manual`, `llm_seed`, `self_report`, o un set de investigación. No entra en ningún prompt. | Trazabilidad epistémica de la creación. |
| **Cliente de optimización** (`optimized_for`) | Marca/cliente para el que se ha modelado el perfil (p. ej. IVI, SegurCaixa Adeslas Dental); null = perfil base. Distingue en la rejilla los perfiles calibrados de los de formulario (v0.68). | Etiqueta operativa de procedencia calibrada. |

Estas cinco primeras capas (demografía, Big Five, COM-B, backstory, JTBD) son literalmente la **vignette grounded** de la base teórica: datos estructurados convertidos en un perfil narrativo situado, no una instrucción genérica.

### 1.C. Las capas dinámicas (lo que emerge por interacción)

Sobre el registro estático, el sistema emite por interacción tres construcciones dinámicas:

- **Intent Momentum**: la intención como vector con tres dimensiones: `intensity` (0..1), `direction` (`approaching` / `stable` / `drifting`) y `velocity` (`accelerating` / `steady` / `decelerating`). Es el concepto central del modelo; su ancla académica es la teoría de campo de Lewin (1936, 1951).
- **Conducta** (`behavior_class`): clasificación de la conducta ante la acción principal de un flujo: `optima` (completa sin fricción), `fuga` (abandona por coste percibido), `repesca` (abandona pero la intención sigue viva).
- **Fricción simbólica** (`social_friction`): la capa macrosociológica. Lee el habitus y el capital cultural del perfil (Bourdieu) para detectar disonancia de clase o pérdida de legitimidad ante el registro de la interacción. **Solo existe en el chat 1:1**.

### 1.D. El contexto de marca (la masa que atrae): Cerebro

El perfil es la **masa que orbita**; la marca es la que **ejerce la atracción**. Esa identidad de marca vive en **Cerebro**, la base de conocimiento reutilizable: documentos (`brief`, `tono`, `producto`, `analytics`, `voc`, `informe`, `nota`) que un selector inyecta como contexto en los módulos. Los documentos marcados como **privados (ZDR / `sensitive`)** se guardan pero **nunca se inyectan en prompts** ni viajan al gateway. Desde v0.63 el contexto se recupera por RAG (pgvector), no por volcado íntegro.

---

## Pregunta 2. Qué computa: ¿cómo combina las capas y qué produce?

### 2.A. Cómo se combinan las capas (la respuesta corta: no se ponderan, se serializan)

No hay ponderación numérica ni fórmula de agregación entre capas. El mecanismo es:

1. **`buildSystemPrompt`** (`lib/prompts.ts`) es la **única voz del perfil**. Serializa el registro en un system prompt con un orden fijo: identidad y anti-ruptura de rol, «## Quién eres» (demografía + Big Five en % + barreras COM-B), «## Tu historia» (backstory), «## Cómo te comportas» (reglas de conducta con negative prompting anti-complacencia), «## Contexto de intención (JTBD)» y «## Antipatrones».
2. Ese prompt condiciona a un **agente LLM** que reacciona a un **estímulo** (una pantalla, un anuncio, un bloque de copy, un precio, un trigger, una query) y emite una **salida estructurada** (zod + `generateObject`), con rúbricas por bandas.
3. En el **chat 1:1**, y solo ahí, se activa la arquitectura **Talker-Reasoner** (procesamiento dual de Kahneman): el **Reasoner** (Opus, Sistema 2) emite por turno un plan estructurado (estado, intención, barreras activas, tono, `effort`, el vector `momentum` y `social_friction`); el **Talker** (Sonnet, Sistema 1) responde en voz del perfil siguiendo ese plan. En los ocho módulos batch se usa **una sola pasada** con Sonnet, que colapsa deliberación y expresión.

La combinación, por tanto, es **interpretativa, no aritmética**: el LLM lee todas las capas juntas en el prompt y produce un juicio. La «ponderación» de un rasgo sobre otro es lo que el modelo decida hacer con «Extraversión 40%» al generar el texto, sin garantía de que sea monótona ni calibrada.

### 2.B. Inputs → outputs por módulo

- **Input común**: el perfil (registro serializado) + el estímulo del módulo + opcionalmente el contexto de marca de Cerebro (con cegado del brief en los tests a ciegas).
- **Output común**: métricas declaradas por el agente, agregadas por run.

| Módulo | Estímulo (input) | Output principal |
|---|---|---|
| **Chat 1:1** | Mensaje conversacional | Respuesta en voz del perfil + plan del Reasoner por turno (estado, barreras, tono, `effort`, `momentum`, `social_friction`) |
| **Momentum** | Un *Trigger* (escenario JTBD) | Narrativa de intención, vector `momentum`, primeros pasos, canales, barreras, JTBD en palabras del perfil |
| **Claridad 5s** | Pantalla mostrada 5 s | `comprehension_rate` (juez neutral), `mean_clarity`, `top_barriers`, `behavior_class`, `behavior_counts` |
| **GEO Tester** | Query del segmento, contra Claude/ChatGPT/Perplexity reales | `brand_mentioned`, `visibility_score`, `brand_position`, `recommendation_tone`, `key_claims`, `missing_attributes` |
| **Campañas** | Anuncio por canal y query (landing condicional si `intent_to_click ≥ 0,5`) | `intent_to_click`, `behavior_class` (semántica ads), `behavior_inconsistencies`, versión ideal por perfil, síntesis LLM |
| **Copy** | 2-10 bloques de texto aislados | `persuasion`, `would_click`, `sentiment`, `clarity` por bloque; `top_block` |
| **Pricing** | Cada nivel de precio (2-8) | `would_buy`, `willingness_to_pay`, `perceived_value`; `sweet_spot = argmax(would_buy_rate × price)` |
| **Embudos** *(beta)* | El flujo paso a paso (agente multimodal con memoria episódica) | `effort` por paso, `intent_match`, `completion_rate`, `dropoff_by_step`, `top_friction` |
| **A/B** *(beta)* | Dos pantallas con el mismo set, vía 5s | Comparación emparejada de `mean_clarity`, `mean_comprehension`, `behavior_counts` |

**Qué NO computa** (importante para no sobrevender): el vector momentum del chat se emite pero **no se persiste como métrica ni se pasa al Talker**; ningún módulo cruza `behavior_class` con el vector; no hay serie temporal del momentum; el Reasoner no tiene memoria de sus propios planes (re-infiere la «velocidad» cada turno sin serie real).

---

## Pregunta 3. El estado de implementación: qué funciona y qué está solo planteado

Verificado contra el código (los detalles con `archivo:línea` y migración están en `GRAVITY-MODEL.md` §8 y `PERFILES-CALIBRADOS.md` §5).

### Construido y funcionando

| Componente | Estado | Nota |
|---|---|---|
| **Perfiles calibrados** (4 vías: formulario, CSV, generación LLM, onboard psicométrico) | ✅ | El onboard (HEXACO-24 con scoring determinista en código) es la única psicometría real. |
| **Chat 1:1 con Talker-Reasoner** | ✅ | Único módulo con arquitectura dual y con `social_friction`. |
| **Momentum** | ✅ | Ver salvedad de fidelidad abajo. |
| **Claridad 5s** | ✅ | Con juez neutral sin persona y `behavior_class`. |
| **GEO Tester** | ✅ | Sondas reales con búsqueda web (Claude, ChatGPT, Perplexity). |
| **Campañas** | ✅ | El módulo con más controles experimentales. |
| **Copy** | ✅ | Resonancia de copy puro. |
| **Cerebro** (contexto de marca + RAG + ZDR) | ✅ | Sustrato de los demás módulos. |
| **Origen y cliente del perfil** (icono estrellas vs. formulario, `optimized_for`) | ✅ | v0.68. |

### En beta (funciona, menos maduro)

- **Embudos** (`/funnels`), **A/B tests** (`/ab`), **Pricing** (`/pricing`). Detrás del modo beta del menú.

### Planteado pero NO construido

- **Value Plane completo**: no hay simulación post-alta (onboarding agéntico, descubrimiento/adopción/pertenencia, propiedad psicológica, churn). Es el plano con **menos cobertura**: la plataforma es fuerte en pre-clic y débil en post-clic.
- **Instancias** como entidad (el par «perfil comportamental → N instancias con mismo comportamiento y palancas distintas»): la unidad real es el perfil individual.
- **Gravedad agregada**: no existe métrica que sume el momentum de una cohorte en una «fuerza» de marca.
- **Evolución temporal del momentum**: se mide por interacción, no se traza la trayectoria; en el chat ni siquiera se persiste.
- **Aha moment por instancia** y **repesca accionable** (la «ventana de recuperación»): identificados, no modelados (campañas ya produce la «versión ideal por perfil», materia prima de esa ventana).
- **Mapa de fricción priorizado por instancia**: los embudos rankean fricción por frecuencia, pero falta la entidad «instancia».
- **GEO pendiente**: AI Overview (SerpAPI) y Gemini como cuarto y quinto motor.

### Incoherencias internas (dos ya corregidas)

- **Momentum usaba media calibración**: su persona ad hoc no usaba `buildSystemPrompt` (dejaba fuera Big Five, COM-B y los negative prompts). **Corregido en v0.72.3**: ahora usa `buildSystemPrompt`, la voz completa, como el resto de módulos con run.
- **`willingness_to_pay` medía justicia de precio, no disposición a pagar** (1 = justo, 0 = abuso). El nombre engañoso se **re-etiquetó en la UI en v0.72.2** (chip «Justo» con aclaración); el `sweet_spot` sigue siendo un argmax de ingreso esperado, **no** una curva de elasticidad ni un Monte Carlo.
- **`social_friction`** es potente pero **solo del chat**, donde no se decide el CRO.

---

## Pregunta 4. El diferencial técnico: ¿qué aporta frente a un CRM o a la elasticidad de precio por datos operativos?

Un sistema clásico de segmentación de CRM o de elasticidad de precio describe **quién es** el usuario (edad, renta, geo) y **qué hizo** (histórico transaccional). Segmenta por atributos que covarían con la conducta y mide elasticidad sobre precios que **ya se cobraron**. Es potente y es dato real, pero tiene tres límites estructurales que Gravity ataca:

**1. El CRM solo sabe del pasado y de lo que ya existe. Gravity reacciona a lo que aún no se ha lanzado.** Un CRM no puede decirte cómo reaccionará un segmento a una landing, un anuncio, un copy o un precio que **todavía no existen**, porque no hay histórico de ellos. Gravity enfrenta perfiles a variantes hipotéticas y las cribadas **antes de gastar tráfico real**: pasa de un ciclo de test de meses a uno de minutos. Es un filtro de eficiencia previo a la validación humana, no un sustituto.

**2. El CRM segmenta por quién eres; Gravity, por qué intentas conseguir (intención).** Dos usuarios de 28 años, misma ciudad, mismos ingresos, reciben el mismo trato en un CRM. En Gravity, si uno tiene el JTBD «gestionar gastos de viaje» y el otro «ahorrar para la vivienda», son segmentos distintos con recorridos distintos. La segmentación es por **Job To Be Done**, no por demografía. La intención existe en el mundo del usuario **antes de cualquier contacto con la marca**, que es justo lo que el CRM no ve.

**3. El CRM ve datos; Gravity añade una capa de razonamiento y el «por qué».** Sobre los mismos sociodemográficos, Gravity condiciona un agente con **cómo razona, qué teme y cómo decide** el usuario: barreras COM-B (por qué no ocurre la conducta), rasgos Big Five, el habitus y la fricción simbólica de clase (Bourdieu), la intención como vector con intensidad, dirección y velocidad. Y lo hace **trazable**: el plan del Reasoner (Chain-of-Thought del Sistema 2) hace visible el razonamiento y lo ancla a atributos concretos (atributo → plan → respuesta), lo que la observación de usuarios no puede registrar y el CRM no contiene.

**4. Dos frentes que el CRM no toca por definición, porque ocurren fuera de la web:**

- **Momentum** mide la intención de un perfil ante un *Trigger* **antes de que ninguna marca entre en su radar** (momentum desnudo): la decisión formándose fuera.
- **GEO** mide **cómo los buscadores de IA (Claude, ChatGPT, Perplexity) describen, citan y recomiendan la marca** ante la query de cada segmento: el campo de batalla que ya no es la web de la marca, sino la respuesta sintetizada previa al clic.

**El límite honesto, que es parte del diferencial bien planteado.** Nada de esto es dato conductual real: es **medición declarativa simulada** (el LLM declara, no calcula), sin calibración contra conversión real y con el mismo riesgo de circularidad de cualquier simulación con LLM (el modelo puede estar midiendo su propia teoría implícita de la conducta). Los sets calibrados (IVI, Adeslas) se construyeron con **investigación secundaria verificada** (registros sectoriales, INE, OCU, comparadores), no con Voz del Cliente primaria; y los perfiles son **centroides, no distribuciones** (no hay muestreo). Por eso Gravity **complementa** al CRM aguas arriba (cribado rápido y barato de hipótesis y variantes), no lo sustituye: la validación con humanos reales sigue siendo el gold standard irrenunciable. Su valor no es reemplazar el dato operativo, sino **razonar sobre el «fuera» y el «todavía no» que el dato operativo no puede ver**.

---

## Resumen en una frase

Gravity representa a un usuario como un **perfil calibrado** (demografía + Big Five + barreras COM-B + viñeta + JTBD) que actúa sobre **tres planos** de la relación marca-usuario (Construction, Acceleration, Value), y lo usa para **simular su intención y su fricción ante estímulos que aún no existen**, sobre todo **antes del clic**, produciendo métricas de cribado que un CRM no puede dar porque el CRM solo ve el pasado, lo ya lanzado y el «quién», no el «por qué», el «fuera» ni el «todavía no». Todo ello con una honestidad explícita sobre su estatus: instrumento de cribado declarativo, no oráculo calibrado.
