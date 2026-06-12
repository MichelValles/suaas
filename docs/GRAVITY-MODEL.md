# Gravity Model: base teórica

> **Fuente**: presentación estratégica de Flat 101 (deck «Suas», caso de aplicación: captación de no clientes en banca, ejemplo BBVA) más la síntesis operativa de SUAAS. Este documento es la referencia teórica del marco; la base de los agentes que lo ejecutan está en [`CONOCIMIENTO-USUARIOS-SINTETICOS.md`](./CONOCIMIENTO-USUARIOS-SINTETICOS.md). El mapa teoría → código vive en la sección 7.
>
> **Relación entre ambos documentos**: los perfiles calibrados (en la literatura, «usuarios sintéticos») son el *motor* (cómo se simula). El Gravity Model es el *marco estratégico* (qué se simula, por qué y en qué plano de la relación marca-usuario actúa cada simulación).

---

## 1. El cambio de escenario: de la búsqueda a la respuesta

El punto de partida del modelo es un cambio de paradigma en la adquisición digital:

- **El usuario ya no navega, pregunta.** Y la decisión empieza en la respuesta, no en la web.
- La IA reduce opciones, sintetiza comparativas y **condiciona la elección antes del clic**.
- Durante años se compitió por **ser los primeros** (indexación, ranking). Hoy se compite por **ser interpretados, comprendidos y recomendados** por sistemas que ya no muestran resultados sino que construyen respuestas a partir de la información que obtienen de todos los canales.

Esto obliga a unificar la estrategia digital bajo una nueva lógica: no solo atraer tráfico, sino **influir en cómo la IA interpreta y recomienda la marca**. Es el fundamento del módulo GEO de SUAAS.

## 2. Intent Momentum: la intención como vector

La tesis central del modelo:

> Lo que está en el centro no es el usuario, es **su intención en cada momento**. La intención no es binaria. No es «tiene intención / no tiene intención». Tiene **intensidad, dirección y velocidad**. Eso es el **Intent Momentum**.

Las tres dimensiones del vector:

| Dimensión | Qué mide | Valores en SUAAS |
|---|---|---|
| **Intensidad** | Cuánta motivación hay para actuar ahora. 0 = sin intención de avanzar, 1 = acción inminente. | `intensity` numérico 0..1 |
| **Dirección** | Hacia dónde se mueve la intención respecto a la acción objetivo. | `approaching` (se acerca), `stable` (consciente pero sin moverse), `drifting` (se aleja, lo pospone o desconecta) |
| **Velocidad** | Cómo cambia el momentum en el tiempo. | `accelerating` (cada vez más urgente), `steady` (ritmo constante), `decelerating` (la urgencia se disipa) |

Dos consecuencias del planteamiento:

1. **El usuario no se mueve libremente en el espacio**: su órbita está condicionada por todo lo que le rodea (competidores, contexto vital, fricción, mensajes que recibe).
2. **El usuario no recorre un camino, orbita alrededor de la marca.** Cada interacción modifica su momentum y la suma de todas las interacciones genera **gravedad**: la fuerza que mantiene al usuario en órbita o lo deja escapar.

Esto sustituye la metáfora del funnel (lineal, por etapas, unidireccional) por una metáfora orbital (continua, multidireccional, acumulativa).

## 3. Los tres planos de influencia

Para influir en la órbita del usuario se activan tres **planos de influencia**. No son etapas del funnel: son **superficies de acción que el usuario cruza constantemente**, en cualquier orden y varias veces.

| Plano | Función gravitacional | Qué hace |
|---|---|---|
| **Construction Plane** | Crea el contexto gravitacional. | Define por qué una marca, producto o servicio **empieza a existir en la órbita del usuario**. Aquí se genera la primera atracción. |
| **Acceleration Plane** | Modula el momentum. | Lo que está en el centro es la intención en cada momento: **cambia, se refuerza o se debilita en función de todas las interacciones** que recibe. |
| **Value Plane** | Estabiliza la órbita. | Convierte una decisión puntual en una relación. **Aquí el usuario permanece.** |

Cada cruce de plano **refuerza, redirige o estabiliza** el momentum. Cuando los tres planos están alineados, el sistema genera gravedad.

