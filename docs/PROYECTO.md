# Proyecto

> **Estado de este documento**: refleja el código a fecha de `v0.34.0` (2026-06). Si tocas estructura, schema o flujos, actualízalo en la misma sesión (regla `CLAUDE.md`).

## Qué es

**SUAAS** (marca pura, sin expansión del acrónimo) es una plataforma interna de Flat 101 para hacer test de **UX, CRO y publicidad** con **perfiles calibrados**. Permite descartar variantes de bajo rendimiento antes de comprometer tráfico real, simular elasticidad de precios, validar copy bajo intenciones de búsqueda específicas y comparar creatividades publicitarias sin coste de reclutamiento.

- **Dominio**: `suaas.flat101.business`.
- **Hosting**: Vercel (proyecto independiente, no comparte deploy con `flat101business`).
- **Acceso**: contraseña global (cookie `auth_suaas`). Las funciones operativas más sensibles (sembrar ejemplos y perfiles) tienen un **segundo gate** con cookie `seed_access` y env `SEED_PASSWORD`.

## Cliente

- **Construye y opera**: Flat 101 (Míchel Valles).
- **Uso interno**: equipos de UXR / CRO / Paid Media de Flat 101 y, en una segunda fase, clientes externos.

## Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 16.2.6** (App Router, Turbopack) | Heed `node_modules/next/dist/docs/`. Middleware se llama `proxy.ts` (no `middleware.ts`). |
| UI | React 19.2.6 |  |
| Estilos | **CSS plano + tokens del DS** (sd.michelvalles.com) | Sin Tailwind. Sólo `globals.css` + `style={{}}` inline. |
| Animación | `motion` 12.x |  |
| Fuentes | Nunito Sans + DM Serif Text vía `next/font/google` |  |
| Datos | Supabase (Postgres + Storage) | Provisionado vía Marketplace de Vercel. Sin RLS (acceso por service role server-only). |
| LLM | Vercel AI Gateway | Multi-proveedor con failover. `Reasoner = anthropic/claude-opus-4-7`. `Talker = anthropic/claude-sonnet-4-6`. Override por env. |
| Almacén media | Vercel Blob | Uploads de imágenes / vídeos (data:URLs) suben a Blob y se persiste la URL. Fallback a data: URL si `BLOB_READ_WRITE_TOKEN` falta. |
| Lenguaje | TypeScript 5 estricto |  |
| Lint | ESLint 9 con `eslint-config-next` |  |
| Deploy | Vercel CLI (`vercel --prod --yes`) |  |

## Subdominio

`suaas.flat101.business` se registró explícitamente en este proyecto de Vercel. El wildcard `*.flat101.business` apunta a `flat101business` (donde viven `adams` y `uoc`), pero el longest match wins: cualquier host exacto añadido a otro proyecto tiene prioridad.

## Estructura de carpetas

