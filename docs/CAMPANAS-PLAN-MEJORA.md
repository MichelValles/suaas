# Plan de mejora del módulo de campañas

> Origen: investigación multiagente sobre el módulo (5 lentes de comprensión + 5 perspectivas de propuesta + síntesis), 2026-06-11, sobre la base v0.34.0.
> Cada afirmación de este plan se verificó contra el código real. Las referencias `archivo:línea` pueden moverse con futuras ediciones: confírmalas antes de ejecutar.

## Diagnóstico

El módulo funciona bien en su camino feliz y está bien integrado en la plataforma (papelera, runs, seeds, panel de lanzamiento compartido), pero acumula cuatro frentes de deuda:

1. **Fidelidad metodológica comprometida.** El probe inyecta el brief del anunciante en el prompt del persona (`lib/experiments/campaign.ts:322-324`): el usuario sintético conoce la intención interna del anuncio antes de interpretarlo, exactamente el sesgo de cámara de eco que prohíbe la sección 6.1 de `docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`. Además `SnippetEvalSchema` pide `intent_to_click` como primer campo, sin razonamiento previo ni anclas de escala (el patrón que la literatura reciente asocia a scores agrupados en 0,7), y las etiquetas «CTR» y «Click rate» venden un umbral arbitrario (intent ≥ 0,5) como tasa de clics comparable con Google Ads.
2. **Robustez operativa.** Un fallo en una sola de hasta 200 combinaciones tumba el run entero (no hay try/catch en snippet ni en versión ideal); los `.max(30)/.max(90)` de `IdealVersionSchema` convierten un titular de 31 caracteres generado por el LLM en `NoObjectGeneratedError` fatal; y el cap de 200 combinaciones no cabe en `maxDuration=300`: si Vercel corta la función, el run queda en «running» para siempre aunque las respuestas se persisten incrementalmente.
3. **Deuda de esquema.** De las 8 migraciones de campañas, 3 son parches correctivos; los fallbacks de `channel`, `strategy` y `deleted_at` son permanentes porque no hay tracking de qué SQL se aplicó; `isMissingColumnError` ignora su parámetro `column` con PGRST204; RLS está apagado en ambas tablas; y `normalizeCampaign` castea `creatives` sin validar.
4. **Loop de producto roto.** Sin duplicar campaña, sin comparar runs, sin export y sin métrica por asset, iterar el copy (el caso de uso central) obliga a recrearlo todo a mano.

La buena noticia: casi todo lo valioso ya existe en el repo (`judgeComprehension`, `behavior_class`, `VariantBlock` y `DeltaBar` del A/B, la `responses-table` de five-second, persistencia incremental). La mayor parte del plan consiste en portar patrones propios, no en inventar.

## Quick wins (release v0.35, sin SQL)

Cada uno cabe en una sesión. Van primero porque cambian el significado de los resultados: cuanto antes se corrija el sesgo, menos histórico contaminado se acumula.

| # | Cambio | Esfuerzo |
|---|---|---|
| 1 | Retirar el brief del anunciante del prompt del persona | S |
| 2 | Percepción y razonamiento antes del score, con anclas verbales de escala | S |
| 3 | Paquete de bugs latentes del runner | S |
| 4 | Honestidad de métricas y errores de formulario legibles | M |
| 7 | Frontera de BD tipada y fix de `isMissingColumnError` | S |

### 1. Retirar el brief del anunciante del prompt del persona (S)

Eliminar el bloque de `lib/experiments/campaign.ts:322-324` que inyecta «Nota del anunciante (no la verías tú, sólo contexto)» en el user content de `probeCampaignSnippet`. El brief se queda para la UI y como contexto del futuro juez neutral. Validación: relanzar un run con los mismos perfiles seed sobre la misma campaña y comparar `mean_clarity` e `mean_intent_to_click` antes y después (lo esperable es que bajen un poco, señal de que el sesgo existía).

**Por qué**: el persona conoce la intención interna del anuncio antes de interpretarlo. Es la corrección de fidelidad más barata del módulo.

### 2. Razonamiento antes del score (S)

