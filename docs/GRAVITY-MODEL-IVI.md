# Gravity Model aplicado a IVI

> Material teórico para presentación. Sirve de puente entre la teoría (el Gravity Model) y la demo: primero el problema, después la solución que aporta cada plano, y a continuación, con la herramienta, veremos cómo se resuelve en la práctica. Todos los ejemplos están centrados en IVI (reproducción asistida).

---

## La tesis: la paciente decide antes de llegar a la web

Una futura mamá tarda de media **18 meses** desde que sospecha un problema de fertilidad hasta que pide la primera consulta. En ese tiempo compara 2 o 3 clínicas, lee foros, pregunta a la IA, escucha podcasts, habla con su ginecólogo y con su entorno. Cuando por fin entra en la web de una clínica y rellena el formulario, **ya casi ha decidido en quién confiar**.

> La web ya no es donde se elige. Es donde se confirma una elección que se formó fuera.

Esto cambia la pregunta estratégica. Deja de ser «cómo convierto el tráfico que llega a ivi.es» y pasa a ser «**cómo entro en la decisión de la paciente mientras todavía está decidiendo, fuera de mi web**». El Gravity Model es el marco para responder a esa pregunta.

## El problema: el funnel ha caducado, ahora hay órbitas

El modelo clásico (el embudo) asume que la marca controla un recorrido que **empieza cuando el usuario entra**: visita, awareness, consideración, conversión. Para una decisión como la de IVI eso ya no describe la realidad:

- La decisión es **no lineal**: la paciente avanza, se frena tras un ciclo fallido, vuelve a comparar, lo pospone por dinero, lo retoma por la edad.
- La decisión es **emocional y de alto riesgo**: ticket de 6.000 a 9.000 euros, carga emocional máxima, y un miedo dominante distinto en cada caso.
- La decisión se forma **en canales que la marca no controla**: la respuesta de una IA, un hilo de foro, el testimonio de una conocida.

En lugar de un embudo, la paciente **orbita** alrededor de las clínicas que considera. Cada interacción (un anuncio, una respuesta de ChatGPT, una página de tasas que no entiende) **refuerza, redirige o debilita** su intención. La suma de todas esas fuerzas es la **gravedad**: lo que atrae a la paciente hacia una marca, o la deja escapar hacia la competencia (Ginefiv, Eugin, Institut Marquès, Dexeus, IVF-Life).

## Intent Momentum: la intención como vector

Lo que está en el centro no es la paciente, es **su intención en cada momento**. Y la intención no es binaria («tiene o no tiene»): es un vector con tres componentes.

| Componente | Qué mide | Ejemplo IVI |
|---|---|---|
| **Intensidad** | Cuánta motivación hay para actuar ahora (escala 0..1, como en la plataforma). | Mujer de 41 con dos FIV fallidas: intensidad muy alta, siente el reloj. |
| **Dirección** | Hacia dónde se mueve: se acerca a la solución, está parada o se aleja. | Tras el segundo fallo puede «alejarse» (desánimo) aunque la urgencia siga ahí. |
| **Velocidad** | Cómo cambia el momentum en el tiempo: se acelera, constante o se disipa. | El límite de edad de la sanidad pública «acelera» a la derivada de 39. |

La consecuencia para IVI es directa: **la paciente llega a la web con un momentum que ya existe**. La web no crea la intención, la intercepta. Por eso el trabajo de mayor impacto es **medir y modular ese vector antes del clic**. Para eso están los tres planos.

---

## Los tres planos de influencia

No son etapas de un embudo. Son **superficies de acción** que la paciente cruza una y otra vez, en cualquier orden. Dos de los tres ocurren **antes del clic**.

| Plano | Función | Momento |
|---|---|---|
| **Construction** | Crea el contexto: por qué IVI empieza a existir en la órbita de la paciente. La primera atracción. | Antes del clic |
| **Acceleration** | Modula el momentum: refuerza o debilita la intención con cada interacción. | Antes del clic |
| **Value** | Estabiliza la órbita: convierte una decisión puntual en una relación. | En y después del clic |

A continuación, cada plano con su problema, su solución y el puente a la demo.

---

## Plano 1 · Construction: hacer que IVI exista en la órbita correcta

### El problema

IVI segmenta como casi todo el sector: por **demografía** o por **tratamiento**. Pero dos mujeres de 38 años pueden ser mundos opuestos:

- Una **preserva** su fertilidad por carrera: su miedo es «pagar por algo que quizá no use» y que le digan que «se le pasa el arroz».
- La otra arrastra **abortos de repetición**: viene quemada de otra clínica, su miedo es revivir el duelo y no encontrar la causa.

Mismo dato demográfico, **palancas de decisión radicalmente distintas**. Un mensaje genérico («9 de cada 10 consiguen ser madres») no atrae a ninguna de las dos en concreto, y a la segunda incluso puede herirla. Y todo esto ocurre **antes** de que ninguna de las dos haya pisado ivi.es.

### La solución del plano

Sustituir la segmentación demográfica por **hipersegmentación por intención**. La unidad no es «mujer 35-40», es el **trabajo que quiere resolver** (Job To Be Done):

