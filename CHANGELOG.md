# Changelog

Cambios notables de **Gravity**, agrupados por release y legibles de un vistazo. El detalle técnico versionado (desde v0.1, con fichero:línea y decisiones) vive en [`docs/ROADMAP.md`](./docs/ROADMAP.md). Formato inspirado en [Keep a Changelog](https://keepachangelog.com); versión en `lib/version.ts` y `package.json` (SemVer).

## [0.79.0] · 2026-07-23

### Added

- **Vercel Web Analytics** (`@vercel/analytics`): analítica de uso **cookieless** y **first-party** (`/_vercel/insights`), sin GTM ni datos a terceros, para ver el uso interno de la app (pageviews por ruta). Componente `<Analytics />` en el layout raíz. **Paso manual pendiente**: habilitar Web Analytics en el dashboard del proyecto en Vercel (Project → Analytics) para que empiece a recopilar.

### Changed

- La `description` de metadata se alinea con la redefinición al valor («Plataforma de validación temprana…»).

## [0.78.3] · 2026-07-23

### Changed

- **El onboarding explica inline la mecánica conductual, la decisión, los intents y la lógica del juez**: dentro de los bloques existentes (sin secciones nuevas) se amplía: §02 qué hacen las capas (COM-B como predictor de fricción, el vector Intent Momentum con el significado de intensidad/dirección/velocidad); §03 la toma de decisión óptima/fuga/repesca y de dónde sale el contexto (VoC + Cerebro/RAG, con la aclaración «Gravity simula, no rastrea»); §05 la lógica fina del juez (qué respuesta recibe: voz + barreras, no campos mecánicos; fidelidad vs comprensión; `failure_mode`; razón→score).

## [0.78.1] · 2026-07-23

### Changed

- **Fuera «usuarios sintéticos» de la documentación; «perfiles calibrados» como evolución del buyer persona**: se elimina el término «usuarios sintéticos» de la documentación y se enmarca «perfiles calibrados» como una evolución del buyer persona (de ficha estática a representación que reacciona). Se renombra el doc base `CONOCIMIENTO-USUARIOS-SINTETICOS.md` → `BASE-CONOCIMIENTO.md` (34 referencias al nombre actualizadas) y se reformula su contenido; en las citas académicas se convierten las comillas literales en paráfrasis y se omiten los títulos de papers que contienen el término (conservando autor/año/DOI/arXiv, que los identifican sin falsear). Actualizada la regla de nomenclatura en `CLAUDE.md`. Excepciones conservadas a propósito: la categoría de mercado de competidores en `Plan-venta.md` y las entradas históricas del changelog que documentan renombrados pasados.

## [0.78.0] · 2026-07-23

### Added

- **Visor de documentación dentro de la app** (`/docs` y `/docs/[slug]`): la documentación viva del repositorio (`docs/*.md`) se lee dentro de la app, renderizada con los estilos del design system, en vez de tener que ir al repositorio. Índice agrupado por tema en `/docs` y visor por documento. Las referencias `.md` del onboarding (orden de lectura, mapa de documentos y menciones inline) pasan a ser **enlaces** al visor. Los enlaces internos entre docs también navegan dentro del visor. Se genera en build y queda tras el gate de auth.

### Changed

- **Hero de la home alineado con el valor**: el subtítulo deja de liderar con el mecanismo («Perfiles grounded… devolvemos el vector de intención…») y pasa al valor: «Valida la eficacia de un mensaje, una landing, un precio o una campaña antes de comprometer tráfico real. Sabes qué funciona antes de invertir en ello.»

## [0.77.2] · 2026-07-23

### Changed

- **Redefinición de Gravity hacia el valor**: la definición deja de ser «test de UX/CRO con perfiles calibrados» y pasa a «plataforma de **validación temprana**: mide la eficacia de un mensaje, una campaña o una decisión antes de comprometer tráfico real, para saber qué funciona antes de invertir en ello». Aplicado a la copy visible (página `/gravity/onboarding`) y a las fuentes canónicas (`CLAUDE.md`, `docs/PROYECTO.md`, `docs/ONBOARDING-SOCIOLOGO.md`).

## [0.77.1] · 2026-07-23

### Fixed

- **Los chips de fallo de los paneles de calidad ahora pintan su tinte y borde**: los chips de `failure_mode` (Claridad 5s, Campañas, Momentum e Intent) usaban `var(--warning-text)22`/`55`, el mismo bug de alfa-hex tras `var()` que descartaba la declaración, así que el chip salía sin fondo ni borde. Migrados a `color-mix(...)`. (Detectado a raíz de la revisión de la página de onboarding.)

## [0.77.0] · 2026-07-23

Versión visual navegable del onboarding del sociólogo, bajo /gravity.

### Added

- **Página `/gravity/onboarding`**: versión visual y navegable del guión de onboarding para el sociólogo experto, con índice lateral pegajoso y scroll-spy (resalta la sección activa al desplazar), tarjetas, tablas, callouts y las cinco fichas del protocolo de validación por niveles. Enlazada desde `/gravity`. El contenido es fiel a `docs/ONBOARDING-SOCIOLOGO.md`. Theme-aware (claro y oscuro), responsive (colapsa a una columna), sin Tailwind.

### Fixed

- **Revisión adversarial de la página** (multiagente): corregidos los hallazgos confirmados. El principal, un bug de CSS: pegar un alfa hex tras un `var()` (p. ej. `var(--accent-500)55`) no funciona (los tokens sustituidos no se fusionan), así que el borde se descartaba; ahora el alfa se aplica con `color-mix(...)` válido y theme-aware. Además: contraste de subtítulos y labels subido usando el token `--text-secondary`; breakpoint de colapso corregido para descontar el sidebar; y restaurado el matiz «intenta anticipar» del texto fuente.

## [0.76.0] · 2026-07-22

El juez de calidad llega al módulo Intent (JTBD), y el JTBD se hace visible en la ficha.

### Added

- **JTBD visible en la ficha del perfil**: hasta ahora el `intent_context` (JTBD) solo se veía en el editor; ahora la ficha muestra una sección «Intención · JTBD» con el JTBD del perfil.
- **Juez de calidad del JTBD, on-demand**: junto al JTBD, un botón «Evaluar calidad» puntúa con el juez independiente (otra familia de modelo) si el JTBD está anclado en ESTE perfil y suena a su voz, o si es una fórmula de manual genérica, con las cuatro dimensiones, veredicto y chip de fallo. A diferencia de 5s/campañas/Momentum, el JTBD es un campo estático (no un «run»), así que el juez es on-demand y no se persiste: es un control de fidelidad puntual. Coste bajo el scope `quality_judge`.

### Hallazgo (2026-07-22)

- **El juez discrimina con claridad la fidelidad del JTBD** y confirma la brecha que atacó `v0.74.4`: un JTBD rico y anclado (Nuria Castellano) puntúa global **0,87** (anclaje 0,99, fidelidad 0,94), mientras un JTBD formulaico de una sola frase (David Lozano) puntúa global **0,44** (anclaje 0,42, naturalidad 0,38, fallo «genérico»: «correcto pero demasiado formulaico y poco personal»). Los JTBD viejos de la tanda son del tipo formulaico; el prompt de `v0.74.4` empuja las nuevas generaciones hacia el tipo anclado.

## [0.75.0] · 2026-07-22

El juez de calidad llega a Intent Momentum.

### Added

- **Calidad de la simulación en Intent Momentum**: el mismo juez independiente que ya puntúa Claridad 5s y Campañas se aplica a una muestra (hasta 5) de las reacciones de perfil al Trigger. La vista del challenge muestra el panel «Calidad de la simulación» (global + fidelidad de rol, anclaje, no complacencia, naturalidad) y, en cada tarjeta muestreada, la nota con veredicto y chip de fallo. La calidad se guarda en el propio resultado del challenge; coste bajo el scope `quality_judge`. Se juzga la VOZ del perfil (relato + necesidad + frenos), no el plan mecánico, y se avisa al juez de que los frenos vienen en lista para que puntúe la naturalidad por el relato. Verificado en producción (run real IVI): naturalidad ~0,88-0,91, anclaje 0,78-0,98, sin fallos («simulación excelente: suena claramente a Marta, con sus frenos reales, su escepticismo y un registro muy natural»). Con esto la Fase 2 mide con número las mejoras de fidelidad de Momentum, no solo a ojo.

## [0.74.5] · 2026-07-22

Refinamiento de fidelidad (5/5): queries de GEO conversacionales.

### Changed

- **Las queries del GEO Tester se guían hacia preguntas conversacionales**, como se le habla a un asistente IA (Claude, ChatGPT, Perplexity), en vez de palabras clave estilo Google. A diferencia de los otros cuatro módulos, la sonda GEO es «desnuda» (sin persona, por decisión metodológica) y la query la escribe el usuario, así que el lever de fidelidad es el realismo de esa query: los motores IA responden distinto a una pregunta completa que a un keyword. Se refuerza en el placeholder y el tooltip del formulario (`app/geo/new/new-form.tsx`) y en las descripciones del schema (`lib/geo.ts`, `lib/seed-brief.ts`, que también guían al generador de ejemplos). Verificado en producción (formulario en vivo). Con esto se cierra el refinamiento de fidelidad en los cinco módulos.

## [0.74.4] · 2026-07-22

Refinamiento de fidelidad (4/5): JTBD (intent) anclado y en su voz.

### Changed

- **La generación de intent (JTBD) ancla en el backstory y usa la voz del perfil**: el generador pasaba de «experto en JTBD» a una fórmula de manual, correcta pero impersonal. Ahora pide capturar el motor real de ESA persona (trigger sacado de su backstory, motivación dicha como la diría ella, su vocabulario) y prohíbe las fórmulas genéricas («tomar una decisión informada», «mejorar mi calidad de vida»); además recorta el espacio sobrante del output. Verificado en producción (perfil de prueba, luego a la papelera): «Cuando salgo de una guardia y veo que ya llevamos año y medio buscando sin nada, quiero enterarme si mi seguro cubre esto y cuánto cuesta de verdad, sin que me mareen, para poder pedir cita en una clínica seria sin tener que contárselo a nadie del trabajo.»

## [0.74.3] · 2026-07-22

Refinamiento de fidelidad (3/5): narrativa de Momentum más natural.

### Changed

- **La narrativa de intención de Momentum deja de sonar a informe**: la tarea enumeraba las dimensiones a cubrir (primeros pasos, canales, barreras, intensidad) y la narrativa las repetía con secciones. Ahora esas dimensiones se recogen en sus campos estructurados (`first_steps`, `channels`, `barriers`, `intensity`/`direction`/`velocity`) y `intent_narrative` pide un relato en primera persona, espontáneo, «como se lo contarías a alguien de confianza», sin enumerar ni analizar. Verificado en producción (run real IVI Preserva ovárica): salidas con muletillas y ancladas en la situación de cada perfil («Pues mira, es algo que llevo rondando desde la ruptura…», «Uf, lo de congelar óvulos me suena bien pero no sé, estoy metida de lleno en intentar quedarme embarazada…»).

## [0.74.2] · 2026-07-22

Refinamiento de fidelidad (2/5): reacción a campañas más espontánea.

### Changed

- **El razonamiento del perfil ante un anuncio suena espontáneo, no analítico**: la instrucción del probe pasa de «qué te llama, qué te frena» (que inducía un pro/contra ordenado y «robótico») a una reacción de primer impulso en su voz («una duda suelta, un ‘ya empezamos’, un tirón»). Efecto medido en producción (run real IVI): la naturalidad sube (~0,71 a ~0,79-0,88) y el fallo «robótico» del juez casi desaparece (4 de 5 sin fallo), manteniendo el anclaje alto (0,80-0,97). Ejemplos reales: «Ya empezamos: niña mona en el cine, música emocional… esto es puro impacto emocional»; «me detiene el pulgar un segundo».

## [0.74.1] · 2026-07-22

Refinamiento de fidelidad (1/5): Recall del test de 5s.

### Changed

- **El recall de 5s refleja la atención selectiva del perfil**, no un inventario de cámara: el probe pide recordar lo que le llamó la atención a ÉL (filtrado por su situación, barreras y escepticismo), y la oferta percibida ya pasada por su desconfianza. Además, el juez de calidad ahora recibe la reacción completa (recall + oferta percibida + **barreras detectadas**), que es donde más se manifiesta el filtro del perfil; juzgar solo el recuerdo ocultaba la fidelidad real de un vistazo de 5 s. Efecto medido en producción (run real IVI): el anclaje sube de ~0,2 a ~0,9 y el global de ~0,45 a ~0,89, con 3 de 4 respuestas sin fallo del juez.

## [0.74.0] · 2026-07-22

El juez de calidad llega a las campañas.

### Added

- **Calidad de la simulación en los runs de campañas**: el mismo juez independiente que ya puntúa Claridad 5s se aplica ahora a una **muestra** de las reacciones de perfil al anuncio (hasta 5 por run). Puntúa fidelidad de rol, anclaje, no complacencia y naturalidad, con la misma metodología (juez de otra familia, foco en fidelidad y no en comprensión, que ya se mide aparte). La vista del run muestra el panel «Calidad de la simulación» con las medias y, en el detalle de cada respuesta muestreada, la nota y el veredicto del juez. Persistido en métricas del run (`quality_*`) y en el `meta` de las respuestas; coste bajo el scope `quality_judge`.

## [0.73.0] · 2026-07-22

El juez de calidad entra en los tests por lotes (Fase 2).

### Added

- **Calidad de la simulación en el run de Claridad 5s**: al terminar un test, un **juez independiente** (de otra familia de modelo que el objetivo: OpenAI si el target es Anthropic) puntúa una **muestra** de respuestas (hasta 5, repartidas por la distribución para acotar coste) en fidelidad de rol, anclaje en el perfil, no complacencia y naturalidad. La calidad deja de vivir solo en el banco de pruebas de `/evaluacion` y pasa a ser **parte del resultado del test**: la vista del run muestra un panel «Calidad de la simulación» con las medias y, en el detalle de cada respuesta muestreada, la nota y el veredicto del juez. Se guarda como métricas del run (`quality_*`) y en el `meta` de las respuestas; el coste se registra bajo el scope `quality_judge` (visible en `/tokens`).

### Fixed

- **El juez de calidad mide fidelidad de simulación, no comprensión** (`v0.73.1`): al juez ya no se le pasa la promesa exacta de la pantalla (mezclaba fidelidad con acierto del contenido, que ya mide `comprehension_rate`), sino el tema del target y la instrucción de valorar solo voz, anclaje, no complacencia y naturalidad. Detectado y corregido en la verificación en producción.

## [0.72.2] · 2026-07-22

### Fixed

- **Pricing: la métrica «WTP» se re-etiqueta a «Justo»** en la vista del run, con tooltip y leyenda que aclaran que mide cómo de justo percibe el perfil el precio (1 = justo, 0 = abuso), **no** la disposición a pagar. Corrige un nombre engañoso documentado en `PERFILES-CALIBRADOS.md §5.3`.
- **Momentum usa la persona completa del perfil** (`v0.72.3`): el módulo construía una persona reducida (sin Big Five, COM-B ni negative prompts anti-complacencia); ahora usa la voz canónica (`buildSystemPrompt`) como el resto de módulos, así que sus salidas reflejan toda la calibración. Cerraba la «brecha de fidelidad más grave» documentada en `PERFILES-CALIBRADOS.md §5.6`.

## [0.72.0] · 2026-07-22

### Added

- **Detalle de una evaluación guardada** (`/evaluacion/[id]`): desde el historial, cada evaluación abre su detalle con las salidas por caso (estímulo, respuesta del modelo y notas del juez), no solo los agregados. Ya no hace falta re-ejecutar para revisar una evaluación pasada.
- **Señal de regresión** en el historial de evaluaciones: junto a la nota global, la variación en puntos respecto a la evaluación anterior del mismo modelo (verde sube, roja baja), para ver de un vistazo si un cambio de prompt o de versión mejora o empeora la calidad (`v0.72.1`).

## [0.71.0] · 2026-07-22

Evaluaciones persistidas y observabilidad integrada en Tokens.

### Added

- **Historial de evaluaciones** (tabla `evals`): cada evaluación de calidad se guarda con la versión de la app, el modelo, el juez y las notas, y `/evaluacion` muestra el historial para comparar modelos y ver regresiones entre versiones.

### Changed

- **La observabilidad (inspector por llamada) pasa a vivir dentro de `/tokens`**, como apartado propio con filtros y paginación, junto a un nuevo KPI de coste real acumulado en USD. La ruta `/observabilidad` deja de existir (y su ítem del sidebar); la evaluación de calidad sigue en `/evaluacion`, enlazada desde Tokens.

## [0.70.0] · 2026-07-22

Observabilidad, Fase 2: evaluación de calidad de las salidas del modelo.

### Added

- **Página `/evaluacion`**: evalúa la calidad de las salidas del modelo sobre un golden set de perfiles calibrados. El modelo objetivo responde en personaje y un **juez de otra familia de modelo** (OpenAI, para no juzgar a Claude con Claude) puntúa fidelidad de rol, anclaje en el perfil, no complacencia y naturalidad, con veredicto por caso. Permite comparar modelos (Opus vs Sonnet vs Haiku) y ver cada salida con su nota independiente. El coste de la propia evaluación se registra en `/observabilidad`. Enlazada desde Observabilidad.

## [0.69.0] · 2026-07-22

Capa de observabilidad: inspector de llamadas al modelo.

### Added

- **Página `/observabilidad`**: inspector de las llamadas individuales al AI Gateway (antes solo había agregados en `/tokens`). Cada llamada con su fecha, scope, modelo, tokens, **coste real en USD**, latencia y estado (ok/fallo), filtrable por modelo/scope/solo-fallidas y paginado. El coste se calcula al vuelo (tokens × tarifa) y por primera vez es visible por llamada. Primer paso de una capa de observabilidad; la evaluación de calidad de las salidas y la comparación de modelos quedan como siguiente fase.

## [0.68.0] · 2026-07-22

Perfiles: origen visible en la rejilla y cliente de optimización.

### Added

- **Origen del perfil en la rejilla**: icono de estrellas (accent) para los perfiles modelados para un cliente y de formulario (tenue) para los perfiles base, con el cliente en el tooltip al pasar el ratón.
- **Cliente de optimización del perfil** (`optimized_for`): se elige en el editor (alta y edición) y en la ficha con edición inline, con sugerencias de las marcas ya usadas en la app (Cerebro y GEO: IVI, SegurCaixa Adeslas Dental, O2 Spain…). Nueva columna en `profiles` (migración `0030`).
- **Los perfiles de clientes ya vienen etiquetados**: 3 modelados para **SegurCaixa Adeslas Dental** y 15 para **IVI** (identificados por el tema de su backstory: dental vs. fertilidad); el resto quedan como perfiles base del formulario, editables para asignarles cliente cuando toque.

## [0.67.3] · 2026-07-22

Normalización de las tarjetas de módulo.

### Changed

- **geo y momentum usan la tarjeta compartida** (`EntityCard`/`EntityListView`), como campañas, claridad, copy, pricing, embudos y A/B. Antes eran cards a medida: geo con fondo oscuro fijo (`.surface-feature`) y momentum en lista vertical. Ahora los 8 listados de módulo comparten diseño (cabecera, título, descripción, pie de stats, hover-lift, tema claro/oscuro) y toolbar de búsqueda + orden. Claridad mantiene la imagen del test de 5s en su tarjeta (`v0.67.3`).

## [0.66.8 → 0.67.2] · 2026-07-22

Rediseño del sidebar: menos «dashboard de IA», inspiración en el patrón de BBVA, y modo contraído.

### Added

- **Modo contraído del sidebar**: botón «Contraer» al pie que reduce la navegación a un **rail de solo iconos** (72px, iconos centrados) y **persiste** entre sesiones (`gravity-sidebar-collapsed`). Al pasar el ratón, el rail **se despliega como overlay** (labels, planos y conmutador de tema) sin empujar el contenido. Solo en desktop; en móvil sigue siendo un drawer (`v0.67.0`).
- **Bordes redondeados** a la derecha del sidebar (arriba y abajo): el panel «flota» sobre el lienzo de la app (`v0.67.0`).
- **Marca «101»** recortada del logo, centrada en la cabecera del rail contraído (el logotipo completo reaparece al desplegar), en vez de perder la marca (`v0.67.1`).

### Fixed

- **Sidebar sin scroll vertical** en ambos estados: espaciado base compactado (gap, padding, filas, dividers y gaps de grupo) para que la navegación entre en el viewport sin barra de scroll; en el rail contraído se ocultan además las etiquetas de plano y el conmutador de tema para ganar alto (`v0.67.1`).
- **Sin salto de iconos al desplegar el rail**: al pasar el ratón los iconos ya no se movían. Las etiquetas de plano reservan su alto también contraídas (solo se funden), la marca «101» se iguala en altura al logotipo y el conmutador de tema no aparece en el hover, de modo que ni la cabecera ni el pie cambian de alto (`v0.67.2`).

### Changed

- **Sidebar rediseñado** con inspiración en el patrón de BBVA pero con la paleta Gravity: fuera los labels de sección en mayúsculas mono, grupos separados por **líneas finas**, labels en Hanken sans, y **estado activo con el icono en un círculo relleno de acento** (`v0.66.8`).
- **Etiquetas de plano** (Construction, Acceleration, Value, Knowledge Tools, Sistema) reintroducidas junto a cada divisor, pero **discretas** (9px, sans, tenues): marcan el plano sin recuperar el registro «dashboard» (`v0.66.9`).

## [0.66.6] · 2026-07-21

Refinamientos de `/tokens` sobre la selección de modelo.

### Added

- **Tabla de tarifas por modelo** junto al selector de las runs: precio de entrada / salida (`$` por millón de tokens) de cada modelo del catálogo, con la fila del modelo vigente resaltada (`v0.66.5`).
- **Coste estimado por número de usuarios** por run (10 / 25 / 50 / 100), con el modelo elegido, en una tercera columna de la sección de runs. Usa el estimador real (medias de `gateway_usage`) y reacciona al modelo seleccionado (`v0.66.6`).

### Fixed

- Los `<select>` de modelo de `/tokens` mostraban el `<optgroup>` (p. ej. «Anthropic») en **blanco sobre blanco**: el fondo del control era casi transparente y el popup nativo caía al blanco del sistema. Ahora fondo opaco (`--surface-panel`) y color/fondo explícitos en `<select>`, `<optgroup>` y `<option>` (`v0.66.5`).

## [0.64.0 → 0.66.3] · 2026-07-20 / 21

Rediseño «oscuro editorial» completo (4 fases), selección de modelo en todo lo que gasta tokens, y renombrado de marca a Gravity.

### Added

- **Selección de modelo en `/tokens`, por empresa y modelo**, para todo lo que consume tokens: **chat** (Talker + Reasoner, `v0.65.0`), **tandas por lotes / runs** (los 9 runners, `v0.66.0`) y **GEO Tester** (por motor, ya existía). Persiste en `app_settings`; el chat y los runners leen la elección en runtime. Catálogo Anthropic + OpenAI.
- **Las estimaciones de coste** previas a lanzar reflejan el modelo elegido, no el default; elegir un modelo más caro o barato cambia la cifra prevista (`v0.66.2`).
- **Chat estilo WhatsApp** en el panel de perfil: cabecera con avatar y estado («escribiendo…»), burbujas con cola, hora, doble check, indicador de escritura. Theme-aware, preservando la arquitectura Talker-Reasoner (`v0.64.4`).
- **Motion de entrada**: los bloques de cada página aparecen con un fundido y subida escalonados; respeta `prefers-reduced-motion` (`v0.64.6`).
- **Firma orbital**: el diagrama del Gravity Model pasa a ser la firma visual del hero de la home y recurre como marca de agua (`v0.64.9`).

### Changed

- **Identidad tipográfica**: familia única **Hanken Grotesk** (fuera DM Serif Text y Nunito Sans); titulares a peso 700, **sin serif ni itálica** (la itálica queda para citas); acento amarillo de marca **`#F9CB0D`** (`v0.64.0`, `v0.64.1`).
- **Color**: superficies cálidas, **marfil sobre negro cálido** (`#0c0b0a`, paneles `#1a1815`); propagado por el canal `--fg`. Tema claro intacto (`v0.64.2`).
- **Masthead**: retirados los eyebrows mono en mayúsculas de las cabeceras de página (`v0.64.3`).
- **Home**: `max-width` de contenido y ritmo vertical más apretado; hero a dos columnas; módulos como **bloques planos, todos al mismo nivel** (sin tarjetas); breakpoint intermedio **~1120px** que apila el hero en el rango tablet (`v0.64.9`, `v0.65.1`, `v0.66.3`).
- **Cards**: refinadas al registro editorial (radio, sombra de hover, bordes más marcados) (`v0.64.5`, `v0.64.10`).
- **Accesibilidad**: subido el contraste del texto tenue, labels del sidebar y etiquetas del orbital; tamaños mínimos elevados; **iconos siempre en línea** con el texto (`v0.64.10`).
- **Marca**: renombrado **SUAAS → Gravity** en toda la documentación (73 apariciones), preservando los identificadores técnicos (dominio, env vars, cookie, tabla) (`v0.66.1`).

### Fixed

- Scroll horizontal en la página de perfil por un `.tooltip-panel` de COM-B que desbordaba (`v0.64.7`).
- Botón secundario amarillo poco legible sobre marfil en tema claro: relleno tenue + borde y texto más oscuros (`v0.64.10`).

### Removed

- Ruta de preview `/diseno-preview`, tras cerrar el rollout del rediseño (`v0.64.8`).
- Titulares con serifa/itálica y la variante de card destacada de la home.