En `lib/experiments/campaign.ts`: (1) reordenar `SnippetEvalSchema` a `perceived_offer`, `reasoning` (campo nuevo, 1-2 frases en la voz del perfil antes de decidir), `barriers` y al final los cuatro scores (zod preserva el orden de claves y `generateObject` genera en ese orden); (2) sustituir los bullets «0..1» del system del probe por bandas verbales tipo `judgeComprehension` (0,0-0,2 lo ignorarías; 0,3-0,4 lo leerías sin click; 0,5-0,7 click probable; 0,8-1,0 click casi seguro) más la instrucción de usar todo el rango; (3) persistir `reasoning` en `campaign_responses.meta` (jsonb existente, sin migración) y mostrarlo en el drill-down de `app/experiments/campaign/[runId]/page.tsx`. De paso, `meta` deja de ser write-only.

**Por qué**: `intent_to_click` es hoy el primer campo del schema y no hay campo `reasoning`, a diferencia de funnel y five-second. La evidencia reciente (arXiv 2510.08338) muestra que elicitar texto antes del número produce distribuciones realistas; pedir el número primero produce clustering.

### 3. Paquete de bugs latentes del runner (S)

Todo en `lib/experiments/campaign.ts` salvo lo indicado:

- (a) Quitar `.max(30)`/`.max(90)` de `IdealVersionSchema` (dejar el límite en `.describe`) y truncar con `slice` al persistir: hoy un titular de 31 caracteres lanza `NoObjectGeneratedError` y mata el run.
- (b) Exportar `GENERAL_CONTEXT_QUERY = '(contexto general)'` y derivar `byQuery` en summarize de las queries presentes en las respuestas, no de `campaign.queries` (líneas 779-783), con etiqueta legible «Contexto general» en resultados, ocultando la tabla si no hay filas.
- (c) Caché `Map<string,string>` por run para `resolveImageForApi`, pasada a probe y landing: la landing y las 4 creatividades se descargan una vez en vez de cientos.
- (d) Sustituir el catch vacío de `judgeLandingMatch` (línea 632) por `console.error` con `profileId`, canal, query y mensaje, persistiendo `landing_error` en `meta` para distinguir fallo técnico de gating.
- (e) Añadir `profile_id` al `meta` de los tres `recordUsage`.
- (f) En `app/campaigns/[id]/page.tsx:472`, `progressLabel` con `Math.max(1, queries.length)` y wording «intereses» para Display (hoy estima «~0s por perfil»).

**Por qué**: cuatro bugs confirmados que matan runs de forma no determinista o degradan datos en silencio, más dos fixes de un minuto. Cero migraciones.

### 4. Honestidad de métricas y errores legibles (M)

1. En `app/experiments/campaign/[runId]/page.tsx` (KPI línea 85, cabeceras 103 y 131) y en la config de `RunsPreviousGrid` de `app/campaigns/[id]/page.tsx:463`, renombrar «CTR», «Click rate» y «Tasa click» a «Intent ≥ 0,5» con `components/info-tooltip.tsx` explicando el umbral; nota bajo «Match landing» indicando que solo lo evalúan los perfiles que superan el umbral y, leyendo `landing_source_url` (que gana su primer consumidor), que la imagen juzgada fue la og:image y no la landing real; badge en el drill-down cuando una creatividad vídeo/YouTube se evaluó por miniatura.
2. Persistir `mean_credibility`, `mean_differentiation` y la desviación estándar del intent como `metrics` (hoy se calculan y se descartan).
3. En `app/campaigns/new/actions.ts` (líneas 79 y 218), si `err instanceof z.ZodError` devolver `err.issues.map(i => i.message).join(' · ')` en vez del volcado JSON, y ejecutar `CampaignInputSchema.safeParse` con URLs provisionales ANTES de `uploadDataUrlToBlob` para que los requisitos de creatividades de Display no dejen blobs huérfanos; replicar esos requisitos como aviso en cliente junto al submit de `new-form.tsx`.

**Por qué**: las etiquetas actuales sugieren comparabilidad con un CTR real que no existe; un consultor de paid media que lo detecte descarta la herramienta. Los mensajes de Zod ya están redactados en castellano en `CampaignInputSchema`, solo hay que mostrarlos.