```
app/
  layout.tsx                            Root layout (fuentes + metadata + ConsoleBanner)
  globals.css                           Tokens del DS + clases semánticas (.eyebrow, .h1, .display, .btn-pill, ...)
                                        + reglas globales: AppShell main flex column gap, sidebar, etc.
  robots.ts                             noindex global
  icon.svg                              Favicon
  page.tsx                              Home: panel 3x3 (9 cards: claridad, embudos, AB, copy, pricing, campañas, perfiles, tokens, diag) + tutorial 4 pasos

  diag/
    page.tsx                            Estado visual del esquema (audita tablas + columnas críticas de varias tablas, cada una con su migración asociada)
  tokens/
    page.tsx                            Créditos del AI Gateway + acumulado interno por modelo/scope + serie 7d
  trash/
    page.tsx                            Papelera: lista soft-deleted con acciones restore / hard delete
    trash-row.tsx                       Client: cada fila con sus botones de acción
  seed-examples/
    page.tsx                            Sembrar ejemplos en los 6 módulos (server + gate seed_access)
    client.tsx                          Client: tarjetas por módulo (clarity, copy, pricing, ab, funnel, campaign) + lanzar
  login/
    page.tsx                            Pantalla de contraseña (Server, wrapper Suspense)
    login-form.tsx                      Form HUD oscuro con pixel trail (Client)

  profiles/
    page.tsx                            Listado (delegada a ProfilesManageView)
    manage-view.tsx                     Client: ProfileExplorer mode="manage" + delete fetch + exportar CSV
    new/
      page.tsx                          /profiles/new
      new-form.tsx                      Wrapper ProfileForm initial=DEFAULT_PROFILE_INITIAL
      actions.ts                        createProfileAction (parseProfileForm → createProfile)
    [id]/
      page.tsx                          Detalle: traits + barreras + chat embebido
      chat-panel.tsx                    Client: ChatPanel con NDJSON
      edit/
        page.tsx
        edit-form.tsx                   Wrapper ProfileForm initial=<datos>
        actions.ts                      updateProfileAction (id desde hidden)
    import/
      page.tsx                          /profiles/import
      import-client.tsx                 Dropzone + parser + preview por fila
      actions.ts                        importProfilesAction (≤500 filas, sólo válidas)
    seed/
      page.tsx                          /profiles/seed (genera N perfiles con LLM, tras el gate seed_access)
      seed-client.tsx                   Selector N + progreso en vivo (NDJSON stream)

  targets/
    page.tsx                            Listado (renombrado UI "Claridad 5s" desde v0.14.2)
    new/
      page.tsx, new-form.tsx, actions.ts   Form (modo URL u upload), action resuelve og:image
    [id]/
      page.tsx                          Detalle: hero + runs previos + ProfileLaunchPanel
  funnels/
    page.tsx                            Listado
    new/
      page.tsx, new-form.tsx, actions.ts   Form de pasos dinámicos 2..12
    [id]/
      page.tsx                          Detalle: secuencia + runs previos + LaunchPanel
  ab/
    page.tsx                            Listado de A/B tests
    new/
      page.tsx, new-form.tsx, actions.ts   Form con selector de dos targets existentes
    [id]/
      page.tsx                          Detalle + LaunchPanel
      launch-panel.tsx                  Client específico (dispara dos runs 5s paralelos)
  copy/
    page.tsx                            Listado de copy decks
    new/
      page.tsx, new-form.tsx, actions.ts   Form con bloques dinámicos 2..10
    [id]/
      page.tsx                          Detalle: bloques + LaunchPanel
  pricing/
    page.tsx                            Listado de ofertas de pricing
    new/
      page.tsx, new-form.tsx, actions.ts   Form con precios dinámicos 2..8
    [id]/
      page.tsx                          Detalle: oferta + precios + LaunchPanel
  campaigns/
    page.tsx                            Listado de campañas publicitarias
    new/
      page.tsx                          /campaigns/new
      new-form.tsx                      Form con sub-pestañas Canal (Google y Meta activos) y Estrategia filtrada por canal (CHANNEL_STRATEGIES). Preview en vivo por estrategia: SERP, banner Display, feed/9:16/carousel/colección de Meta
      actions.ts                        createCampaignAction con superRefine condicional por strategy
    [id]/
      page.tsx                          Detalle: chips de canal y estrategia + secciones por campo + creatividades por rol + LaunchPanel

  experiments/                          Páginas de resultados de runs (lectura)
    five-second/[runId]/page.tsx
    funnel/[runId]/page.tsx
    ab/[abTestId]/page.tsx
    copy/[runId]/page.tsx
    pricing/[runId]/page.tsx
    campaign/[runId]/page.tsx          Resultados Campañas: KPIs globales, tabla por canal (si > 1), tabla por query, top barreras, sección "como yo lo veo", drill-down por perfil

  api/
    auth/route.ts                       POST verifica password global, setea auth_suaas. DELETE limpia.
    seed/
      access/route.ts                   POST valida SEED_PASSWORD, setea seed_access (8h). DELETE limpia.
      examples/route.ts                 POST seed multi-módulo. Acepta { kinds, launch }. Protegido por seed_access.
    og-image/route.ts                   GET ?url=... resuelve og:image (con assertPublicUrl anti-SSRF)
    diag/route.ts                       GET estado del esquema: tablas + columnas críticas con su migración. JSON con columns / missing_columns / pending_migrations
    chat/route.ts                       POST chat con perfil: Reasoner + Talker streaming NDJSON
    profiles/
      [id]/route.ts                     DELETE perfil
      seed/route.ts                     POST stream NDJSON de generación de N perfiles. Protegido por seed_access (401 sin cookie)
    trash/[type]/[id]/route.ts          POST a papelera, DELETE definitivo, PATCH restaurar. 409 si falta la migración 0017
    runs/
      five-second/route.ts              POST runFiveSecondTest
      funnel/route.ts                   POST runFunnelTest
      ab/route.ts                       POST runAbTest
      copy/route.ts                     POST runCopyTest
      pricing/route.ts                  POST runPricingTest
      campaign/route.ts                 POST runCampaignTest

lib/
  auth.ts                               AUTH_COOKIE, AUTH_VALUE, getAccessPassword, verifyAccessPassword (timingSafeEqual)
  seed-auth.ts                          SEED_COOKIE, getSeedPassword (sin fallback en prod), verifySeedPassword
  error-response.ts                     internalError / validationError / serviceUnavailable (anti-leak de e.message)
  url-safety.ts                         assertPublicUrl: DNS lookup + reglas IPv4/IPv6 anti-SSRF
  version.ts                            APP_VERSION (espejo de package.json, manual sync)
  supabase.ts                           getServerClient (singleton service role), isMissingTableError, isMissingColumnError, MigrationPendingError
  gateway.ts                            DEFAULT_MODEL, REASONER_MODEL, isGatewayConfigured (true en Vercel via OIDC)
  blob.ts                               uploadDataUrlToBlob (acepta image|video|audio data:URL)
  utils.ts                              cx() helper

  profiles.ts                           ProfileInputSchema + CRUD (create / update / get / list / listByIds / softDelete / restore / hardDelete)
  profile-form.ts                       ProfileFormSchema + parseProfileForm (reusado por new y edit)
  profile-filters.ts                    ProfileFilters (rangos + texto contiene) + filterProfiles
  csv.ts                                parseCSV, stringifyCSV, detectSeparator (RFC 4180 simplificado)
  profile-csv.ts                        PROFILE_CSV_HEADERS, profileToCsvRow, validateCsvRow
  seed-profiles.ts                      PROFILE_SEEDS (50 curados) + streamSeededProfiles (Reasoner via generateObject)
  seed-examples.ts                      seedFiveSecondExample, seedCopyExample, seedPricingExample, seedAbExample, seedFunnelExample, seedCampaignExample, seedGeoExample, seedMomentumExample + pickRandomProfileIds. Cada seed acepta un plan opcional generado desde un brief
  seed-brief.ts                         generateSeedPlan(brief, kinds): una llamada generateObject produce contenido coherente (misma marca/sector) para los módulos seleccionados; sanea límites duros (headlines 30 chars, etc.). Scope de telemetría seed_brief

  runs.ts                               Run/Message types, RunKind union, createRun (defensivo si schema cache stale), markRunFinished, nextTurn, appendMessage, upsertMetric, listMessages, listEffortValues, getRunsStatsByEntity, listRunsBy*
  prompts.ts                            buildSystemPrompt(profile) con negative prompts y voice anchors
  agents.ts                             ReasonerPlanSchema, reason() (generateObject Opus), talkStream() (streamText Sonnet)
  image-source.ts                       resolveImageForApi (descarga + valida mime + redimensiona a 1024px de lado largo con sharp + base64 para Anthropic multimodal)
  usage.ts                              UsageScope (incluye campaign_probe, campaign_landing, campaign_ideal), recordUsage, getUsageSummary (paginado), getScopeAverages (split prompt/completion), getGatewayCredits
  model-pricing.ts                      tarifas $/MTok por modelo (con fallback por familia), usdForTokens, formatUsd (es-ES); módulo puro importable desde cliente
  estimate.ts                           estimador de coste por acción: EstimatePart, estimateAction, estimateManyUsd, partsForKind (fórmulas de llamadas por kind); alimenta GET /api/estimate/run y los costes server-side de los botones
  landing-pricing.ts                    datos de la landing comercial /propuesta: catálogo de modelos de IA (Anthropic/OpenAI/Gemini/Perplexity con precios verificados), tiers, runCostEur, runsForBudget; módulo puro para page (server) y calculadora (client)

  targets.ts                            TargetInputSchema + CRUD + getTargetWithTrashed + resolveOgImageDetailed (con anti-SSRF, 5s timeout, max-redirects=3, body 1.5MB)
  funnels.ts                            FunnelInputSchema + CRUD + getFunnelWithTrashed
  ab.ts                                 AbTestInputSchema + CRUD + linkAbTestRun + getAbTestWithTrashed
  copy.ts                               CopyDeckInputSchema + CRUD + getCopyDeckWithTrashed
  pricing.ts                            PricingOfferInputSchema + CRUD + getPricingOfferWithTrashed
  campaigns.ts                          CHANNEL_VALUES, STRATEGY_VALUES (7 Google + 3 Meta), CHANNEL_STRATEGIES, CREATIVE_ROLE_VALUES, CTA_VALUES + META_CTA_VALUES, META_OBJECTIVE/PLACEMENT_*, META_LIMITS, MetaSpecSchema, CampaignInputSchema con superRefine por strategy + CRUD + normalizeCampaign (defensivo) + getCampaignWithTrashed
                                        (patrón v0.34: los getters normales filtran papelera; las variantes WithTrashed no filtran deleted_at y alimentan las vistas de resultados históricos para que no rompan)
  trash.ts                              TRASH_TYPES (9 tipos: targets, funnels, ab, copy, pricing, campaign, geo, momentum, profiles), sendToTrash/restoreFromTrash/hardDelete despachan por tipo

  experiments/
    five-second.ts                      probeProfile + judgeComprehension + runFiveSecondTest + listFiveSecondResponses
    funnel.ts                           probeFunnelStep + runFunnelTest + listFunnelStepResponses
    ab.ts                               runAbTest (dos 5s en paralelo, link a ab_test_runs)
    copy.ts                             reactToBlock + runCopyTest + listCopyResponses
    pricing.ts                          reactToPrice + runPricingTest + listPricingResponses
    campaign.ts                         probeCampaignSnippet (renderiza SERP search o banner display) + judgeLandingMatch + proposeIdealVersion + runCampaignTest + summary con byQuery y byChannel + cap combinacional 200
    campaign-shared.ts                  constantes compartidas con componentes cliente (GENERAL_CONTEXT_QUERY); campaign.ts arrastra sharp/Supabase y no puede entrar en el bundle del navegador

components/
  app-shell.tsx                         AppShell (sidebar + main + footer badges) + PageHeading (variants inline|panel)
  sidebar.tsx                           Sidebar lateral (240px desktop, drawer móvil) con grupos Producto / Sistema
  console-banner.tsx                    Imprime "SUAAS · FLAT 101 vX.Y.Z" en la consola del navegador
  info-tooltip.tsx                      Tooltip CSS-only (hover/focus)
  result-bar.tsx                        Barra de progreso 0..1 con label + porcentaje + hint
  migration-needed.tsx                  Aviso estándar "aplica esta migración" cuando isMissingTableError
  seed-gate.tsx                         Client: formulario del pass seed_access (SEED_PASSWORD); compartido por /seed-examples y /profiles/seed
  profile-form.tsx                      ProfileForm compartido new + edit (Big Five con step 0.01, COM-B, géneros, etc.)
  profile-explorer.tsx                  Grid / tabla con filtros, sort, paginación 30, sel + acciones (manage|picker|standalone)
  profile-launch-panel.tsx              CTA colapsable + ProfileExplorer picker + POST endpoint + redirect a resultados
  entity-card.tsx                       Tarjeta unificada (fecha + kind + stats[]) para los 6 listados
  entity-list.tsx                       EntityListView (búsqueda + sort + paginación) sobre EntityCard
  runs-previous.tsx                     RunsPreviousGrid con tarjetas de runs previos + métricas configurable
  trash-button.tsx                      SendToTrashButton (icono en cada card) → POST /api/trash/[type]/[id]
  remove-icon-button.tsx                RemoveIconButton: icono papelera para borrar filas del estado local de los forms /new (no toca la papelera del sistema)
  channel-icon.tsx                      SVGs monocromos para google · meta · linkedin · tiktok · x (Channel)
  strategy-icon.tsx                     Iconos lucide para las 10 strategies (7 de Google + meta_single · meta_carousel · meta_collection)

public/
  logos/flat101.svg                     Logo de marca (ink → invertido sobre fondo oscuro)

supabase/
  migrations/
    0001_initial.sql                    profiles, targets, runs, messages, metrics + trigger updated_at
    0002_five_second.sql                five_second_responses
    0003_funnels.sql                    funnels + funnel_steps (sequence ordenada)
    0004_funnel_runs.sql                runs.funnel_id + funnel_step_responses
    0005_gateway_usage.sql              gateway_usage (telemetría tokens)
    0006_ab_copy_pricing.sql            ab_tests + copy_decks/blocks/responses + pricing_offers/prices/responses + runs.{ab_test_id, copy_deck_id, pricing_offer_id}
    0007_trash.sql                      deleted_at en las 5 entidades originales (geo/momentum/profiles llegan en 0017)
    0008_campaigns.sql                  campaigns (RSA) + campaign_responses + runs.campaign_id
    0009_campaigns_relax.sql            headlines check 1..15 (antes 3..15)
    0010_campaigns_channel.sql          campaigns.channel (single)
    0011_campaigns_multichannel.sql     channel → channels text[] (1..5) + backfill + campaign_responses.channel + nuevo unique (run, profile, query, channel)
    0012_campaigns_headlines_fix.sql    Idempotente: asegura headlines 1..15 si 0009 nunca se aplicó
    0013_campaigns_strategy.sql         campaigns.strategy (search por defecto, check sobre los 7 valores)
    0014_campaigns_display.sql          campaigns.company_name, long_headline, cta (campos de Display Ads)
    0015_gravity_model.sql              profiles.intent_context, five_second_responses.behavior_class, tabla geo_analyses
    0016_momentum.sql                   tabla momentum_challenges
    0017_trash_geo_momentum_profiles.sql  deleted_at en geo_analyses, momentum_challenges y profiles
    0018_campaigns_descriptions_fix.sql descriptions check 1..5 (antes 2..4, drift con zod) + índice campaigns.deleted_at
    0019_consolidacion.sql              tabla suaas_migrations (tracking) + drop channel legacy + checks reales + RLS + columnas intended_message, comprehension_rate, behavior_class, shown_*
    0020_shopping.sql                   campaigns.product (jsonb): producto del feed para Shopping
    0021_meta_ads.sql                   canal Meta: strategy check con meta_single/carousel/collection, company_name 75c, CTAs de Meta, campaigns.channel_spec (jsonb)
    0022_tiktok_ads.sql                 canal TikTok: strategy check con tiktok_video/carousel/spark, CTAs de TikTok; defensivo: channel_spec + company_name 75c si la 0021 no consta

proxy.ts                                Middleware: redirige a /login todo lo no público sin cookie
next.config.ts                          experimental.serverActions.bodySizeLimit = "10mb"
tsconfig.json
package.json                            version manual sync con lib/version.ts
.env.example
AGENTS.md                               Reglas operativas para el LLM agente
CLAUDE.md                               @AGENTS.md + reglas de SUAAS
docs/                                   Esta documentación
```