> Cuando [situación], quiero [motivación] para poder [resultado].

- «Cuando llevo más de un año intentándolo sin éxito, quiero saber qué clínica ofrece más garantías reales para decidir dónde empezar.»
- «Cuando decido aplazar la maternidad, quiero entender precio y fiabilidad de la congelación para elegir dónde preservar.»
- «Cuando me deriva la pública por edad, quiero empezar ya sin perder mis últimas oportunidades.»

**Cada situación define un segmento; cada segmento define un mensaje, un miedo a desactivar y un momento óptimo.** Las técnicas del plano:

- **Mapa de intención por segmento**: para cada uno de los 12 segmentos de IVI (FIV primaria, ovodonación 40+, madre soltera por elección, ROPA, preservación social, factor masculino, secundaria, aborto de repetición, DGP, sensible a precio, derivada de la pública, internacional), su miedo dominante y su lenguaje. Estos segmentos ya están encarnados en la plataforma: existen **15 perfiles calibrados reales** construidos con investigación verificada ([`IVI-PUBLICO-OBJETIVO.md`](./IVI-PUBLICO-OBJETIVO.md)), sin mención de marca en sus intents y backstories. El «miedo dominante» no es un campo estructurado de la plataforma: vive en la narrativa de cada perfil (backstory y barreras COM-B).
- **Medir el momentum antes de que la marca entre en el radar**: anticipar qué piensa la paciente, qué primeros pasos da (buscar en Google, preguntar en un foro, ir al ginecólogo) y por qué canales, **antes** de cualquier contacto con IVI.
- **Test de claridad del primer vistazo**: comprobar si el mensaje principal se entiende en los primeros segundos, que es todo lo que dura la primera impresión.

### Cómo optimizamos para IVI

- Construir un JTBD y una pieza específica por segmento, no una landing «para todos». La de **factor masculino** desactiva el estigma; la de **ROPA** habla de filiación legal de ambas madres y trato inclusivo; la de **derivada de la pública** ataca el reloj de la edad.
- Cuidar el **lenguaje que daña** (el propio manifiesto de IVI, «El Lenguaje de la Fertilidad», lo señala): un copy que suene a juicio expulsa a la paciente de la órbita en el primer vistazo.
- Empezar a corregir el mensaje **antes de lanzar**, no descubriendo en analítica que la landing no convierte.

### Con la herramienta veremos el cómo

Veremos cómo **ponemos un mensaje o una pantalla delante de cada segmento del público objetivo** y medimos, en segundos y sin gastar tráfico: si la promesa se entiende, qué fricción genera, qué miedo se activa y si la paciente seguiría adelante o abandonaría. Es la primera atracción, simulada antes de existir.

---

## Plano 2 · Acceleration: modular la intención en el punto donde hoy se decide

### El problema

La paciente de IVI no empieza en ivi.es. Empieza preguntando: *«mejor clínica de fertilidad en España para FIV»*, *«congelar óvulos precio y mejores clínicas»*, *«tasas de éxito FIV comparativa»*. Y el buscador de IA **no muestra diez enlaces: construye una respuesta** a partir de foros, el registro SEF, prensa y las webs de las clínicas, y recomienda. **Ahí se inclina la decisión, antes de cualquier clic.**

El dato real lo confirma: en la medición de junio de 2026 contra Claude, ChatGPT y Perplexity (protocolo y datos exactos en [`GEO-PRUEBA-IVI.md`](./GEO-PRUEBA-IVI.md)), la visibilidad media de IVI quedó en torno al **49% al 62%**, y en varias consultas la marca aparecía **secundaria o ausente** frente a la competencia. *(El GEO tiene varianza entre ejecuciones: estas cifras son la foto de aquella medición, no un valor estable; lo que importa es la tendencia.)* En paralelo, el performance de pago suele tirar de creatividades genéricas («tu sueño de ser madre») que no encajan con la intención concreta de cada búsqueda.

### La solución del plano

Modular el momentum en cada interacción previa al clic. Dos frentes:

- **GEO (optimización para motores generativos)**: influir en **cómo la IA interpreta, cita y recomienda** a IVI. La marca ya no se evalúa solo por sus activos, sino por cómo aparece citada y con qué papel cuando no controla el relato. La IA hace cuatro cosas: interpreta la intención, selecciona fuentes, cruza el relato entre varias y sintetiza una narrativa. El trabajo es entrar en esa narrativa con el rol correcto.
- **Performance guiado por intención**: adaptar **mensaje, creatividad, página de destino y audiencia** a la intención específica de cada consulta, en lugar de un anuncio único para todo el público.

### Cómo optimizamos para IVI

