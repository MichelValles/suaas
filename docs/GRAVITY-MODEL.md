# Gravity Model: base teórica

> **Fuente**: presentación estratégica de Flat 101 (deck «Suas», caso de aplicación: captación de no clientes en banca, ejemplo BBVA) más la síntesis operativa de SUAAS. Este documento es la referencia teórica del marco; la base de los agentes que lo ejecutan está en [`CONOCIMIENTO-USUARIOS-SINTETICOS.md`](./CONOCIMIENTO-USUARIOS-SINTETICOS.md) y la anatomía completa del motor de perfiles (con su fundamento académico y sus límites) en [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md). El mapa teoría → módulos vive en la sección 8.
>
> **Relación entre los documentos**: los perfiles calibrados (en la literatura, «usuarios sintéticos») son el *motor* (cómo se simula). El Gravity Model es el *marco estratégico* (qué se simula, por qué y en qué plano de la relación marca-usuario actúa cada simulación).
>
> **Nomenclatura de marca**: el producto interno es **SUAAS**; **Gravity** es la marca de la superficie comercial (la página `/gravity` se autodescribe como «Marco estratégico de referencia de Gravity», la landing `/propuesta` y todo el onboard público usan «Gravity»). En este documento, «Gravity Model» nombra el marco teórico y «SUAAS» la plataforma que lo implementa.

---

## 0. La tesis: la decisión se toma antes de llegar a la web

Todo el modelo se apoya en una sola afirmación, y conviene leerla como tesis rectora, no como una observación más:

> **El usuario toma la decisión antes de llegar a la web. La web ya no es donde se elige: es donde se confirma una elección que se formó fuera.**

De esta tesis se derivan las dos consecuencias que estructuran el resto del documento:

1. **La decisión es preexistente.** Cuando el usuario hace clic, llega con una intención que ya tiene intensidad, dirección y velocidad (el [Intent Momentum](#2-intent-momentum-la-intención-como-vector)). Esa intención se formó en la respuesta de una IA, en un anuncio, en una conversación, en una comparación que la marca no controla. La web intercepta un vector que ya estaba en movimiento.
2. **El trabajo estratégico se desplaza aguas arriba.** Si la decisión se forma fuera, el lugar donde se gana o se pierde la marca también está fuera. Con técnicas modernas (los módulos de SUAAS) se puede **influir en la órbita del usuario antes del clic**: medir su momentum antes de que la marca entre en su radar, ver cómo lo interpretan los buscadores de IA, qué anuncio o qué copy lo atrae, y corregirlo todo **antes** de gastar el tráfico real.

El modelo gravitacional es exactamente la herramienta para razonar sobre ese «fuera». Dos de sus tres planos (Construction y Acceleration) operan **antes del clic**; sólo el tercero (Value) ocurre en y después de la web. Es decir: **dos tercios del modelo, y de la plataforma, trabajan sobre la decisión que se toma antes de que el usuario llegue.** Esa es la columna vertebral de SUAAS y el hilo que recorre cada sección de aquí en adelante.

## 1. El cambio de escenario: de la búsqueda a la respuesta

El punto de partida del modelo es un cambio de paradigma en la adquisición digital que hace que la tesis anterior no sea una opinión, sino una consecuencia del escenario actual:

- **El usuario ya no navega, pregunta.** Y la decisión empieza en la respuesta, no en la web.
- La IA reduce opciones, sintetiza comparativas y **condiciona la elección antes del clic**.
- Durante años se compitió por **ser los primeros** (indexación, ranking). Hoy se compite por **ser interpretados, comprendidos y recomendados** por sistemas que ya no muestran resultados sino que construyen respuestas a partir de la información que obtienen de todos los canales.

Esto obliga a unificar la estrategia digital bajo una nueva lógica: no solo atraer tráfico, sino **influir en cómo la IA interpreta y recomienda la marca** en el instante previo al clic. Es el fundamento del módulo GEO de SUAAS.

## 2. Intent Momentum: la intención como vector

La tesis central del modelo:

> Lo que está en el centro no es el usuario, es **su intención en cada momento**. La intención no es binaria. No es «tiene intención / no tiene intención». Tiene **intensidad, dirección y velocidad**. Eso es el **Intent Momentum**.

Las tres dimensiones del vector:

| Dimensión | Qué mide | Valores en SUAAS |
|---|---|---|
| **Intensidad** | Cuánta motivación hay para actuar ahora. 0 = sin intención de avanzar, 1 = acción inminente. | `intensity` numérico 0..1 |
| **Dirección** | Hacia dónde se mueve la intención respecto a la acción objetivo. | `approaching` (se acerca), `stable` (consciente pero sin moverse), `drifting` (se aleja, lo pospone o desconecta) |
| **Velocidad** | Cómo cambia el momentum en el tiempo. | `accelerating` (cada vez más urgente), `steady` (ritmo constante), `decelerating` (la urgencia se disipa) |

Tres consecuencias del planteamiento, las dos primeras del deck y la tercera es el puente con la tesis:

1. **El usuario no se mueve libremente en el espacio**: su órbita está condicionada por todo lo que le rodea (competidores, contexto vital, fricción, mensajes que recibe).
2. **El usuario no recorre un camino, orbita alrededor de la marca.** Cada interacción modifica su momentum y la suma de todas las interacciones genera **gravedad**: la fuerza que mantiene al usuario en órbita o lo deja escapar.
3. **El usuario llega a la web con un momentum preexistente.** Si la intención ya tiene intensidad, dirección y velocidad antes del clic, entonces medirla y modularla **antes** de que el usuario llegue es la palanca de mayor apalancamiento. La web no crea el vector: lo recibe.

Esto sustituye la metáfora del funnel (lineal, por etapas, unidireccional, que asume que la marca controla un recorrido que **empieza con la entrada al site**) por una metáfora orbital (continua, multidireccional, acumulativa, en la que la web es **un punto de la órbita, no su origen**).

Dos precisiones que conviene tener presentes al usar el concepto:

- **El ancla académica del vector es la teoría de campo de Kurt Lewin** (*Principles of Topological Psychology*, 1936; *Field Theory in Social Science*, 1951): la conducta como resultante de fuerzas con valencia, dirección y magnitud en un espacio vital. La formalización «la intención es un vector, la marca ejerce atracción, el usuario orbita» es lewiniana casi término a término; la `intensity` 0..1 conecta además con la fuerza de la intención conductual de Ajzen (1991). El mapeo completo está en [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md), sección 3.1.
- **El vector no se calcula: se declara.** No existe fórmula determinista del momentum en ningún punto del sistema; intensidad, dirección y velocidad son salida estructurada del LLM guiada por descripciones de esquema (`lib/momentum.ts`, `lib/agents.ts`). Es una **medición declarativa simulada** y así debe presentarse. El detalle de dónde se emite y qué se hace (y qué no) con él está en la sección 8.

## 3. Los tres planos de influencia

Para influir en la órbita del usuario se activan tres **planos de influencia**. No son etapas del funnel: son **superficies de acción que el usuario cruza constantemente**, en cualquier orden y varias veces.

| Plano | Función gravitacional | Qué hace | Momento respecto al clic |
|---|---|---|---|
| **Construction Plane** | Crea el contexto gravitacional. | Define por qué una marca, producto o servicio **empieza a existir en la órbita del usuario**. Aquí se genera la primera atracción. | **Pre-clic** |
| **Acceleration Plane** | Modula el momentum. | Lo que está en el centro es la intención en cada momento: **cambia, se refuerza o se debilita en función de todas las interacciones** que recibe. | **Pre-clic** |
| **Value Plane** | Estabiliza la órbita. | Convierte una decisión puntual en una relación. **Aquí el usuario permanece.** | **En y post-clic** |

La última columna es la tesis hecha estructura: **Construction y Acceleration son la atracción que ocurre antes del clic** (crear la masa que atrae y modular el impulso hacia la marca), mientras que **Value es la validación y el blindaje de una decisión ya tomada fuera**. La gravedad no es solo lo que retiene al usuario una vez dentro: es, sobre todo, lo que lo **atrae hacia la marca antes de que entre**.

Cada cruce de plano **refuerza, redirige o estabiliza** el momentum. Cuando los tres planos están alineados, el sistema genera gravedad.

Aplicación del deck original (caso banca):

- **Construction Plane** → Hipersegmentación (IA y perfiles calibrados para captación).
- **Acceleration Plane** → Consultas IA, One Search, incrementalidad, atribución.
- **Value Plane** → Llegada al site, proceso de contratación, onboarding agéntico.

Cada momento de interacción es una oportunidad para reforzar la confianza y la percepción positiva de la marca, casi siempre antes de que el usuario decida visitarla.

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

La intención existe en el mundo del usuario, **antes de cualquier contacto con la marca**. Por eso el Construction Plane es el plano que mejor encarna la tesis: describe el estado mental con el que el usuario llega.

### 4.2 JTBD como lenguaje de la segmentación

El lenguaje formal del segmento de intención es el **Job To Be Done**:

> **Cuando [situación], quiero [motivación] para poder [resultado].**

- «Cuando recibo mi nómina, quiero separar mis ahorros para no gastarlos sin querer.»
- «Cuando viajo al extranjero, quiero cambiar divisa sin comisiones para no perder dinero.»
- «Cuando tengo un gasto inesperado, quiero aplazarlo sin llamar a nadie, en dos minutos.»

**Cada situación y motivación define un segmento. Cada segmento define un onboarding.** En SUAAS este formato es exactamente el campo `intent_context` de los perfiles.

### 4.3 Perfiles comportamentales e instancias

> Nota terminológica: el deck original habla de «agentes sintéticos». En SUAAS ese concepto se nombra **perfil comportamental** (y su realización operativa es el **perfil calibrado**); «usuarios sintéticos» queda reservado a la base teórica. Esta sección conserva la idea del deck con el vocabulario del producto.

El perfil comportamental es el cerebro de la hipersegmentación:

- Un **perfil comportamental** es un modelo generativo alimentado con investigación cualitativa real (entrevistas, etnografías, datos de comportamiento, características sociológicas, fuentes). No es un perfil demográfico: es una **representación computacional de cómo razona, qué teme y cómo toma decisiones** un tipo específico de usuario en un contexto específico. No describe quién es, sino cómo se relaciona con el dominio (en banca: con el dinero y con su banco, sus motivaciones, sus miedos, su nivel de confianza, cómo decide).
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

La certeza predictiva solo es creíble si la simulación está protegida contra sus propios sesgos. SUAAS implementa cuatro controles experimentales que sostienen esa credibilidad (detalle y fundamento en [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md), sección 4.3):

1. **Cegado del brief**: el brief del anunciante nunca se inyecta al perfil que evalúa; solo lo ve un juez neutral sin persona. Evita la cámara de eco (el riesgo 1 de la base teórica).
2. **Rúbricas por bandas** en todos los scores 0..1, con instrucción de usar el rango completo: evitan la tendencia central del evaluador.
3. **Orden razón→número**: los esquemas de salida generan percepción y razonamiento antes que los scores, para que el número salga del texto y no al revés.
4. **Negative prompting** en la persona («NO eres servicial ni complaciente», «escéptico ante el marketing... pides pruebas»): control de la complacencia del agente.

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

### 4.6 Cerebro: el contexto gravitacional de la marca

El Construction Plane no solo construye la **masa** que orbita (el perfil): también necesita la **identidad de la marca** que ejerce la atracción. En SUAAS esa capa es **Cerebro**, la base de conocimiento de marca reutilizable.

Cada marca guarda documentos (`brief`, `tono`, `producto`, `analytics`, `voc`, `informe`, `nota`) y un selector vuelca ese contexto en los campos «describe la marca» del resto de módulos. Es el **centro de masa informacional**: garantiza que la marca aparezca de forma coherente en todos los planos donde se calibra y se simula la atracción (GEO, Campañas, Claridad 5s, Copy). Sin Cerebro, cada módulo partiría de una marca distinta; con él, todos simulan la misma identidad.

Una propiedad clave para la tesis y para la confianza del cliente: los documentos marcados como **privados (ZDR)** se guardan pero **nunca se inyectan en los prompts** (quedan fuera de `buildBrandContext`), así que no viajan al gateway ni a los proveedores. Cerebro nutre la decisión pre-clic con conocimiento propio (analytics, VoC, informes) sin filtrarlo.

## 5. Acceleration Plane: escalado e interpretación por IA

Este plano transforma la intención del usuario en crecimiento sostenido y medible, modulando el momentum **antes de que el usuario decida visitar la web**. Dos frentes:

### 5.1 Performance: personalización guiada por la intención

Entender correctamente la intención de cada consulta (informativa vs. transaccional) y personalizar con IA:

- **Mensajes**: que el texto del anuncio sea relevante para la consulta específica del usuario.
- **Creatividades**: mostrar la creatividad más apropiada según el comportamiento del usuario.
- **URLs**: la mejor página de destino del site para cada consulta.
- **Audiencias**: dotar a la IA de señales para identificar la audiencia más propensa y de mayor calidad.

Complementado con cobertura de marca: share of voice, plan omnicanal, colaboraciones y alianzas, acciones de cobertura incremental (cTV, DOOH), con la hipersegmentación como foco para optimizar el performance. *(Estos conceptos, junto con «One Search», incrementalidad y atribución de la aplicación del deck en la sección 3, pertenecen al deck original de servicios de agencia: están fuera del alcance de la plataforma y no aparecen en el mapa de implementación.)*

El anuncio es uno de los lugares donde la decisión se inclina antes del clic: si el mensaje no encaja con la intención previa del usuario, no hay web que recupere esa pérdida.

### 5.2 GEO: el nuevo estándar de búsqueda

Cómo construyen hoy las respuestas los buscadores y modelos de lenguaje (los 4 pasos del deck):

1. **Interpretación de la intención**: el sistema interpreta qué busca realmente el usuario y en qué contexto (informativo, comparativo, crítico, decisional).
2. **Selección de fuentes relevantes**: la IA prioriza medios de comunicación, fuentes institucionales, plataformas especializadas y contenidos con recurrencia temática.
3. **Cruce y validación del relato**: las respuestas se construyen a partir de patrones comunes detectados entre múltiples fuentes, no de una única publicación.
4. **Generación de una narrativa sintetizada**: el modelo resume qué papel juega la marca en ese contexto y cómo debe interpretarse en relación con la consulta.

Implicación: la marca ya no se evalúa solo por sus activos, sino por **cómo aparece citada, en qué contextos se la menciona y con qué rol se la asocia cuando no controla el discurso**. Es la prueba más literal de la tesis: **el campo de batalla no es la web de la marca, es la respuesta sintetizada que el buscador de IA da antes de cualquier clic.** El módulo GEO de SUAAS simula exactamente este proceso por segmento de intención.

## 6. Value Plane: onboarding agéntico y propiedad psicológica

El Value Plane no contradice la tesis: la completa. Si Construction y Acceleration **atraen** al usuario y forman su decisión antes del clic, el Value Plane es donde esa decisión ya tomada se **valida y se blinda**, convirtiéndola en relación. La decisión llega hecha; aquí se confirma que la promesa era cierta y se evita que la órbita escape.

### 6.1 El alta como principio, no como final

El onboarding no es el final del proceso de captación: **es el principio de la relación**. El compromiso tras el alta no lo marca una operativa concreta, sino la capacidad de la marca para **integrarse de forma invisible en la toma de decisiones diaria** del usuario.

El deck propone el desplazamiento «de darse de alta en un banco a suscribirse a un ecosistema de valor», observando los modelos de suscripción de neobancos (Revolut): fidelización blindada (de la comisión transaccional a la cuota por servicio de valor), onboarding de fricción cero (la «suscripción» reduce la barrera psicológica frente al «alta» tradicional) y predicción de churn (los modelos de suscripción detectan patrones de abandono mucho antes que los basados en saldo).

### 6.2 Propiedad psicológica y aha moment

El verdadero final del onboarding no ocurre cuando se activa el producto, sino cuando se produce la **propiedad psicológica**: el **aha moment** en que el usuario deja de evaluar el producto como una opción externa y **lo integra en su identidad** (en banca, su identidad financiera). Tres propiedades clave:

- **No se puede diseñar de forma genérica.**
- **Es distinto para cada instancia.**
- **Sí se puede detectar para acelerarlo.**

Matiz importante para mantener coherente la tesis: hay que separar la **expectativa** del aha moment de su **validación**. La expectativa (la promesa que el usuario ya cree antes de entrar) es **pre-clic** y la construyen Construction y Acceleration; la validación (la experiencia que confirma esa promesa) es **post-clic** y la asegura el Value Plane. Ejemplo del deck (instancia «viajero frecuente»): el banco no se vuelve «suyo» al recibir la tarjeta física, sino en el primer pago en moneda extranjera con la notificación «Has pagado 1.200¥ (7,42€). Has ahorrado 0,35€ en comisiones». Ahí la promesa **prometida antes del clic** se valida y el producto se vuelve indispensable. El diseño debe **acelerar ese aha moment** fomentando que el usuario ejecute cuanto antes la acción que lo dispara.

Los neobancos diseñan onboardings de fricción cero para capturar el aha moment al instante, convirtiendo el alta en un proceso invisible que garantiza que **el impulso del usuario no se pierda en la burocracia**.

### 6.3 Onboarding por capas de activación

| Capa | Qué hace |
|---|---|
| **Descubrimiento** | El sistema detecta la **intención de origen** y personaliza el primer contacto (aha moment específico de la instancia). |
| **Adopción** | El producto se **desbloquea según la interacción**: cada acción del usuario activa el siguiente nivel de valor. Progreso percibido, momentos de recompensa, sentido de avance. |
| **Pertenencia** | **Inducción de hábitos recurrentes** para transformar el alta en principalidad (LTV). |

El producto se desbloquea en función de lo que el usuario hace, no de lo que la marca decide mostrar. Se pasa de un onboarding plano a un recorrido con hitos de recompensa que aceleran la decisión de pertenencia.

## 7. Los módulos como prueba de la tesis

Dos módulos merecen leerse no solo como funcionalidad, sino como la **demostración operativa** de que la decisión se forma antes del clic. Son la evidencia de que la tesis es accionable, no retórica.

- **Momentum** (Construction). Es el módulo que más literalmente prueba la tesis: define un *Trigger* (un escenario que enciende una necesidad) y simula cómo cada perfil reaccionaría en su vida real. Tiene **dos modos que la interpretación debe distinguir**: con el contexto de marca vacío (el caso por defecto) mide el momentum **desnudo, antes de que ninguna marca entre en el radar**; con `brand_context` relleno (desde v0.59 el selector de Cerebro lo hace de forma sistemática) mide el momentum **con la gravedad de una marca ya presente en el escenario**. Devuelve la cadena de decisión completa que ocurre fuera de la web: narrativa de intención, intensidad, dirección, velocidad, primeros pasos, canales y barreras, más el JTBD expresado en palabras del propio usuario. Conocer esos primeros pasos y canales es lo que permite a la marca **insertarse en el recorrido temprano** en vez de esperar al usuario en el site.
- **GEO Tester** (Acceleration). Lanza la query de cada segmento de intención, desnuda y sin instrucciones, contra Claude, ChatGPT y Perplexity reales con búsqueda web, y analiza la respuesta: ¿aparece la marca?, ¿en qué posición?, ¿con qué tono?, ¿qué le falta comunicar para entrar en esa respuesta? Es la decisión condicionándose **en la respuesta de la IA, antes del clic**, medida con motores reales.

Entre los dos cubren los dos planos pre-clic: Momentum mide el momentum **antes** de que la marca exista para el usuario; GEO mide qué hace la marca con ese momentum **en el primer punto de contacto, que ya no es la web**.

## 8. Mapa teoría → implementación en SUAAS

> **Verificado contra el código a v0.61.15 (2026-07-19).** Este mapa caduca con cada cambio funcional: al tocar un módulo listado aquí, actualizar su fila en la misma sesión (regla 1 de `CLAUDE.md`). Las citas van por archivo y migración concreta, no por rangos.

Los módulos se agrupan por plano, igual que la navegación de la app (`/gravity`). La columna «momento» ancla cada uno a la tesis: la mayoría de la plataforma trabaja **antes del clic**.

### Construction Plane (pre-clic): crear la masa y medir su intención

| Módulo | Ruta | Propósito | Concepto del modelo | Momento | Dónde |
|---|---|---|---|---|---|
| **Perfiles** | `/profiles` | Crea y gestiona perfiles calibrados (vignette grounded: demografía, Big Five, COM-B, backstory, JTBD) por cuatro vías: formulario manual, CSV (17 columnas, máx. 500 filas), generación LLM desde 50 briefs curados (Opus) y el onboard público «gemelo digital» (HEXACO-24 con scoring determinista). Permite chatear con ellos: el Reasoner (Opus) emite un plan y el vector `momentum {intensity, direction, velocity}` por turno; el Talker (Sonnet) responde en voz del perfil. Retratos IA opcionales y papelera con soft delete que protege los runs históricos. | Intent Momentum, JTBD (`intent_context`), COM-B, Talker-Reasoner | Pre-clic | `lib/profiles.ts`, `lib/prompts.ts`, `lib/agents.ts`, `lib/seed-profiles.ts`, `lib/onboard.ts`, `lib/hexaco.ts`, `app/profiles/[id]/chat-panel.tsx` |
| **Momentum** | `/momentum` | Triggers de activación y simulación de cómo cada perfil los abordaría: narrativa, intensidad, dirección, velocidad, primeros pasos, canales, barreras, JTBD expresado. Dos modos: momentum desnudo (sin marca, el caso por defecto) o con contexto de marca de Cerebro. **Atención**: su prompt de persona es reducido (demografía, backstory y JTBD; sin Big Five, sin COM-B, sin negative prompts). | Intent Momentum ante-touchpoint | Pre-clic | `lib/momentum.ts`, tabla `momentum_challenges` (migración 0016; papelera en 0017) |
| **Claridad 5s** | `/targets` | Muestra una pantalla 5 segundos y la oculta; el perfil dice qué recuerda y un juez sin persona compara contra la promesa principal (`comprehension_rate`, rúbrica por bandas). El propio perfil autoclasifica su `behavior_class`. Agrega `mean_clarity`, `mean_comprehension`, `top_barriers` y `behavior_counts`. | Conductas óptima / fuga / repesca, certeza predictiva del primer vistazo | Pre-clic | `lib/experiments/five-second.ts`, tabla `five_second_responses` (migración 0002; `behavior_class` en 0015) |
| **Embudos** *(beta)* | `/funnels` | El perfil recorre el flujo paso a paso con su carga cognitiva real; un agente multimodal (Sonnet, una pasada por paso, con memoria episódica de los pasos previos) ve cada pantalla y decide si continúa; el abandono corta el recorrido de verdad. `effort`, `intent_match`, `completion_rate`, `dropoff_by_step` y fricción por paso, sin tráfico real. | Certeza predictiva, mapa de fricción | Pre-clic | `lib/experiments/funnel.ts`, `funnel_step_responses` (migraciones 0003, 0004) |

### Acceleration Plane (pre-clic): modular el momentum hacia la marca

| Módulo | Ruta | Propósito | Concepto del modelo | Momento | Dónde |
|---|---|---|---|---|---|
| **GEO Tester** | `/geo` | Proceso en dos pasos: (1) sonda real con búsqueda web por motor (Claude, ChatGPT y Perplexity, con citas), lanzando la query de cada segmento JTBD desnuda y sin instrucciones; (2) análisis con Sonnet que puntúa `brand_mentioned`, `visibility_score`, `brand_position`, `recommendation_tone`, `key_claims`, `missing_attributes`. Modelo configurable por motor (`app_settings.geo_engine_models`, editable en `/tokens`). | GEO / nuevo estándar de búsqueda | Pre-clic | `lib/geo.ts`, `lib/geo-engines.ts`, `geo_analyses` (migraciones 0015, 0017 y 0023) |
| **Campañas** | `/campaigns` | Enfrenta cada perfil al anuncio bajo su query, en 5 canales (`google`, `meta`, `linkedin`, `tiktok`, `x`) y 13 estrategias (search, display, pmax, demand_gen, video, shopping, formatos Meta y TikTok; `app` declarada sin implementar). Solo si `intent_to_click ≥ 0,5` se le muestra la landing: la atracción se juega en el anuncio. Controles: cegado del brief (solo lo ve el juez neutral de comprensión), rúbricas por bandas, orden razón→score, muestreo determinista de combinaciones (reproducible por perfil y query), chequeo `behavior_inconsistencies` y `behavior_class` con semántica de ads. Propone la versión ideal por perfil y una síntesis LLM de recomendaciones. | Performance guiado por intención, conductas, decisión pre-web | Pre-clic | `lib/experiments/campaign.ts`, `lib/campaigns.ts` (migraciones 0008 a 0014 y 0018 a 0022) |

### Value Plane (en y post-clic): validar y blindar la decisión

| Concepto | Estado | Nota |
|---|---|---|
| Onboarding agéntico, propiedad psicológica, capas de activación | **Sin módulo propio aún** | El plano que valida y retiene la decisión ya tomada está identificado en la teoría pero no construido. Ver «Conceptos sin implementación». |

### Herramientas transversales (Knowledge Tools): sustrato y bancos de prueba

No son un plano: son instrumentos que alimentan o calibran a los módulos de los planos. Casi todos miden la decisión **aguas arriba de la web**.

| Módulo | Ruta | Propósito | Concepto del modelo | Plano que sirve | Dónde |
|---|---|---|---|---|---|
| **Cerebro** | `/cerebro` | Base de conocimiento de marca: documentos (`brief`, `tono`, `producto`, `voc`, `analytics`, `informe`, `nota`) que un selector inyecta como contexto en los demás módulos. Flag `sensitive` (privado / ZDR) que excluye documentos de los prompts. Desde v0.63.0 con **RAG**: los documentos no sensibles se vectorizan (pgvector, `openai/text-embedding-3-small`) y GEO y Momentum recuperan solo los fragmentos relevantes por similitud (por segmento y por trigger respectivamente), con fallback al volcado clásico; los documentos van delimitados por los guardarraíles anti-inyección (v0.62.0). | Contexto gravitacional de la marca | Construction (sustrato de todos) | `lib/cerebro.ts`, `lib/rag.ts`, tablas `brands`, `brand_documents` y `brand_document_chunks` (migraciones 0025, 0026 y 0029) |
| **Copy** | `/copy` | Test de resonancia de copy puro: cada perfil reacciona a 2-10 bloques de texto aislados (sin diseño ni marca). `persuasion`, `would_click`, `sentiment`, `clarity` por bloque; elige el `top_block`. | Captación aguas arriba (ads, subjects, ganchos) | Construction / Acceleration | `lib/copy.ts`, `lib/experiments/copy.ts` (migración 0006) |
| **A/B tests** *(beta)* | `/ab` | Enfrenta dos pantallas (variantes A/B) con el mismo set de perfiles vía el test de claridad 5s. Compara `mean_clarity`, `mean_comprehension` y `behavior_counts`. | Conductas, método experimental | Construction | `lib/ab.ts`, `lib/experiments/ab.ts`, `ab_tests` / `ab_test_runs` (migración 0006) |
| **Pricing** *(beta)* | `/pricing` | Elasticidad de precio: cada perfil reacciona a cada nivel de precio (`would_buy`, `willingness_to_pay`, `perceived_value`). Calcula el `sweet_spot` (`would_buy_rate × price`). | Estabiliza la órbita por precio (afín a Value) | Value (conceptual) / Construction | `lib/pricing.ts`, `lib/experiments/pricing.ts` (migración 0006) |

### Motor de los perfiles (transversal a todo el modelo)

La anatomía completa del perfil, sus fundamentos académicos y sus límites están en [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md). Lo esencial para este mapa, incluidas las excepciones que rompen la uniformidad aparente:

| Concepto del modelo | Implementación real | Dónde |
|---|---|---|
| Perfiles calibrados grounded | Demografía + Big Five (0..1) + COM-B + backstory + JTBD, serializados por `buildSystemPrompt` (la única función de voz del perfil) con negative prompting anti-complacencia. | `lib/profiles.ts`, `lib/prompts.ts`, base teórica en `CONOCIMIENTO-USUARIOS-SINTETICOS.md` |
| Talker-Reasoner (Sistema 1/2) | **Solo en el chat 1:1** (Opus planifica, Sonnet habla). Todos los experimentos batch (5s, A/B, embudos, copy, pricing, campañas) son una sola pasada con Sonnet que colapsa deliberación y expresión. | `lib/agents.ts`, `app/api/chat/route.ts` |
| Fidelidad por módulo | **Excepción conocida**: el módulo Momentum no usa `buildSystemPrompt`; su persona ad hoc omite Big Five, COM-B y los negative prompts. Los jueces (5s, campañas) van sin persona por diseño (cegado). | `lib/momentum.ts:110-132`, `lib/experiments/campaign.ts` |

### Estado del vector Intent Momentum (dónde se emite y qué se hace con él)

- **Se emite en dos superficies**: en el chat, por turno, dentro del plan del Reasoner (Opus); en el módulo Momentum, por perfil y escenario (Sonnet). En ambas es salida declarada del LLM guiada por descripciones de esquema: **no hay fórmula determinista, ni temperatura, ni muestreo** en ningún punto del proyecto.
- **Lo que todavía no hace**: en el chat, el vector no se pasa al Talker ni se persiste como métrica agregada (solo se pinta en la UI; la única métrica de sesión derivada del plan es `effort_ratio`, la media de los `effort` por turno). El Reasoner no tiene memoria de sus propios planes: re-infiere el estado y la «velocidad» cada turno desde el texto visible, sin serie temporal real. Ningún módulo cruza el vector con `behavior_class`. Estos tres huecos son la base técnica de los pendientes «gravedad agregada» y «evolución temporal» de la lista de abajo.

### Las dos semánticas de `behavior_class`

El enum es único (`optima` / `fuga` / `repesca`) pero el criterio operacional cambia por módulo; cualquier comparación inter-módulo debe explicitarlo. En ambos casos la clasificación la hace el propio agente sobre su conducta («Clasifica TU propia conducta») y NULL significa «sin clasificar» (filas anteriores al Gravity Model).

| Módulo | óptima | fuga | repesca |
|---|---|---|---|
| Claridad 5s (migración 0015) | Entendió y seguiría hacia la acción | Carga cognitiva o promesa poco clara: abandonaría | Dudas, pero la intención sigue viva |
| Campañas (migración 0019) | Conecta con su intención: haría click | Ignora el anuncio y sigue con lo suyo | Sin click ahora, pero la necesidad sigue viva |

En embudos, copy y pricing la taxonomía no existe (el embudo colapsa fuga y repesca en el booleano `would_continue`).

### Conceptos del modelo aún sin implementación directa

Huecos identificados (insumo para el roadmap), reverificados contra v0.61.15. Esta lista está duplicada con redacción propia en el componente `ConceptosPendientes` de la página `/gravity` (`app/gravity/conceptos-pendientes.tsx`): este documento es la fuente de verdad; al cambiar la lista, sincronizar el componente en la misma sesión.

- **Value Plane completo**: no hay simulación post-alta (descubrimiento, adopción, pertenencia, hábito recurrente, churn). Es el plano con menos cobertura: la plataforma es hoy fuerte en pre-clic (Construction + Acceleration) y débil en post-clic (Value).
- **Instancias** como entidad: SUAAS tiene perfiles individuales, pero no el par «perfil comportamental → N instancias» (mismo comportamiento, orígenes y aha moments distintos).
- **Gravedad agregada**: no existe una métrica que sume el momentum de las interacciones de una cohorte en una «fuerza gravitacional» de la marca, ni vista que cruce el momentum entre módulos.
- **Mapa de fricción priorizado por impacto** cruzando todas las instancias (sección 4.5): los embudos ya rankean fricciones por frecuencia entre perfiles (`top_friction`), pero falta la dimensión «instancia» como entidad y la regla de severidad «lo que falla en todas las instancias se toca primero».
- **Aha moment por instancia** (6.2): no se modela ni detecta el momento de propiedad psicológica.
- **Repesca accionable**: `behavior_class='repesca'` se cuenta pero no genera la «ventana de recuperación» (qué mensaje recuperaría a ese usuario). El hueco es menor de lo que parece: campañas ya recoge la «versión ideal por perfil», materia prima directa de esa ventana.
- **Evolución temporal del momentum**: el vector se mide por interacción, pero no se traza su trayectoria a lo largo del tiempo ni entre touchpoints (ver «Estado del vector Intent Momentum» más arriba: hoy ni siquiera se persiste como métrica en el chat).
- **GEO pendiente**: AI Overview (vía SerpAPI) y Gemini como cuarto y quinto motor (la pestaña «Próximamente» ya existe en la UI). La monitorización GEO periódica con cron quedó **descartada por decisión de producto** (19-jul-2026): la varianza inter-run se gestiona repitiendo análisis a mano cuando haga falta.

## 9. Síntesis: el trabajo se desplaza a la órbita

Si la decisión se toma antes de llegar a la web, entonces la pregunta estratégica deja de ser «cómo convierto el tráfico que llega» y pasa a ser «cómo influyo en la órbita del usuario antes de que llegue». El Gravity Model es el marco para esa pregunta y SUAAS es el instrumento:

- **Construction** mide y construye la intención antes de que la marca exista para el usuario (Perfiles, Momentum, Claridad 5s, Embudos, con Cerebro como contexto de marca).
- **Acceleration** modula esa intención en el primer punto de contacto, que ya no es la web sino la respuesta de la IA o el anuncio (GEO, Campañas).
- **Value** valida y blinda, dentro de la web, una decisión que llegó hecha (pendiente de construir).

Dos tercios del modelo, y casi toda la plataforma, trabajan **antes del clic**. Esa es la apuesta de SUAAS: no esperar al usuario en la web, sino **atraerlo a la marca mientras todavía está decidiendo, fuera**.

## 10. Glosario

| Término | Definición corta |
|---|---|
| **Intent Momentum** | La intención del usuario expresada como vector: intensidad (0..1), dirección (approaching / stable / drifting) y velocidad (accelerating / steady / decelerating). |
| **Gravedad** | Fuerza acumulada que atrae al usuario hacia la órbita de la marca y lo mantiene en ella; suma del efecto de todas las interacciones sobre su momentum. |
| **Órbita** | Trayectoria no lineal del usuario alrededor de la marca; sustituye al funnel. La web es un punto de la órbita, no su origen. |
| **Plano de influencia** | Superficie de acción (no etapa) que el usuario cruza constantemente: Construction, Acceleration, Value. |
| **Pre-clic / post-clic** | Eje que ordena el modelo: Construction y Acceleration atraen y forman la decisión antes del clic; Value la valida en y después de la web. |
| **Segmento de intención** | Grupo definido por un JTBD («Cuando [situación], quiero [motivación] para poder [resultado]»), no por demografía. |
| **Perfil comportamental** | Representación computacional de cómo razona, teme y decide un tipo de usuario en un contexto. |
| **Instancia** | Historia concreta que explica por qué existe un perfil comportamental; mismo comportamiento, palancas de cambio distintas. |
| **Conducta óptima / fuga / repesca** | Clasificación del comportamiento ante la acción principal de un flujo: completa sin fricción / abandona por coste percibido / abandona con intención viva. |
| **Aha moment / propiedad psicológica** | Momento en que el usuario integra el producto en su identidad; su expectativa es pre-clic, su validación post-clic; específico por instancia, detectable y acelerable. |
| **GEO** | Generative Engine Optimization: influir en cómo los motores de respuesta IA interpretan, citan y recomiendan la marca antes del clic. |
| **Cerebro** | Base de conocimiento de marca de SUAAS; contexto gravitacional reutilizable que se inyecta en los módulos. Documentos privados (ZDR) que no salen al gateway. |
| **Trigger (SUAAS)** | Escenario de activación JTBD sobre el que se simula el momentum de los perfiles antes de cualquier touchpoint de marca. |
| **Perfil calibrado** | Término de producto: la realización operativa del perfil comportamental en SUAAS (registro estructurado + agente LLM). En el onboard público se llama «gemelo digital» cuando lo protagoniza una persona real. |
| **Medición declarativa simulada** | Naturaleza de todas las métricas del vector y de los scores: valores que el LLM declara guiado por esquemas y rúbricas, no calculados por un modelo formal. Sin fórmula, sin muestreo, sin validación contra conducta humana real. |
| **SUAAS / Gravity** | SUAAS es el producto interno; Gravity, la marca de la superficie comercial (página `/gravity`, landing `/propuesta`, onboard). El marco teórico se llama Gravity Model en ambos contextos. |