## Autenticación

### Gate principal: `auth_suaas`

Login con **password global** `ACCESS_PASSWORD` (env), fallback dev `michel101`. Cookie `auth_suaas=ok` (`httpOnly`, `sameSite=lax`, `secure` en prod, 30 días).

Flujo:
1. `proxy.ts` intercepta cada request (matcher excluye `_next/static`, `_next/image`).
2. Si la ruta está en `PUBLIC_PATHS` (`/login`, `/api/auth`, `/robots.txt`, `/favicon.ico`), empieza por `/_next/` o `/logos/`, es del onboard público (`/onboard`, `/onboard/*`, `/api/onboard/*`), es `/api/qr`, o cumple los regex de favicons, pasa sin auth. **Toda ruta pública nueva amplía la superficie sin login: tratarla con el mismo rigor que el onboard** (rate limit, validación, errores genéricos).
3. Si no, comprueba `auth_suaas` cookie. Si no es `"ok"`, redirige a `/login`.

`verifyAccessPassword` usa `crypto.timingSafeEqual` y, en producción, sin `ACCESS_PASSWORD` definida devuelve `null` y rechaza todo intento.

### Gate secundario: `seed_access`

Sólo se aplica a las rutas operativas que consumen tokens del Gateway en lote:
- `GET /seed-examples` (la página)
- `POST /api/seed/examples` (el endpoint)
- `GET /profiles/seed` (la página, desde v0.34)
- `POST /api/profiles/seed` (el endpoint, desde v0.34)