Aplicación del deck original (caso banca):

- **Construction Plane** → Hipersegmentación (IA y usuarios sintéticos para captación).
- **Acceleration Plane** → Consultas IA, One Search, incrementalidad, atribución.
- **Value Plane** → Llegada al site, proceso de contratación, onboarding agéntico.

Cada momento de interacción es una oportunidad para reforzar la confianza y la percepción positiva de la marca.

## 4. Construction Plane: hipersegmentación

### 4.1 De demografía a intención

El problema de la segmentación clásica: 3 o 4 segmentos demográficos («jóvenes, mediana edad, alto valor») no explican el comportamiento. El modelo propone segmentar por **intención**:

| Banca tradicional | Neobancos |
|---|---|
| Segmenta por **quién es**: edad, renta, geografía. | Segmenta por **qué intenta conseguir**: comportamiento, etapa vital. |
| Dos usuarios de 28 años, misma ciudad, mismos ingresos: reciben el mismo onboarding. | Uno gestiona gastos de viaje, el otro ahorra para su vivienda: reciben onboardings completamente distintos. |

Ejemplos de segmentos de intención (del deck):

- «Persona que acaba de cobrar su primer sueldo y no sabe qué banco elegir.»
- «Ejecutivo que viaja cada semana y está harto de las comisiones de divisa.»
- «Recién llegado a España que necesita domiciliar el alquiler en 48h.»

### 4.2 JTBD como lenguaje de la segmentación

El lenguaje formal del segmento de intención es el **Job To Be Done**:

> **Cuando [situación], quiero [motivación] para poder [resultado].**

- «Cuando recibo mi nómina, quiero separar mis ahorros para no gastarlos sin querer.»
- «Cuando viajo al extranjero, quiero cambiar divisa sin comisiones para no perder dinero.»
- «Cuando tengo un gasto inesperado, quiero aplazarlo sin llamar a nadie, en dos minutos.»

**Cada situación y motivación define un segmento. Cada segmento define un onboarding.** En SUAAS este formato es exactamente el campo `intent_context` de los perfiles.

### 4.3 Agentes sintéticos e instancias

El agente sintético es el cerebro de la hipersegmentación:

- Un **agente sintético** es un modelo generativo alimentado con investigación cualitativa real (entrevistas, etnografías, datos de comportamiento, características sociológicas, fuentes). No es un perfil demográfico: es una **representación computacional de cómo razona, qué teme y cómo toma decisiones** un tipo específico de usuario en un contexto específico. Es un **perfil comportamental**: no describe quién es, sino cómo se relaciona con el dominio (en banca: con el dinero y con su banco, sus motivaciones, sus miedos, su nivel de confianza, cómo decide).
- Sus **instancias** son las diferentes historias que explican **por qué ese perfil existe**. El mismo comportamiento observable puede tener orígenes completamente distintos, y aunque hoy se comporten igual, **lo que les haría cambiar, lo que les genera confianza y lo que activa su aha moment es radicalmente distinto** por instancia.

Ejemplo del deck: perfil comportamental «multibancarizado pasivo» (gestión fragmentada en 2-3 bancos sin que ninguno sea «su banco»; comparación activa pero sin decisión: la intención existe, el momentum no se ha activado; el cambio no le da miedo, le da pereza: coste percibido de gestión del cambio). Tres instancias del mismo perfil:

1. **El nómada digital**: usa Revolut para el día a día, su banco actual solo para recibir la nómina.
2. **El cansado de 2 apps**: ING para el día a día y su banco de siempre para la nómina; le cansa gestionar dos mundos.
3. **El que está a punto**: lleva meses comparando, ya miró la marca, algo le frenó o no encontró el momento.

Segundo ejemplo del deck: perfil «fiel tradicional», con instancias como **la herencia familiar** (nunca eligió, le abrieron la cuenta), **el pensionista analógico** o el que opera como si **«el banco no existe»**. Es a este ejemplo al que pertenece la observación clave: aunque los tres se comportan igual hoy (son fieles, no se mueven), lo que les haría cambiar, lo que les genera confianza y lo que activa su aha moment es radicalmente distinto.