### 7. Frontera de BD tipada y fix de `isMissingColumnError` (S)

1. `lib/supabase.ts:79`: la rama PGRST204 devuelve `true` incondicionalmente; debe respetar el parámetro `column` comprobando el mensaje de PostgREST («Could not find the 'X' column»). Hoy un error por `channels` ausente dispara primero el retry de `strategy` en `createCampaign`.
2. `lib/campaigns.ts`: definir `CampaignRowSchema` con zod (`channels` con `.catch(['google'])`, `strategy` con `.catch('search')`, `creatives: z.array(CreativeSchema).catch([])`) y que `normalizeCampaign` parsee en vez de castear: hoy el jsonb de `creatives` llega sin validar al runner, que asume `c.kind` y `c.role`. La poda de los fallbacks legacy se hace después de la consolidación de BD (ver release v0.37), no aquí.

**Por qué**: dos defectos verificados de la capa de datos que producen retries inútiles y dejan pasar filas corruptas al motor. Barato y sin migración.

## Releases mayores

### Consolidación de esquema con tracking de migraciones (0019) · M · necesita SQL

Nueva `supabase/migrations/0019_consolidacion.sql`, idempotente, para pegar una vez en el SQL editor: (1) `create table if not exists suaas_migrations(name text primary key, applied_at timestamptz default now())` con backfill de `0001`..`0019`; (2) `drop column if exists channel` en `campaigns` (legacy pre-0011); (3) rehacer los checks de arrays con `coalesce(array_length(x,1),0)` porque `array_length` de `'{}'` es NULL y el CHECK pasa, así que hoy los mínimos no se garantizan en BD; (4) checks de Display: `char_length(company_name) <= 25`, `char_length(long_headline) <= 90`, `cta` restringido a los `CTA_VALUES`; (5) `enable row level security` en `campaigns` y `campaign_responses` sin policies (el service role salta RLS, la anon key queda deny-all, la app no cambia). En código: `lib/migrations.ts` con `getPendingMigrations()` leyendo `suaas_migrations` y estado visible en `app/diag/page.tsx`; tras confirmar la aplicación, podar los fallbacks pre-0011/pre-0013 de `createCampaign` y `normalizeCampaign` sustituyéndolos por `MigrationPendingError` (clase ya existente en `lib/supabase.ts`). Convención hacia delante: cada migración termina insertando su propia fila.

**Por qué**: 3 de las 8 migraciones de campañas son parches correctivos que existen solo porque no se sabe qué SQL se aplicó; el drift zod-SQL de `descriptions` pasó inadvertido 6 versiones; RLS apagado es el hallazgo crítico estándar de los advisors de Supabase. Ataca la causa raíz, no los síntomas.

### Runner tolerante a fallos con progreso observable y reanudación · L · sin SQL

En `lib/experiments/campaign.ts`: aplanar a una cola perfil × canal × query con worker pool de concurrencia 4-6 (sustituye chunks de perfiles + bucles secuenciales internos); try/catch por combinación con 1 reintento y `failed[]` con contexto logueado (como hacen five-second y funnel); deadline a ~270s pasado el cual no se arrancan tareas nuevas; bloque final que SIEMPRE ejecuta summarize sobre lo recogido, registra `n_failed`/`n_skipped` y llama a `markRunFinished('done')` si hay datos. En `app/api/runs/campaign/route.ts`: el POST crea el run, responde `{ok, runId}` al instante y procesa en `after()` de `next/server` (verificar la firma en `node_modules/next/dist/docs`, regla del proyecto); `BodySchema` acepta `resumeRunId` opcional que lee las `campaign_responses` existentes y salta combinaciones ya persistidas (el upsert con `onConflict` ya es idempotente). Endpoint ligero GET de progreso que devuelve status, `done` (count de respuestas) y `expected` (calculable desde `run.params`). Client component `RunProgress` en la página de resultados: barra con polling cada 5s, `router.refresh()` al terminar, aviso «Run interrumpido: mostrando N respuestas parciales» y botón «Retomar» si lleva más de 10 minutos en running.