Cookie `seed_access=ok` (`httpOnly`, 8h). Verificada en server-side por las `page.tsx` y los endpoints. Si falta, la page muestra `<SeedGate>` (formulario de password, `components/seed-gate.tsx`, compartido por ambas páginas) y el endpoint responde 401 / 503 según el caso.

`SEED_PASSWORD` env. En producción es obligatoria (sin ella, 503 con `code: seed_password_unset`). En dev cae a `michel101` si falta.

## Modelo de datos

Sin RLS. Acceso vía `SUPABASE_SERVICE_ROLE_KEY` desde server (`lib/supabase.ts → getServerClient`). El navegador nunca habla con la base.

### Tablas

| Tabla | Propósito | Notas |
|---|---|---|
| `profiles` | Vignettes grounded: `demographics` jsonb (edad/género/ocupación/ingresos/geo), `big_five` jsonb (O/C/E/A/N 0..1), `com_b_barriers` jsonb (capability/opportunity/motivation arrays), `backstory` text, `source`, `intent_context` text (JTBD, v0.29, se inyecta en todos los system prompts del perfil), `avatar_url` text (v0.57: retrato fotorrealista generado por IA vía gateway, `lib/avatar.ts`, modelo `google/imagen-4.0-generate-001` configurable con `SUAAS_AVATAR_MODEL`, fijado en Vercel Blob; el prompt no incluye el nombre y la UI lo etiqueta como generado por IA; `POST /api/profiles/[id]/avatar`). | Trigger `updated_at`. `deleted_at` desde 0017: el borrado de UI es soft (el duro, solo desde /trash, destruye runs y respuestas en cascada). `listProfilesByIds` NO filtra `deleted_at` para que los históricos de runs sigan mostrando el perfil. Mismo patrón en el resto de entidades vía las variantes `getXWithTrashed` (v0.34): los getters normales filtran papelera y las vistas de resultados históricos usan la variante para no romper. |
| `targets` | Pantalla evaluable. `kind` + `payload` jsonb (kind `5s_test` con `main_promise`, `image_url`, `source_url?`). | `deleted_at` desde 0007. |
| `runs` | Sesión de simulación. `profile_id` (owner del run), `kind`, `status`, `params jsonb`, `created_at`, `finished_at`. FKs nullable: `target_id`, `funnel_id`, `ab_test_id`, `copy_deck_id`, `pricing_offer_id`, `campaign_id`. |
| `messages` | Trazas por turno. `role`: `human | talker | reasoner | system`. `meta jsonb` con `model`, `tokens`, `latency`, `plan` (para reasoner). |
| `metrics` | Resultados agregados por run: pares `(key, value, unit)`. |
| `five_second_responses` | `(run_id, profile_id)` único. `recall`, `perceived_offer`, `clarity`, `comprehension_rate`, `barriers_detected text[]`, `behavior_class` (`optima`/`fuga`/`repesca`, v0.29, check nullable), `meta jsonb`. |
| `funnels` | `name`, `description`, `deleted_at`. |
| `funnel_steps` | `funnel_id`, `position` (único), `name`, `intent`, `payload jsonb {kind:"url", image_url, source_url?}`. |
| `funnel_step_responses` | `(run_id, profile_id, step_id)` único. `position`, `perception`, `intent_match`, `effort`, `friction text[]`, `would_continue`, `reasoning`, `meta`. Sólo filas para pasos evaluados (dropoff corta). |
| `gateway_usage` | Telemetría por llamada: `scope`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `meta`. Scopes hoy: `probe_5s`, `judge_5s`, `probe_funnel`, `reasoner_chat`, `talker_chat`, `copy_resonance`, `pricing_react`, `campaign_probe`, `campaign_landing`, `campaign_ideal`, `onboard_synthesize`, `profile_avatar` (retratos: coste por imagen en `meta.est_usd`, sin tokens), `geo_probe` (sondas reales: el `model` es el del motor elegido en `/tokens`), `geo_analysis`, `momentum_probe`, `seed_brief`. (`seed_profile` no es un scope: `lib/seed-profiles.ts` usa `reasoner_chat` con `meta.kind`. El JTBD de `batch-intent` no registra scope propio.) |
| `ab_tests` | `target_a_id` ≠ `target_b_id` (check). `hypothesis`. `deleted_at`. |
| `ab_test_runs` | Vincula `(ab_test_id, run_id, variant 'A'|'B')`. Unique. |
| `copy_decks` + `copy_blocks` + `copy_responses` | Deck con 2..10 bloques. Reacción `(run, profile, block)` con sentiment/clarity/persuasion/would_click/critique. |
| `pricing_offers` + `pricing_prices` + `pricing_responses` | Oferta + 2..8 precios. Reacción por (run, profile, price) con would_buy/willingness_to_pay/perceived_value/critique. |
| `campaigns` | **Módulo Campañas** (ver sección dedicada). |
| `campaign_responses` | `(run_id, profile_id, query, channel)` único (multichannel). |
| `geo_analyses` | **GEO Tester** (v0.29, Gravity Model; sondas reales desde v0.56). `name`, `brand_name`, `brand_description`, `segments jsonb` (array de SegmentInput: label/jtbd/query), `results jsonb` (array de SegmentResult; v2 con array `engines` por segmento: respuesta real, citas y métricas por motor; v1 legado con `simulated_response`), `status` (`pending`/`running`/`done`/`error`). Índice `created_at DESC`. Sin tabla de runs: el análisis vive entero en la fila. | `deleted_at` desde 0017 (papelera). |
| `app_settings` | **Ajustes globales** (v0.56). Clave/valor jsonb (`key` pk, `value`, `updated_at`). Primer uso: `geo_engine_models` (modelo del gateway por motor del GEO Tester). Lectura/escritura vía `lib/settings.ts` (defaults si falta la tabla). | Migración 0023. |
| `momentum_challenges` | **Momentum** (v0.30, Gravity Model). `name`, `trigger_scenario`, `brand_context` (nullable), `profile_ids uuid[]`, `results jsonb` (array de ProfileMomentumResult), `status` (`pending`/`running`/`done`/`error`). | `deleted_at` desde 0017 (papelera). |
| `brands` + `brand_documents` | **Cerebro** (v0.59, base de conocimiento de marca). `brands`: `name`, `description` (identidad reutilizable), `deleted_at`. `brand_documents`: `brand_id` (FK on delete cascade), `title`, `kind` (nota/brief/tono/producto/analytics/voc/informe), `content` (markdown), `sensitive` (v0.60: privado, excluido de `buildBrandContext`, no se envía a los modelos). `lib/cerebro.ts`. El selector (`components/brand-picker.tsx` + `GET /api/brands`) vuelca `buildBrandContext` (descripción + documentos no privados) en los campos de marca de GEO, Momentum, Campañas, Copy, Pricing y Claridad 5s; siempre se puede escribir a mano. | Migraciones 0025 y 0026. `deleted_at` en `brands` (papelera, tipo `brand`). |