### 4.4 Qué valida el agente sintético antes del lanzamiento

El deck llama a este enfoque **certeza predictiva**: simular antes de lanzar para eliminar la incertidumbre del lanzamiento. Su justificación: los flujos tienen **tramos de concentración de accidentes que se repiten en cada lanzamiento**, siempre en el mismo punto y por la misma razón, porque nadie los simuló antes «desde dentro de la cabeza del usuario». Sobre un flujo (en el deck, el onboarding bancario), el agente lo recorre con su carga cognitiva, su umbral de abandono y su motivación específica, y responde a:

- ¿El framing del primer paso **activa motivación intrínseca** en esta instancia o genera carga cognitiva?
- ¿En qué pantalla concreta la instancia **percibe la fricción como coste mayor que el beneficio** y abandona?
- ¿El mensaje post-alta **activa el aha moment** o solo confirma que la cuenta existe?

> «No lanzamos el onboarding para descubrir dónde falla. Lo lanzamos ya sabiendo dónde falla y habiéndolo corregido.»

### 4.5 Framework de conductas

El análisis se hace en dos pasos: (1) a nivel visual y psicológico (esfuerzo cognitivo e interacciones) y (2) a nivel descriptivo (comportamiento), clasificando la conducta observada frente a la **acción principal** (la conducta que el flujo está diseñado para activar):

| Conducta | Definición |
|---|---|
| **Óptima** | El usuario completa sin fricción percibida: motivación intrínseca activa. |
| **Fuga** | El coste percibido supera el beneficio esperado: umbral de abandono cruzado. |
| **Repesca** | El usuario abandonó pero la intención sigue viva: **ventana de recuperación**. |

Esta taxonomía es el origen directo del campo `behavior_class` (`optima` / `fuga` / `repesca`) del test de claridad 5s de SUAAS.

El resultado de cruzar todos los agentes no es una opinión sobre qué mejorar: es un **mapa de dónde falla cada instancia, por qué falla y qué cambio concreto lo resuelve**. Los puntos que fallan en todas las instancias son los de mayor severidad y los primeros a tocar: un mapa de fricción **priorizado por impacto**, con hipótesis de mejora específicas por instancia.

La hipersegmentación es «la gravedad de la estrategia»: aporta un propósito claro a la captura de queries en el GEO y otorga una identidad real al onboarding de cada usuario. Es decir, **el Construction Plane alimenta a los otros dos planos**.

## 5. Acceleration Plane: escalado e interpretación por IA

Este plano transforma la intención del usuario en crecimiento sostenido y medible. Dos frentes:

### 5.1 Performance: personalización guiada por la intención

Entender correctamente la intención de cada consulta (informativa vs. transaccional) y personalizar con IA:

- **Mensajes**: que el texto del anuncio sea relevante para la consulta específica del usuario.
- **Creatividades**: mostrar la creatividad más apropiada según el comportamiento del usuario.
- **URLs**: la mejor página de destino del site para cada consulta.
- **Audiencias**: dotar a la IA de señales para identificar la audiencia más propensa y de mayor calidad.

Complementado con cobertura de marca: share of voice, plan omnicanal, colaboraciones y alianzas, acciones de cobertura incremental (cTV, DOOH), con la hipersegmentación como foco para optimizar el performance.

### 5.2 GEO: el nuevo estándar de búsqueda

Cómo construyen hoy las respuestas los buscadores y modelos de lenguaje (los 4 pasos del deck):

1. **Interpretación de la intención**: el sistema interpreta qué busca realmente el usuario y en qué contexto (informativo, comparativo, crítico, decisional).
2. **Selección de fuentes relevantes**: la IA prioriza medios de comunicación, fuentes institucionales, plataformas especializadas y contenidos con recurrencia temática.
3. **Cruce y validación del relato**: las respuestas se construyen a partir de patrones comunes detectados entre múltiples fuentes, no de una única publicación.
4. **Generación de una narrativa sintetizada**: el modelo resume qué papel juega la marca en ese contexto y cómo debe interpretarse en relación con la consulta.

Implicación: la marca ya no se evalúa solo por sus activos, sino por **cómo aparece citada, en qué contextos se la menciona y con qué rol se la asocia cuando no controla el discurso**. El módulo GEO de SUAAS simula exactamente este proceso por segmento de intención.