**Por qué**: los dos peores modos de fallo verificados. Un único error en 200 combinaciones tumba el run descartando trabajo ya pagado en Opus, y el cap de 200 combos (hasta 50 secuenciales por carril a 15-40s) no cabe en `maxDuration=300`, dejando runs zombi en «running» sin ruta hacia las respuestas que sí se persistieron. La persistencia incremental ya existe: solo falta exponerla.

### Presupuesto diario de tokens y estimación de coste previa · M · sin SQL

1. `lib/usage.ts`: `getTokensLast24h()` con select agregado sobre `gateway_usage`.
2. Nuevo `lib/budget.ts`: `assertBudget()` que lanza `BudgetExceededError` si se supera `SUAAS_DAILY_TOKEN_BUDGET` (env var), llamada al inicio de todos los runners y mapeada a 429 en las rutas.
3. Endpoint GET de estimación por campaña y nº de perfiles que multiplica combos por las medias empíricas de tokens y latencia por scope (leídas de `gateway_usage`); `components/profile-launch-panel.tsx` lo muestra antes del submit y valida el cap de 200 en cliente (hoy solo revienta en servidor tras el submit).
4. Aprovechar para comparar empíricamente dos runs idénticos con el probe en Opus vs Sonnet y decidir el modelo con datos, resolviendo de paso la contradicción documental: `five-second.ts` (líneas 94-99) dice que se evitó Opus por un mismatch `generateObject`+multimodal que campañas usa sin nota.

**Por qué**: C-03 de la auditoría sigue abierto: `recordUsage` solo observa y, con la cookie constante de A-01, cualquiera que adivine el patrón puede quemar 200 combinaciones de Opus por POST. Además el operador no tiene estimación fiable antes de lanzar.

### Juez neutral de comprensión del anuncio · M · necesita SQL

Migración manual: `alter table campaigns add column if not exists intended_message text`; `alter table campaign_responses add column if not exists comprehension_rate numeric` con check 0..1. En `lib/campaigns.ts`: `intended_message` en `CampaignInputSchema` (max 200, opcional) y en el tipo `Campaign`; campo «Mensaje que quieres que entiendan» en `new-form.tsx` y `actions.ts`, análogo al `main_promise` de targets. En `lib/experiments/campaign.ts`: `judgeAdComprehension` clonando la rúbrica por bandas de `judgeComprehension` (`five-second.ts:154-183`), con `DEFAULT_MODEL` (Sonnet, barato), SIN `buildSystemPrompt` del persona, comparando `perceived_offer` contra `intended_message` y usando el brief como contexto del juez (su destino legítimo tras retirarlo del probe); llamada por respuesta solo si `intended_message` existe, tolerante a fallos (null + `console.error`). Persistir `comprehension_rate` y `judge_reasoning` en `meta`, `mean_ad_comprehension` en summarize + `upsertMetric`, KPI card «Comprensión del mensaje» en resultados. Scope de usage nuevo: `campaign_judge`.

**Por qué**: la matriz de la sección 4 del doc de conocimiento asocia estos tests a la tasa de comprensión fuzzy-match y five-second ya la implementa; campañas captura `perceived_offer` pero nunca la contrasta con lo pretendido, y el landing match actual lo juzga el propio persona anclado a su propia percepción (auto-confirmación).

### `behavior_class` del Gravity Model en el snippet eval · M · necesita SQL

Añadir a `SnippetEvalSchema` el enum `behavior_class` (optima/fuga/repesca) con describe adaptado a ads (optima = conecta con tu intención y harías click; fuga = lo ignoras y sigues; repesca = no haces click pero la necesidad sigue viva), colocado tras `barriers` y antes de los scores (encaja con el reordenado del quick win 2). Migración manual espejo de la 0015: `alter table campaign_responses add column if not exists behavior_class text` con check. Persistir en el upsert, mapear en `listCampaignResponses` con null para filas antiguas, `behavior_counts` en `CampaignSummary` copiando el bucle de `five-second.ts`, y replicar la sección «Conducta predicha (Gravity Model)» en resultados con desglose por query. Bonus: el cruce `behavior_class` × intent sirve de check de consistencia interna (una «fuga» con intent 0,8 delata incoherencia).