### Migraciones (orden estricto)

1. `0001_initial.sql`
2. `0002_five_second.sql`
3. `0003_funnels.sql`
4. `0004_funnel_runs.sql`
5. `0005_gateway_usage.sql`
6. `0006_ab_copy_pricing.sql`
7. `0007_trash.sql`
8. `0008_campaigns.sql`
9. `0009_campaigns_relax.sql`
10. `0010_campaigns_channel.sql`
11. `0011_campaigns_multichannel.sql`
12. `0012_campaigns_headlines_fix.sql` (idempotente, parche por si 0009 no se aplicó)
13. `0013_campaigns_strategy.sql`
14. `0014_campaigns_display.sql`
15. `0015_gravity_model.sql` (Gravity Model v0.29: `profiles.intent_context`, `five_second_responses.behavior_class`, tabla `geo_analyses`)
16. `0016_momentum.sql` (Momentum v0.30: tabla `momentum_challenges`)
17. `0017_trash_geo_momentum_profiles.sql` (v0.32: `deleted_at` en `geo_analyses`, `momentum_challenges` y `profiles`)
18. `0018_campaigns_descriptions_fix.sql` (v0.32: check de `descriptions` 1..5 + índice `campaigns.deleted_at`)
19. `0019_consolidacion.sql` (v0.37: tabla `suaas_migrations` con backfill, drop del `channel` legacy, checks de arrays con coalesce y de Display, CTA del set o ≤ 10c, RLS en `campaigns`/`campaign_responses`, columnas `intended_message`, `comprehension_rate`, `behavior_class`, `shown_headlines`, `shown_descriptions`)
20. `0020_shopping.sql` (v0.45: `campaigns.product` jsonb para Shopping)
21. `0021_meta_ads.sql` (v0.54: canal Meta; check de `strategy` con los 3 formatos, `company_name` 75c, CTAs de Meta en el check de `cta`, columna `campaigns.channel_spec` jsonb)
22. `0022_tiktok_ads.sql` (v0.55: canal TikTok; check de `strategy` con los 3 formatos `tiktok_*`, CTAs de TikTok en el check de `cta`, y de forma defensiva `channel_spec` + `company_name` 75c por si la 0021 no consta)
23. `0023_app_settings.sql` (v0.56: tabla `app_settings` clave/valor para ajustes globales; comment de `geo_analyses.results` actualizado al shape v2 de sondas reales)
24. `0024_profile_avatar.sql` (v0.57: `profiles.avatar_url` para el retrato generado por IA)
25. `0025_cerebro.sql` (v0.59: Cerebro; tablas `brands` y `brand_documents`)
26. `0026_brand_documents_sensitive.sql` (v0.60: `brand_documents.sensitive`, documento privado excluido de los prompts)

Las 26 constan aplicadas en `suaas_migrations` (las 20 primeras el 2026-06-11; la 0021 y la 0022 el 2026-06-12 vía SQL editor; la 0023 y la 0024 vía MCP de Supabase con `apply_migration`). Para futuras migraciones: el MCP de Supabase del proyecto (`.mcp.json`, OAuth) está operativo y permite `apply_migration`/`execute_sql`; también existe `scripts/apply-tiktok-setup.mjs` como referencia del patrón con `pg` (necesita `POSTGRES_URL_NON_POOLING` en `.env.local`, que Vercel exporta vacía por ser sensitive). Convención desde la 0019: cada migración nueva inserta su propia fila al final. Tras cada `ALTER`, ejecutar `NOTIFY pgrst, 'reload schema';` en el SQL editor o esperar a que PostgREST refresque solo (lo hace cada ~10 min). `/diag` y `/api/diag` auditan el estado (sección «Tracking de migraciones» y campo `migrations_tracking`); el campo `pending_migrations` del JSON de `/api/diag` es el atajo para saber qué archivos `.sql` faltan por aplicar.

## Módulo Campañas (Paid Ads): detalle

Es el módulo más complejo. Modela publicidad pagada **simulada en distintas redes y estrategias**. Hoy funcionan **6 de las 7 estrategias de Google Ads**, con requisitos verificados fila a fila contra las specs oficiales (answers 17092074, 17091269, 17091672, 17091270 y la spec del feed 7052112): **Search RSA** (1-15 titulares 30c, 1-4 descripciones 90c, empresa 25c + logo 1:1 obligatorios), **Display RDA**, **Performance Max** (3-15 titulares con ≥1 de ≤15c, titular largo, 2-5 descripciones, CTA, landscape+square+logo), **Demand Gen** (1-5 titulares de 40c con ≥1 de ≤30c, CTA obligatoria), **Video** (1 vídeo + 1 titular 30c + 1 descripción 90c; titular largo y CTA ≤10c opcionales) y **Shopping** (ficha generada desde `campaigns.product`: id, título 150c, descripción, precio ISO 4217, disponibilidad, marca/GTIN/MPN/condición). Solo **App Campaigns** queda como `Próx.` dentro de Google. El formulario presenta primero los campos comunes (nombre, brief, mensaje pretendido, URL final, landing), después canal + estrategia y por último los específicos, con vista previa propia por estrategia (SERP, banner, tarjeta de feed, pre-roll, ficha de producto).