## 6. Value Plane: onboarding agéntico y propiedad psicológica

### 6.1 El alta como principio, no como final

El onboarding no es el final del proceso de captación: **es el principio de la relación**. El compromiso tras el alta no lo marca una operativa concreta, sino la capacidad de la marca para **integrarse de forma invisible en la toma de decisiones diaria** del usuario.

El deck propone el desplazamiento «de darse de alta en un banco a suscribirse a un ecosistema de valor», observando los modelos de suscripción de neobancos (Revolut): fidelización blindada (de la comisión transaccional a la cuota por servicio de valor), onboarding de fricción cero (la «suscripción» reduce la barrera psicológica frente al «alta» tradicional) y predicción de churn (los modelos de suscripción detectan patrones de abandono mucho antes que los basados en saldo).

### 6.2 Propiedad psicológica y aha moment

El verdadero final del onboarding no ocurre cuando se activa el producto, sino cuando se produce la **propiedad psicológica**: el **aha moment** en que el usuario deja de evaluar el producto como una opción externa y **lo integra en su identidad** (en banca, su identidad financiera). Tres propiedades clave:

- **No se puede diseñar de forma genérica.**
- **Es distinto para cada instancia.**
- **Sí se puede detectar para acelerarlo.**

Ejemplo del deck (instancia «viajero frecuente»): el banco no se vuelve «suyo» al recibir la tarjeta física, sino en el primer pago en moneda extranjera con la notificación «Has pagado 1.200¥ (7,42€). Has ahorrado 0,35€ en comisiones». Ahí la promesa se valida y el producto se vuelve indispensable. El diseño debe **acelerar ese aha moment** fomentando que el usuario ejecute cuanto antes la acción que lo dispara.

Los neobancos diseñan onboardings de fricción cero para capturar el aha moment al instante, convirtiendo el alta en un proceso invisible que garantiza que **el impulso del usuario no se pierda en la burocracia**.

### 6.3 Onboarding por capas de activación

| Capa | Qué hace |
|---|---|
| **Descubrimiento** | El sistema detecta la **intención de origen** y personaliza el primer contacto (aha moment específico de la instancia). |
| **Adopción** | El producto se **desbloquea según la interacción**: cada acción del usuario activa el siguiente nivel de valor. Progreso percibido, momentos de recompensa, sentido de avance. |
| **Pertenencia** | **Inducción de hábitos recurrentes** para transformar el alta en principalidad (LTV). |

El producto se desbloquea en función de lo que el usuario hace, no de lo que la marca decide mostrar. Se pasa de un onboarding plano a un recorrido con hitos de recompensa que aceleran la decisión de pertenencia.

## 7. Mapa teoría → implementación en SUAAS (v0.30.x)

| Concepto del modelo | Implementación actual | Dónde |
|---|---|---|
| Segmento de intención / JTBD | Campo `intent_context` en perfiles, formato «Cuando [situación], quiero [motivación] para poder [resultado]». Se inyecta en todos los system prompts del perfil. Generable por LLM en lote. | `profiles.intent_context` (migración 0015), `lib/prompts.ts`, `POST /api/profiles/batch-intent` |
| Intent Momentum (vector) en interacción | El Reasoner del chat emite `momentum { intensity, direction, velocity }` cada turno; el ChatPanel lo visualiza. | `ReasonerPlanSchema` en `lib/agents.ts`, `MomentumIndicator` en `app/profiles/[id]/chat-panel.tsx` |
| Intent Momentum ante-touchpoint | Módulo Momentum: Triggers (escenarios de activación) y simulación de cómo cada perfil los abordaría antes de que ninguna marca entre en su radar: narrativa, intensidad, dirección, velocidad, primeros pasos, canales, barreras, JTBD expresado. | `/momentum`, `lib/momentum.ts`, tabla `momentum_challenges` (migración 0016) |
| Conductas óptima / fuga / repesca | `behavior_class` en el test de claridad 5s: el agente clasifica su propia conducta; la página de resultados muestra la distribución. | `lib/experiments/five-second.ts`, `five_second_responses.behavior_class` (migración 0015) |
| GEO / nuevo estándar de búsqueda | GEO Tester: lanza la query de cada segmento JTBD contra motores de respuesta IA reales (Claude, ChatGPT y Perplexity, con búsqueda web y citas) y mide por motor `visibility_score`, `brand_position`, `recommendation_tone`, `key_claims`, `missing_attributes`. | `/geo`, `lib/geo.ts`, `lib/geo-engines.ts`, tabla `geo_analyses` (migraciones 0015 y 0023) |
| Perfiles calibrados grounded (motor) | Perfiles con demografía + Big Five + COM-B + backstory, arquitectura Talker-Reasoner, negative prompting. | `lib/profiles.ts`, `lib/prompts.ts`, `lib/agents.ts`, base teórica en `CONOCIMIENTO-USUARIOS-SINTETICOS.md` |
| Validación de flujos paso a paso (4.4) | Módulo Embudos: effort, intent_match, friction y dropoff por paso. | `/funnels`, `lib/experiments/funnel.ts` |
| Personalización de mensajes/creatividades (5.1) | Módulo Campañas (Search RSA + Display RDA): intención por query, versión ideal por perfil. | `/campaigns`, `lib/experiments/campaign.ts` |