**Por qué**: la clasificación es la pieza central del Gravity Model y solo existe en five-second. En campañas es casi mecánico y alinea el módulo con la narrativa de la home.

### Tabla de respuestas interactiva y token `--serp-link` · M · sin SQL

Crear `app/experiments/campaign/[runId]/responses-table.tsx` clonando la estructura de five-second (useState de orden y expansión, helpers `Th`/`Td`/`Detail`, empty state dashed), con filas profileId-channel-query ordenables por intent/claridad/credibilidad/match y dos selects para filtrar por query y canal; el drill-down muestra oferta percibida, `reasoning` (del quick win 2), barreras, crítica de landing y versión ideal. Sustituir los bloques `<details>` server-rendered de `page.tsx`. Aprovechar la pasada para crear el token `--serp-link` en `app/globals.css` (variante en tema oscuro y claro) con clase `.serp-link`, sustituir los `rgba(132,192,255,0.95)` hardcodeados verificados en la página de resultados (líneas 376 y 544), `app/campaigns/[id]/page.tsx` (216 y 280) y `new-form.tsx`, documentarlo en `docs/SISTEMA-DISENO.md`, y reutilizar el `DisplayAdPreview` del formulario en el detalle de campañas Display (hoy enseña preview SERP incluso para banners).

**Por qué**: campañas es el módulo con mayor cardinalidad (hasta 200 filas) y el único grande sin tabla interactiva; los azules hardcodeados violan la regla de canal de tema de `AGENTS.md`.

### Comparativa run vs run reutilizando los componentes del A/B · M · sin SQL

Extraer `VariantBlock`, `DeltaBar`, `Bar` y `pickWinner` de `app/experiments/ab/[abTestId]/page.tsx` a `components/compare-blocks.tsx` parametrizando las métricas. Nueva ruta `app/campaigns/[id]/compare/page.tsx` que lee `searchParams` `a` y `b` (por defecto los dos últimos runs done), carga `listCampaignResponses` de ambos, calcula `summarizeCampaignResponses` y pinta dos `VariantBlock` más `DeltaBars` de intent, claridad, credibilidad y match landing, con la regla de empate del A/B y un aviso cuando las muestras de perfiles difieren. Botón «Comparar los dos últimos runs» en el detalle si hay 2 o más runs.

**Por qué**: iterar copy sin vista de antes/después es trabajar a ciegas. Combinado con duplicar y repetir con la misma muestra cierra el flujo metodológico completo: duplicar, cambiar una cosa, relanzar sobre los mismos perfiles, comparar.

### Síntesis accionable «Qué cambiar» por run · M · sin SQL

Paso final `synthesizeRecommendations` en `lib/experiments/campaign.ts` con `DEFAULT_MODEL` (una sola llamada por run): `generateObject` con `key_findings` (3-5 frases), `recommended_headlines` (hasta 3, truncado suave a 30c, nunca `.max` fatal), `recommended_descriptions` (hasta 2) y `barrier_fixes`, alimentado con `top_barriers`, las peores filas de `byQuery` y las mejores versiones ideales; persistir mergeando en `runs.params` (jsonb existente, sin migración). Sección superior «Qué cambiar» en resultados con los hallazgos y el copy listo para pegar (y para el export de Ads Editor).

**Por qué**: para decidir, un equipo necesita recomendaciones, no 200 filas con medias. Coste marginal de una llamada Sonnet por run y convierte el output del módulo en entregable directo.

### Duplicar campaña y repetir run con la misma muestra · M · sin SQL

1. `app/campaigns/new/page.tsx`: leer `searchParams` (en Next 16 es Promise), si llega `?from=<id>` cargar `getCampaign` en servidor y pasar prop `initial` a `NewCampaignForm`.
2. `app/campaigns/new/new-form.tsx`: sembrar los `useState` (líneas 78-96) desde `initial` (nombre con sufijo «(copia)», strategy, brief, queries, headlines, descriptions, companyName, longHeadline, cta); landing sin resubir nada: `landingMode` «og» con `resolvedLanding = initial.landing_image_url` (la action ya reutiliza `landing_resolved_url` tal cual, líneas 97-100); creatividades mapeadas por sus URLs http(s) existentes con `upload_data` vacío.
3. Botón «Duplicar» en `app/campaigns/[id]/page.tsx` enlazando a `/campaigns/new?from={id}`.
4. Prop opcional `initialSelected` en `components/profile-launch-panel.tsx:73` y enlace «Repetir con esta muestra» en `components/runs-previous.tsx` (los `profileIds` ya se leen en la línea 109), pasando los ids por query param a la página de detalle.