Desde v0.54.0 también funciona el **canal Meta Ads** con sus **3 formatos como estrategias** (`meta_single` imagen/vídeo único, `meta_carousel` secuencia de 2-10 tarjetas, `meta_collection` portada + ≥4 tiles de producto), con specs verificadas contra el Ads Guide oficial y la Marketing API (asset_feed_spec, placement-targeting) el 2026-06-12. En Meta el tipo de campaña es el **objetivo ODAX** (awareness/traffic/engagement/leads/app_promotion/sales) y no determina los campos del anuncio, así que vive junto al **placement de simulación** (Feed de Facebook, Feed de Instagram, Stories, Reels, Threads, Estados de WhatsApp), los **1..5 textos principales** y el enlace visible en `campaigns.channel_spec` (jsonb, migración 0021). Los caps de copy distinguen **máximo técnico** (primary 1.024c, headline/description 255c, 5 variantes por campo) de **recomendado visible antes de truncar** (125/40/30; el form avisa en ámbar sin bloquear y el runner trunca con «Ver más» según el placement: feed/Stories 125c, Reels 72c, Threads 160c). La CTA es obligatoria y sale de la lista cerrada de Meta en castellano; la identidad es el nombre de página de Facebook (75c). El runner muestrea UNA combinación texto principal + titular + descripción por impresión (flexible ad format real), framea por placement y objetivo, y el ranking por asset incluye los textos principales (`kind: primary_text`).

Desde v0.55.0 funciona el **canal TikTok Ads** con sus **3 formatos como estrategias** (`tiktok_video` vídeo in-feed de subasta, `tiktok_carousel` carousel de 2-35 imágenes con música obligatoria, `tiktok_spark` post orgánico promocionado), con specs verificadas contra el TikTok Business Help Center y la Marketing API el 2026-06-12. Lo específico vive en `campaigns.channel_spec` con el **discriminador `network: "tiktok"`** (el tipo `ChannelSpec` es un union `MetaSpec | TikTokSpec`; los call sites usan `metaSpecOf`/`tiktokSpecOf`): objetivo (reach/traffic/video_views/community_interaction/app_promotion/lead_generation/sales), **1..5 textos de anuncio** (el runner muestrea UNO por impresión, como rota Smart+ su `ad_text_list`), `identity_handle` y `music_name`. Caps: ad text **1-100c sin emojis ni «#»/«{ }»** (Spark hereda el caption del post: 150c, emojis permitidos), display name 40c técnicos / ~20 visibles, vídeo 9:16 ≥540x960 (5-60s, mejor 21-34s, ≤500 MB), carousel 2-35 imágenes (720x1280 recomendado) con música obligatoria. CTA obligatoria de la lista cerrada localizada al español (25 opciones; migración 0022). No hay titulares ni descripciones: esos arrays van vacíos. El runner framea el feed «Para ti» con las ventanas reales del targeting (vídeos/hashtags de los últimos 7-15 días, creadores de 30) y trunca el caption a ~2 líneas con «[más]»; la preview del form replica la anatomía del feed (columna de iconos, @usuario + «Patrocinado», música, CTA). LinkedIn y X siguen como `Próx.`.

### Schema (`campaigns`)

```
id uuid pk
created_at timestamptz
deleted_at timestamptz
name text                         -- nombre interno
brief text                        -- contexto del operador (no se enseña al perfil)
final_url text                    -- landing
landing_image_url text            -- og:image resuelta o screenshot
landing_source_url text           -- URL original si se resolvió por og
queries text[] (1..5)             -- search: keywords. display/meta/tiktok: intereses opcionales
headlines text[] (0..15)          -- google: 30c (40c demand_gen). meta: 0..5 con 255c (40 visibles). tiktok: vacío
descriptions text[] (0..5)        -- google: 90c. meta: 0..5 con 255c (30 visibles), opcionales. tiktok: vacío
creatives jsonb [{kind, role, url, card_headline?, card_description?, ...}]
channels text[] (1..5)            -- subset de {google, meta, linkedin, tiktok, x}
strategy text                     -- google: {search, display, pmax, demand_gen, video, app, shopping}
                                  -- meta:   {meta_single, meta_carousel, meta_collection}
                                  -- tiktok: {tiktok_video, tiktok_carousel, tiktok_spark}
company_name text                 -- Display: max 25c. Meta: nombre de página, max 75c. TikTok: display name, max 40c (20 visibles)
long_headline text                -- Display: max 90c
cta text                          -- set de Google, de Meta o de TikTok (castellano) o ≤10c (Video)
product jsonb                     -- solo shopping: producto del feed de Merchant Center
channel_spec jsonb                -- meta:   {objective, placement, primary_texts[1..5] ≤1024c, display_link?}
                                  -- tiktok: {network: "tiktok", objective, ad_texts[1..5] ≤100c (spark 150c), identity_handle?, music_name?}
```

### Schema (`campaign_responses`)

```
(run_id, profile_id, query, channel) único
intent_to_click numeric 0..1
perceived_offer text
clarity numeric 0..1
credibility numeric 0..1
differentiation numeric 0..1
barriers text[]
landing_evaluated boolean
landing_match numeric 0..1 null (sólo si intent >= 0.5)
landing_critique text null
ideal_headline text (≤30c)
ideal_description text (≤90c)
ideal_promise text
ideal_free_text text null
channel text                      -- duplicado de la fila padre para queries directas
```

### Canales

`Channel = google | meta | linkedin | tiktok | x`. `google` y `meta` son seleccionables en el form (con sus propios campos y caps); LinkedIn, TikTok y X se muestran como `Próx.`. Las estrategias visibles por canal viven en `CHANNEL_STRATEGIES` y el default en `DEFAULT_STRATEGY_BY_CHANNEL`.

### Estrategias por canal

Google: `search | display | pmax | demand_gen | video | app | shopping` (todas implementadas salvo `app`). Meta: `meta_single | meta_carousel | meta_collection` (las tres implementadas). Ejemplos:

- **search** (RSA): URL final + 3..15 titulares (30c) + 2..4 descripciones (90c) + 1..5 queries.
- **display** (RDA): nombre de empresa (25c) + titular largo (90c) + 1..5 titulares cortos (30c) + 1..5 descripciones (90c) + CTA + creatividades obligatorias por rol (landscape 1.91:1, square 1:1, logo_square 1:1).
- **meta_single**: nombre de página (75c) + 1..5 textos principales (≤1.024c, 125 visibles) + 1..5 titulares (≤255c, ~40 visibles; no se muestran en Stories/Reels/Status) + 0..5 descripciones + CTA de la lista de Meta + 1 creatividad (imagen o vídeo con miniatura).
- **meta_carousel**: lo anterior sin titulares generales + 2..10 creatividades `role: card`, cada una con `card_headline` (45c rec) y `card_description` opcional (18c rec). En Threads solo tarjetas de imagen.
- **meta_collection**: 1 `role: cover` + ≥4 `role: card` (tiles de producto) + 1 titular. Solo placements móviles (feeds y Stories de Instagram, feed de Facebook).