- **Cerrar los huecos que detecta la IA.** En la medición de junio de 2026, los atributos que faltaban de forma consistente eran **«tasas de éxito verificadas (SEF) por grupo de edad»** y **«volumen de ciclos realizados»**. Comunicar eso de forma estructurada y citable es lo que hace que la IA pase a IVI de secundaria a protagonista en la respuesta.
- **Resolver el matiz de las tasas como ventaja, no como riesgo.** IVI comunica 97% al 99% acumulado a tres ciclos (auditado por SGS), mientras el registro independiente SEF mide en torno al 26% al 43% de parto por transferencia según la edad. No es contradicción (miden cosas distintas), pero la IA y la paciente informada lo notan. Explicarlo con honestidad convierte un punto débil percibido en **confianza diferencial**.
- **Adaptar la creatividad al público objetivo.** La consulta de **preservación social** recibe una pieza sobre congelar óvulos con precio transparente y el alivio del «no pagar por algo que no uses»; la de **ovodonación 40+** una pieza que respeta el duelo genético; la de **comparar tasas** una pieza con cifras verificables, no con un claim aspiracional.

### Con la herramienta veremos el cómo

Veremos cómo **lanzamos las consultas reales de cada segmento contra los buscadores de IA** y leemos si IVI aparece, en qué posición, con qué tono y **qué atributo le falta** para ganar la respuesta. Y cómo **enfrentamos cada creatividad a su segmento** para saber qué mensaje se gana el clic, antes del clic.

---

## Plano 3 · Value: validar y blindar una decisión que llega casi tomada

### El problema

Si los dos planos anteriores funcionan, la paciente llega a IVI **ya convencida**. Pero el camino de la reproducción asistida es largo, caro y emocional, y está lleno de puntos de fuga:

- Un **primer paso confuso** que añade carga cognitiva en un momento de máxima vulnerabilidad.
- Un **choque de precio** cuando llega el presupuesto (IVI no publica precios: la paciente proyecta lo que se imagina).
- Un **ciclo fallido** que reactiva todos los miedos.
- La **letra pequeña** de la garantía o el gap entre la tasa que se prometió y la que se vive.

Como la paciente comparó 2 o 3 clínicas, cualquiera de estas fugas la devuelve a la órbita de la competencia.

### La solución del plano

Convertir el alta en el **principio de una relación**, no en el final de una captación. La promesa que se hizo antes del clic hay que **validarla** cuanto antes. Técnicas:

- **Recorrido por capas**: descubrimiento (personalizar el primer contacto al miedo de origen), adopción (cada paso desbloquea el siguiente con sensación de avance) y pertenencia (acompañamiento que induce confianza y continuidad).
- **Aha moment por segmento**: el instante en que la paciente deja de evaluar IVI como una opción externa y la integra como «su» clínica. No es genérico, es distinto en cada caso, y se puede **acelerar**.
- **Anticipar la fuga**: detectar qué paso o qué mensaje haría abandonar a cada segmento, y qué lo recuperaría.

### Cómo optimizamos para IVI

- **Acelerar el aha moment correcto por segmento**: para la **derivada de la pública**, el momento en que ve que puede empezar ya sin el corte de edad; para la **internacional**, la primera coordinación a distancia que funciona sin fricción; para la **sensible a precio**, ver que la financiación a 0% y la garantía IVI Baby desactivan el miedo a «arriesgar los ahorros».
- **Honestidad como blindaje**: explicar tasas acumuladas frente a por transferencia por edad antes de que la paciente lo descubra fuera. La honestidad percibida es lo que sostiene la órbita cuando llega un ciclo fallido.
- **Reencuadrar el primer paso** para que active motivación («tu camino, acompañada») en lugar de generar burocracia.

### Con la herramienta veremos el cómo

**Este plano es visión, no capacidad actual.** La herramienta concentra hoy su fuerza donde se gana la decisión: los dos planos previos al clic (el Value Plane no tiene módulo construido; ver los conceptos pendientes de [`GRAVITY-MODEL.md`](./GRAVITY-MODEL.md)). El Value Plane es la extensión natural del mismo método: **simular el recorrido posterior paso a paso** para anticipar dónde abandonaría cada segmento y qué mensaje lo recuperaría, antes de que ocurra con pacientes reales.

---

## Resumen: el mapa de la presentación

| Plano | Problema en IVI | Técnica moderna | Cómo optimizamos | Momento |
|---|---|---|---|---|
| **Construction** | Segmentar por demografía no explica decisiones opuestas con el mismo perfil. | Hipersegmentación por intención (JTBD); test del primer vistazo. | Mensaje, miedo y momento por segmento; corregir antes de lanzar. | Antes del clic |
| **Acceleration** | La IA decide por la paciente al sintetizar la respuesta; IVI aparece secundaria o ausente. | GEO; performance y creatividades guiados por intención. | Cerrar huecos (tasas SEF por edad, volumen); creatividad por segmento. | Antes del clic |
| **Value** | La decisión llega hecha pero el camino es largo y lleno de fugas. | Recorrido por capas; aceleración del aha moment; honestidad. | Validar la promesa por segmento; anticipar y recuperar la fuga. | En y post-clic |

## La idea para cerrar

Dos de los tres planos ocurren **antes del clic**. Por eso la estrategia se desplaza de «esperar a la paciente en la web» a **atraerla hacia IVI mientras todavía está decidiendo, fuera**: midiendo su intención antes de que la marca exista para ella, entrando con el rol correcto en la respuesta de la IA, y adaptando cada mensaje al miedo y al momento de cada segmento.

Eso es la teoría. A continuación, con la herramienta, vemos el cómo.