**Por qué**: el loop central del producto (cambio un titular, vuelvo a testar) está roto: solo existen create y soft-delete, e iterar obliga a reteclear y resubir todo. Comparar iteraciones con muestras sintéticas distintas además invalida la comparación. Toda la fontanería necesaria ya existe. Es la mejora con mejor ratio impacto/coste del módulo.

### Export a CSV y a formato Google Ads Editor · M · sin SQL

Nueva ruta GET `app/api/export/campaign/[runId]/route.ts` (runtime nodejs, mismo gate de auth que el resto de `/api`): `getRun` + `getCampaignWithTrashed` + `listCampaignResponses`, respuesta `text/csv` con BOM UTF-8 y separador «;» (Excel en español), `Content-Disposition` attachment. Columnas: perfil, canal, query, intent, claridad, credibilidad, diferenciación, landing_match, barreras, perceived_offer y la versión ideal completa. Variante `?format=ads_editor` con cabeceras RSA (Campaign, Ad Group, Headline 1..15, Description 1..4, Final URL) mezclando los assets originales con el top de `ideal_headline`/`ideal_description` rankeados por intent y truncados a 30/90. Dos enlaces de descarga en la cabecera de resultados.

**Por qué**: los equipos de marketing deciden en sheets y suben cambios con Ads Editor; las versiones ideales (hasta 100 propuestas de copy por run, el output más accionable) hoy viven encerradas en la UI. Convierte el run en entregable de consultoría sin migración ni JS cliente.

### Muestreo de combinaciones RSA reales y ranking por asset · L · necesita SQL

En `lib/experiments/campaign.ts`, `renderSearchSnippet` pasa de volcar los 15 titulares y 4 descripciones (líneas 172-186) a muestrear una combinación realista (3 titulares + 2 descripciones) con RNG determinista sembrado por `profileId`+query (reproducible entre runs para comparar iteraciones con la misma muestra) y rotación round-robin para exposición equilibrada de assets; Display mantiene su render actual. Migración manual: `alter table campaign_responses add column if not exists shown_headlines text[], shown_descriptions text[]` (fallback en `meta` mientras esté pendiente). En summarize: bloque `byAsset` con n, intent medio y delta frente a la media del run por titular y por descripción, filtrando filas donde el asset estuvo presente. Sección «Rendimiento por asset» en resultados ordenada por intent con aviso de muestra insuficiente cuando n < 5. Documentar en `docs/PROYECTO.md` el cambio de semántica (las respuestas pasan a evaluar una combinación, no el conjunto).

**Por qué**: «qué titular funciona» es la pregunta número uno de un anunciante RSA y hoy es incontestable: los scores son del conjunto, no de cada asset, y ningún usuario real ve 15 titulares a la vez (validez ecológica rota). La literatura (LOLA, arXiv 2406.02611) valida que los LLM discriminan bien entre titulares. Va al final del plan porque rompe la comparabilidad con runs históricos: conviene llegar con duplicar, comparar y juez ya operativos.

## Descartado (con razón)