`isStrategyImplemented(s)` central. Para añadir una estrategia nueva basta con:
1. Añadir campos específicos al schema (migración).
2. Extender `CampaignInputSchema.superRefine` con sus reglas.
3. Branch en el form (igual que ya hay search vs display vs meta).
4. Branch en el runner (`renderSnippetText`, `framingByChannel`).
5. `isStrategyImplemented` devolverá `true`.

### Roles de creatividades

Cada `Creative` lleva `kind` (`image | video | youtube`) y `role`:

| Role | Aplica a | Obligatorio en |
|---|---|---|
| `generic` | Cualquiera | Search (sin requisitos) |
| `landscape_image` (1.91:1) | Display | sí, ≥1 |
| `square_image` (1:1) | Display | sí, ≥1 |
| `portrait_image` (4:5) | Display | opcional |
| `logo_square` (1:1) | Display | sí, ≥1 |
| `logo_landscape` (4:1) | Display | opcional |
| `video_youtube` | Display, otros | opcional |
| `card` (1:1) | Meta carousel/collection | carousel: 2..10 · collection: ≥4 |
| `cover` | Meta collection | sí, exactamente 1 |

Las tarjetas de Meta llevan además `card_headline` y `card_description` (texto por tarjeta; caps duros 255c con recomendados 45/18).

YouTube extrae `youtube_id` del URL con regex (`extractYouTubeId`) y guarda el thumbnail (`youtubeThumbnail(id)`). El runner usa este thumbnail jpg como multimodal (los modelos no procesan vídeo).

### Runner (`lib/experiments/campaign.ts`)

Arquitectura en dos fases desde v0.38.0: `prepareCampaignRun`/`prepareCampaignResume` (validación + creación o rehidratación del run, dentro del request) y `executeCampaignRun` (procesado en `after()` del route handler). `runCampaignTest` queda como wrapper síncrono para el sembrador.

1. Carga campaña y perfiles. Valida: `search` exige queries, `channels` no vacío, `≤20` perfiles.
2. Para estrategias sin queries (Display sin intereses), usa placeholder `GENERAL_CONTEXT_QUERY`.
3. **Cap combinacional**: `profiles × channels × queries ≤ 200` (también validado en cliente desde v0.38.1).
4. Crea `runs` con `kind="campaign"` y responde al instante; la página de resultados muestra el progreso con polling.
5. Cola aplanada `profile × channel × query` con worker pool de 5, 1 reintento por combinación y deadline interno a 270s. Por combinación:
   - **Muestreo RSA (v0.40)**: en Search/Google el persona ve UNA combinación muestreada (3 titulares + 2 descripciones) con RNG determinista por `profileId + query` (`sampleRsaCombination`), no el inventario completo: cada respuesta evalúa una combinación, no el conjunto. La combinación se persiste en `shown_headlines`/`shown_descriptions`. Los runs anteriores a v0.40 no son comparables con los posteriores.
   - `probeCampaignSnippet`: Reasoner en texto puro; si la campaña adjunta creatividades el probe pasa a `DEFAULT_MODEL` (v0.47.1: Opus 4.7 + `generateObject` + imágenes devuelve el JSON envuelto en XML de tool-call y el AI SDK no lo parsea, el mismo mismatch documentado en five-second). Render del snippet depende de strategy (`renderSearchSnippet` con la combinación muestreada, `renderDisplaySnippet`) y framing por channel. Adjunta creatividades como imágenes (las video sólo si tienen `thumbnail_url`). El brief del anunciante NO se inyecta al persona (v0.35.0).
   - Si `intent_to_click >= 0.5` (LANDING_THRESHOLD): `judgeLandingMatch` (multimodal con landing image, `DEFAULT_MODEL` desde v0.47.1 por el mismo mismatch).
   - Si la campaña define `intended_message`: `judgeAdComprehension` (juez neutral sin persona, v0.39.0).
   - `proposeIdealVersion`: Sonnet, propuesta del perfil con misma estructura RSA + texto libre opcional.
6. Persiste cada respuesta en `campaign_responses` con `onConflict: "run_id,profile_id,query,channel"` (idempotente: la reanudación con `resumeRunId` salta lo ya persistido).
7. Cierre garantizado: summary (globales + `byChannel` + `byQuery` + top barreras + `behavior_counts` + `byAsset`) sobre TODO lo persistido, métricas `n_failed`/`n_skipped_deadline` y síntesis «Qué cambiar» (`synthesizeRecommendations`, persistida en `runs.params.recommendations`). Desde v0.47.1 el runner también persiste `runs.params.last_error` (último error de combinación, o null si el cierre fue limpio): la página del run lo muestra cuando el estado es `error`, y `RunProgress` ofrece «Retomar» también con 0 respuestas (antes solo con parciales).

Telemetría: `gateway_usage` con scopes `campaign_probe`, `campaign_landing`, `campaign_ideal`, `campaign_judge`, `campaign_synthesis`.

### Defensa frente a migraciones pendientes

`normalizeCampaign(row)` en `lib/campaigns.ts`: si la fila no tiene `channels` (BD pre-0011), lee el `channel` legacy y lo envuelve. Si no tiene `strategy` (pre-0013), cae a `"search"`. Esto evita 500 en `/campaigns` cuando se despliega código nuevo antes de aplicar la migración correspondiente.

`createCampaign` intenta primero el shape moderno; si Postgres responde "columna no existe", hace fallback al shape anterior con `console.warn` accionable.

## Módulos Gravity Model (v0.29-v0.30)

Cuatro funcionalidades que modelan la intención del usuario como un vector (intensidad, dirección, velocidad) en lugar de como demografía estática. **Base teórica completa del marco en [`GRAVITY-MODEL.md`](./GRAVITY-MODEL.md)** (Intent Momentum, planos de influencia, instancias, aha moment, GEO).

### 1. Contexto JTBD en perfiles (`intent_context`)

Campo libre en `profiles`. Formato recomendado «Cuando [situación], quiero [motivación] para poder [resultado]». `buildSystemPrompt` lo inyecta como bloque «Contexto de intención (JTBD)» en TODAS las llamadas que usan ese perfil (chat, 5s, campaña, momentum, etc.). Editable en el form de perfil. Generable en lote por LLM vía `POST /api/profiles/batch-intent` (procesa los 10 perfiles más recientes; `force` regenera los que ya tienen contexto). Migración `0015`.

### 2. Intent Momentum en el chat

`ReasonerPlanSchema` (en `lib/agents.ts`) incluye un objeto `momentum` con `intensity` (0..1), `direction` (`approaching`/`stable`/`drifting`) y `velocity` (`accelerating`/`steady`/`decelerating`). El Reasoner lo rellena cada turno sin llamada extra. El `ChatPanel` lo pinta como `MomentumIndicator` bajo el razonamiento.