### Conceptos del modelo aún sin implementación directa

Huecos identificados (insumo para el roadmap):

- **Instancias** como entidad: SUAAS tiene perfiles individuales, pero no el par «perfil comportamental → N instancias» (mismo comportamiento, orígenes y aha moments distintos).
- **Gravedad agregada**: no existe una métrica que sume el momentum de las interacciones de una cohorte en una «fuerza gravitacional» de la marca, ni vista que cruce el momentum entre módulos.
- **Mapa de fricción priorizado por impacto** cruzando todas las instancias (sección 4.5): los embudos ya rankean fricciones por frecuencia entre perfiles (`top_friction`), pero falta la dimensión «instancia» como entidad y la regla de severidad «lo que falla en todas las instancias se toca primero».
- **Aha moment por instancia** (6.2): no se modela ni detecta el momento de propiedad psicológica.
- **Capas de activación** (6.3): no hay simulación post-alta (adopción, pertenencia, hábito recurrente, churn).
- **Repesca accionable**: `behavior_class='repesca'` se cuenta pero no genera la «ventana de recuperación» (qué mensaje recuperaría a ese usuario).
- **Evolución temporal del momentum**: el vector se mide por interacción, pero no se traza su trayectoria a lo largo del tiempo ni entre touchpoints.

## 8. Glosario

| Término | Definición corta |
|---|---|
| **Intent Momentum** | La intención del usuario expresada como vector: intensidad (0..1), dirección (approaching / stable / drifting) y velocidad (accelerating / steady / decelerating). |
| **Gravedad** | Fuerza acumulada que mantiene al usuario en la órbita de la marca; suma del efecto de todas las interacciones sobre su momentum. |
| **Órbita** | Trayectoria no lineal del usuario alrededor de la marca; sustituye al funnel. |
| **Plano de influencia** | Superficie de acción (no etapa) que el usuario cruza constantemente: Construction, Acceleration, Value. |
| **Segmento de intención** | Grupo definido por un JTBD («Cuando [situación], quiero [motivación] para poder [resultado]»), no por demografía. |
| **Perfil comportamental** | Representación computacional de cómo razona, teme y decide un tipo de usuario en un contexto. |
| **Instancia** | Historia concreta que explica por qué existe un perfil comportamental; mismo comportamiento, palancas de cambio distintas. |
| **Conducta óptima / fuga / repesca** | Clasificación del comportamiento ante la acción principal de un flujo: completa sin fricción / abandona por coste percibido / abandona con intención viva. |
| **Aha moment / propiedad psicológica** | Momento en que el usuario integra el producto en su identidad; específico por instancia, detectable y acelerable. |
| **GEO** | Generative Engine Optimization: influir en cómo los motores de respuesta IA interpretan, citan y recomiendan la marca. |
| **Trigger (SUAAS)** | Escenario de activación JTBD sobre el que se simula el momentum de los perfiles antes de cualquier touchpoint de marca. |