- **A/B formal de campañas vía `ab_tests`** (unión discriminada por kind): redundante una vez existen duplicar campaña, repetir con la misma muestra y la comparativa run vs run, que juntos cubren el mismo caso de uso con menos riesgo. La alteración de `ab_tests` (drop not null en `target_a_id`/`target_b_id`, checks por kind, fallbacks runtime) es de las migraciones más delicadas para aplicar a mano. Reevaluar solo si el flujo manual de comparación se queda corto en uso real.
- **Réplicas n>1 por celda** (varianza tipo Monte Carlo): multiplica el coste en Opus y agrava el timeout estructural; además exige ampliar el unique de `campaign_responses` con una columna `replicate`. La desviación estándar entre perfiles (quick win 4) ya aporta dispersión sin coste. Solo tras el runner tolerante a fallos, y con presupuesto instrumentado.
- **SSR completo con embeddings y frases ancla**: la versión ligera (razonamiento antes del score más anclas verbales) captura la mayor parte del beneficio sin infraestructura de embeddings. Opcional, hasta tener evidencia de que las anclas no bastan.
- **Vercel Queues o Workflow durable para los runs**: infraestructura nueva injustificada para una plataforma de un solo operador. El pool por combinación con deadline, finalización garantizada y reanudación vía `resumeRunId` elimina los dos modos de fallo sin dependencias. Si el volumen crece, el diseño con cola aplanada migra de forma natural a WDK.
- **Activar multicanal real (Meta, LinkedIn, TikTok, X) ahora**: faltan los caps de caracteres por red (aplazado desde v0.23: hoy todas comparten 30/90 de RSA), los roles de creatividad específicos y los framings sin calibrar. Activarlo sin eso produciría simulaciones de baja fidelidad con apariencia de feature. Mantener la maquinaria (schema 1..5 canales, `byChannel`, `renderFeedSnippet`) como infraestructura anticipada y priorizar la profundidad de Search y Display.
- **Importar CTR real de Google Ads para calibrar** (`campaign_benchmarks`): aplazado, no rechazado. Es la vía correcta hacia la confianza del cliente, pero depende de estabilizar primero las métricas honestas, el ranking por asset y un proceso de datos con campañas reales de Flat101 que hoy no existe.
- **Cambiar el probe de Opus a Sonnet de inmediato**: a ciegas arriesga la calidad del scoring multimodal sin evidencia. Se integra en la release de presupuesto: comparar dos runs idénticos con cada modelo usando `gateway_usage` y decidir con números. De paso resolver la contradicción documental verificada en `five-second.ts:94-99`.
- **Eliminar `landing_source_url` y `campaign_responses.meta` por write-only**: en lugar de borrar columnas con datos, ganan consumidores en los quick wins (la nota de fidelidad sobre la og:image y `reasoning`/`landing_error`/`profile_id`). Eliminar habría requerido migración destructiva para no ahorrar nada.

## Orden de ejecución sugerido

Cinco releases. Cada quick win con su propio ciclo cambio, bump, deploy y commit según `CLAUDE.md`.

| Release | Contenido | SQL |
|---|---|---|
| **v0.35 · Fidelidad y honestidad** | Quick wins 1, 2, 3, 4, 7 | No |
| **v0.36 · Loop de iteración** | Duplicar y repetir muestra, export CSV/Ads Editor, comparativa run vs run | No |
| **v0.37 · Consolidación de BD** | Migración 0019 (`suaas_migrations`, RLS, checks, drop `channel` legacy) + poda de fallbacks | Sí |
| **v0.38 · Robustez operativa** | Runner tolerante a fallos con progreso y reanudación, presupuesto de tokens con estimación previa | No |
| **v0.39 · Profundidad de análisis** | Juez neutral de comprensión, `behavior_class`, tabla interactiva con `--serp-link`, síntesis «Qué cambiar» | Sí |
| **v0.40 · Ranking por asset** | Muestreo de combinaciones RSA y rendimiento por asset | Sí |

Notas de orden:

- v0.35 va primero porque cambia el significado de los resultados: cuanto antes se corrija el sesgo, menos histórico contaminado se acumula, y todo es barato y sin migraciones.
- **Recomendación para v0.37**: aprovechar la misma sesión de SQL editor para incluir también las columnas de las releases posteriores (`intended_message`, `comprehension_rate`, `behavior_class` y, si se decide hacer el ranking por asset, `shown_headlines` y `shown_descriptions`), porque las migraciones se aplican a mano y agruparlas minimiza las veces que hay que recordar el SQL pendiente. El código de cada feature puede llegar después: las columnas ya estarán.
- v0.40 va deliberadamente al final porque cambia la semántica de las respuestas y rompe la comparabilidad con runs anteriores; conviene llegar con duplicar, comparar, juez y runner robusto ya operativos para absorber el corte.