### 3. Clasificación de conducta 5s (`behavior_class`)

`ProbeOutputSchema` (en `lib/experiments/five-second.ts`) añade `behavior_class` (`optima` = comprende y avanza, `fuga` = carga cognitiva alta, abandona, `repesca` = duda pero intención viva). El LLM clasifica su propia conducta durante el probe (sin llamada extra). Se persiste en `five_second_responses` y la página de resultados muestra la distribución. Migración `0015`.

### 4. GEO Tester (Generative Engine Optimization): `lib/geo.ts` + `lib/geo-engines.ts`

**Sondas reales desde v0.56** (antes simulaba). La query de cada segmento de intención (JTBD) se lanza tal cual contra 3 motores reales vía AI Gateway: **Claude** (modelo Anthropic + tool server-side `web_search_20250305` con `maxUses: 3` y `userLocation` España), **ChatGPT** (tool `web_search` de la Responses API de OpenAI) y **Perplexity** (Sonar busca y cita solo). Las tool factories vienen de `@ai-sdk/anthropic` / `@ai-sdk/openai`, pero la llamada va por el gateway (string `provider/model`). Un segundo paso (`generateObject`, `DEFAULT_MODEL`, scope `geo_analysis`) analiza cada respuesta real: `brand_mentioned`, `brand_position`, `visibility_score`, `recommendation_tone`, `key_claims`, `missing_attributes`. Por segmento se guarda `engines[]` (motor, modelo, respuesta, citas de `result.sources`, métricas o `error`); los resultados v1 (`simulated_response`) se renderizan como legado. El **modelo de cada motor se elige en `/tokens`** (catálogo en `lib/geo-engines.ts`, persistencia en `app_settings.geo_engine_models`). Runner: segmentos en pares, 3 motores en paralelo por segmento (una sonda con búsqueda tarda 30-50 s), `maxDuration = 300`. Scopes: `geo_probe` (sondas, modelo del motor) y `geo_analysis` (análisis). Rutas: `/geo` (lista), `/geo/new`, `/geo/[id]` (pestañas por motor + citas + visibilidad por motor). API: `POST /api/geo/run` `{ geoId }`. Tabla `geo_analyses`. Migraciones `0015`, `0023`. AI Overview y Gemini: pendientes (sin API oficial / próximo).

### 5. Momentum (Intent Momentum ante-touchpoint): `lib/momentum.ts`

Define **Triggers** (escenarios de activación JTBD) y simula cómo cada perfil los abordaría en su vida real, antes de que ninguna marca entre en su radar. Por perfil: `intent_narrative` (1ª persona), `intensity`, `direction`, `velocity`, `first_steps`, `channels`, `barriers`, `jtbd_expressed`. Runner serie por perfil (`runMomentumChallenge`), scope `momentum_probe`. Rutas: `/momentum` (lista), `/momentum/new` (la creación va por server action, `app/momentum/new/actions.ts`), `/momentum/[id]`. API: `POST /api/momentum/run` `{ challengeId }`. Tabla `momentum_challenges`. Migración `0016`.

> **Patrón de estado de GEO/Momentum**: el análisis vive entero en la fila (`status` + `results jsonb`), no usa la tabla `runs`. El runner marca `status='running'`, itera en serie y al final escribe `status='done'` con los resultados. Si la función se mata por timeout (sin excepción JS), el `catch` que pone `status='error'` no llega a ejecutarse y la fila queda en `running` (ver auditoría: deadlock sin reset). No hay cap combinacional como en Campañas.

## Telemetría

`gateway_usage` registra cada llamada al Gateway. `/tokens` muestra:
- **Saldo del Gateway** (consulta a `https://ai-gateway.vercel.sh/v1/credits` con `AI_GATEWAY_API_KEY`).
- **Modelos del GEO Tester** (v0.56): selector del modelo por motor (Anthropic / Perplexity / OpenAI) que persiste en `app_settings` y consume el runner GEO.
- **Acumulado interno** (prompt + completion + total + calls).
- **Por modelo**.
- **Por scope**.
- **Por día** (últimos 7 días).

Si la key del Gateway no está visible (modo OIDC implícito en runtime), la consulta de saldo falla con un mensaje accionable pero las llamadas siguen funcionando.

## Seguridad activa

### Anti-SSRF en og:image

`lib/url-safety.ts → assertPublicUrl(url)`:
- Sólo `http://` y `https://`.
- Rechaza `localhost`, `*.localhost`, `*.local`, `*.internal`.
- Si el host es IP literal: valida IPv4 / IPv6 contra rangos privados (loopback, RFC1918, link-local, CGNAT, multicast, metadata cloud `169.254.169.254`, IPv6 ULA `fc00::/7`, link-local `fe80::/10`, multicast `ff00::/8`).
- Si es un hostname: resuelve DNS y revalida **todas** las IPs devueltas (defensa frente a DNS rebinding).

`resolveOgImageDetailed` además:
- Sigue redirects manualmente (`MAX_REDIRECTS=3`) revalidando cada hop.
- `AbortSignal` con timeout `5000ms`.
- Lee body con `readBoundedText` (tope 1.5MB).
- Parsea con regex tolerante (og:image, og:image:url, og:image:secure_url, twitter:image, twitter:image:src, itemprop image, link rel=image_src).

### Higiene de errores

`lib/error-response.ts`: cualquier 500 al cliente devuelve sólo `"Error interno."`. El detalle (stack, cause, mensaje original) queda en `console.error` visible en logs de Vercel. Los 400 (zod) sí pasan el mensaje porque viene del schema del propio body.

Endpoints higienizados: todos los `/api/runs/*`, `/api/chat`, `/api/profiles/[id]`, `/api/trash/[type]/[id]`, `/api/og-image`, `/api/geo/run`, `/api/momentum/run` (estos dos desde v0.32; mantienen una lista blanca de mensajes de negocio propios que sí llegan al cliente con 409). `/api/trash/[type]/[id]` responde 409 con el mensaje seguro de `MigrationPendingError` (solo nombra el archivo de migración) cuando falta `0017_trash_geo_momentum_profiles.sql`. `/api/seed/examples` mantiene detalle porque está tras doble gate (login + seed pass).

### `SEED_PASSWORD` obligatoria en producción

Sin la env, `/api/seed/access` devuelve 503 con `code: seed_password_unset`. La UI lo distingue del 401 (pass incorrecta) y muestra aviso accionable.

## Por qué importa este proyecto

Reduce ciclos de A/B testing de semanas a minutos. Permite **iterar copy y creatividades publicitarias contra cohortes consistentes** sin presupuesto de media. Cada cambio se ve en producción inmediatamente porque el flujo es cambio → bump → deploy → commit → push.
