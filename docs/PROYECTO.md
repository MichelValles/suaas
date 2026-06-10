# Proyecto

> **Estado de este documento**: refleja el código a fecha de `v0.30.4` (2026-06). Si tocas estructura, schema o flujos, actualízalo en la misma sesión (regla `CLAUDE.md`).

## Qué es

**SUAAS** (Synthetic Users as a Service) es una plataforma interna de Flat 101 para hacer test de **UX, CRO y publicidad** con **agentes sintéticos calibrados**. Permite descartar variantes de bajo rendimiento antes de comprometer tráfico real, simular elasticidad de precios, validar copy bajo intenciones de búsqueda específicas y comparar creatividades publicitarias sin coste de reclutamiento.

- **Dominio**: `suaas.flat101.business`.
- **Hosting**: Vercel (proyecto independiente, no comparte deploy con `flat101business`).
- **Acceso**: contraseña global (cookie `auth_suaas`). Las funciones operativas más sensibles (sembrar ejemplos) tienen un **segundo gate** con cookie `seed_access` y env `SEED_PASSWORD`.

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
    page.tsx                            Estado visual del esquema (audita tablas + columnas críticas de runs)
  tokens/
    page.tsx                            Créditos del AI Gateway + acumulado interno por modelo/scope + serie 7d
  trash/
    page.tsx                            Papelera: lista soft-deleted con acciones restore / hard delete
    trash-row.tsx                       Client: cada fila con sus botones de acción
  seed-examples/
    page.tsx                            Sembrar ejemplos en los 6 módulos (server + gate)
    seed-gate.tsx                       Client: formulario de pass adicional (SEED_PASSWORD)
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
      page.tsx                          /profiles/seed (genera N perfiles con LLM)
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
      new-form.tsx                      Form con sub-pestañas Canal (Google único activo) y Estrategia (Search · Display activos · 5 en construcción). Preview en vivo del SERP o del banner Display
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
    diag/route.ts                       GET estado del esquema + columnas críticas
    chat/route.ts                       POST chat con perfil: Reasoner + Talker streaming NDJSON
    profiles/
      [id]/route.ts                     DELETE perfil
      seed/route.ts                     POST stream NDJSON de generación de N perfiles
    trash/[type]/[id]/route.ts          POST a papelera, DELETE definitivo, PATCH restaurar
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
  supabase.ts                           getServerClient (singleton service role), isMissingTableError, isMissingColumnError
  gateway.ts                            DEFAULT_MODEL, REASONER_MODEL, isGatewayConfigured (true en Vercel via OIDC)
  blob.ts                               uploadDataUrlToBlob (acepta image|video|audio data:URL)
  utils.ts                              cx() helper

  profiles.ts                           ProfileInputSchema + CRUD (create / update / get / list / listByIds / delete)
  profile-form.ts                       ProfileFormSchema + parseProfileForm (reusado por new y edit)
  profile-filters.ts                    ProfileFilters (rangos + texto contiene) + filterProfiles
  csv.ts                                parseCSV, stringifyCSV, detectSeparator (RFC 4180 simplificado)
  profile-csv.ts                        PROFILE_CSV_HEADERS, profileToCsvRow, validateCsvRow
  seed-profiles.ts                      PROFILE_SEEDS (50 curados) + streamSeededProfiles (Reasoner via generateObject)
  seed-examples.ts                      seedFiveSecondExample, seedCopyExample, seedPricingExample, seedAbExample, seedFunnelExample, seedCampaignExample + pickRandomProfileIds

  runs.ts                               Run/Message types, RunKind union, createRun (defensivo si schema cache stale), markRunFinished, nextTurn, appendMessage, upsertMetric, listMessages, listEffortValues, getRunsStatsByEntity, listRunsBy*
  prompts.ts                            buildSystemPrompt(profile) con negative prompts y voice anchors
  agents.ts                             ReasonerPlanSchema, reason() (generateObject Opus), talkStream() (streamText Sonnet)
  image-source.ts                       resolveImageForApi (descarga + valida mime + base64 para Anthropic multimodal)
  usage.ts                              UsageScope (incluye campaign_probe, campaign_landing, campaign_ideal), recordUsage, getUsageSummary, getGatewayCredits

  targets.ts                            TargetInputSchema + CRUD + resolveOgImageDetailed (con anti-SSRF, 5s timeout, max-redirects=3, body 1.5MB)
  funnels.ts                            FunnelInputSchema + CRUD
  ab.ts                                 AbTestInputSchema + CRUD + linkAbTestRun
  copy.ts                               CopyDeckInputSchema + CRUD
  pricing.ts                            PricingOfferInputSchema + CRUD
  campaigns.ts                          CHANNEL_VALUES, STRATEGY_VALUES, CREATIVE_ROLE_VALUES, CTA_VALUES, CampaignInputSchema con superRefine por strategy + CRUD + normalizeCampaign (defensivo)
  trash.ts                              TRASH_TYPES (incluye campaign), sendToTrash/restoreFromTrash/hardDelete despachan por tipo

  experiments/
    five-second.ts                      probeProfile + judgeComprehension + runFiveSecondTest + listFiveSecondResponses
    funnel.ts                           probeFunnelStep + runFunnelTest + listFunnelStepResponses
    ab.ts                               runAbTest (dos 5s en paralelo, link a ab_test_runs)
    copy.ts                             reactToBlock + runCopyTest + listCopyResponses
    pricing.ts                          reactToPrice + runPricingTest + listPricingResponses
    campaign.ts                         probeCampaignSnippet (renderiza SERP search o banner display) + judgeLandingMatch + proposeIdealVersion + runCampaignTest + summary con byQuery y byChannel + cap combinacional 200

components/
  app-shell.tsx                         AppShell (sidebar + main + footer badges) + PageHeading (variants inline|panel)
  sidebar.tsx                           Sidebar lateral (240px desktop, drawer móvil) con grupos Producto / Sistema
  console-banner.tsx                    Imprime "SUAAS · FLAT 101 vX.Y.Z" en la consola del navegador
  info-tooltip.tsx                      Tooltip CSS-only (hover/focus)
  result-bar.tsx                        Barra de progreso 0..1 con label + porcentaje + hint
  migration-needed.tsx                  Aviso estándar "aplica esta migración" cuando isMissingTableError
  profile-form.tsx                      ProfileForm compartido new + edit (Big Five con step 0.01, COM-B, géneros, etc.)
  profile-explorer.tsx                  Grid / tabla con filtros, sort, paginación 30, sel + acciones (manage|picker|standalone)
  profile-launch-panel.tsx              CTA colapsable + ProfileExplorer picker + POST endpoint + redirect a resultados
  entity-card.tsx                       Tarjeta unificada (fecha + kind + stats[]) para los 6 listados
  entity-list.tsx                       EntityListView (búsqueda + sort + paginación) sobre EntityCard
  runs-previous.tsx                     RunsPreviousGrid con tarjetas de runs previos + métricas configurable
  trash-button.tsx                      SendToTrashButton (icono en cada card) → POST /api/trash/[type]/[id]
  channel-icon.tsx                      SVGs monocromos para google · meta · linkedin · tiktok · x (Channel)
  strategy-icon.tsx                     Iconos lucide para las 7 strategies (search · display · pmax · demand_gen · video · app · shopping)

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
    0007_trash.sql                      deleted_at en las 5 entidades originales
    0008_campaigns.sql                  campaigns (RSA) + campaign_responses + runs.campaign_id
    0009_campaigns_relax.sql            headlines check 1..15 (antes 3..15)
    0010_campaigns_channel.sql          campaigns.channel (single)
    0011_campaigns_multichannel.sql     channel → channels text[] (1..5) + backfill + campaign_responses.channel + nuevo unique (run, profile, query, channel)
    0012_campaigns_headlines_fix.sql    Idempotente: asegura headlines 1..15 si 0009 nunca se aplicó
    0013_campaigns_strategy.sql         campaigns.strategy (search por defecto, check sobre los 7 valores)
    0014_campaigns_display.sql          campaigns.company_name, long_headline, cta (campos de Display Ads)

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

Cookie `seed_access=ok` (`httpOnly`, 8h). Verificada en server-side por la `page.tsx` y el endpoint. Si falta, la page muestra `<SeedGate>` (formulario de password) y el endpoint responde 401 / 503 según el caso.

`SEED_PASSWORD` env. En producción es obligatoria (sin ella, 503 con `code: seed_password_unset`). En dev cae a `michel101` si falta.

## Modelo de datos

Sin RLS. Acceso vía `SUPABASE_SERVICE_ROLE_KEY` desde server (`lib/supabase.ts → getServerClient`). El navegador nunca habla con la base.

### Tablas

| Tabla | Propósito | Notas |
|---|---|---|
| `profiles` | Vignettes grounded: `demographics` jsonb (edad/género/ocupación/ingresos/geo), `big_five` jsonb (O/C/E/A/N 0..1), `com_b_barriers` jsonb (capability/opportunity/motivation arrays), `backstory` text, `source`, `intent_context` text (JTBD, v0.29, se inyecta en todos los system prompts del perfil). | Trigger `updated_at`. |
| `targets` | Pantalla evaluable. `kind` + `payload` jsonb (kind `5s_test` con `main_promise`, `image_url`, `source_url?`). | `deleted_at` desde 0007. |
| `runs` | Sesión de simulación. `profile_id` (owner del run), `kind`, `status`, `params jsonb`, `created_at`, `finished_at`. FKs nullable: `target_id`, `funnel_id`, `ab_test_id`, `copy_deck_id`, `pricing_offer_id`, `campaign_id`. |
| `messages` | Trazas por turno. `role`: `human | talker | reasoner | system`. `meta jsonb` con `model`, `tokens`, `latency`, `plan` (para reasoner). |
| `metrics` | Resultados agregados por run: pares `(key, value, unit)`. |
| `five_second_responses` | `(run_id, profile_id)` único. `recall`, `perceived_offer`, `clarity`, `comprehension_rate`, `barriers_detected text[]`, `behavior_class` (`optima`/`fuga`/`repesca`, v0.29, check nullable), `meta jsonb`. |
| `funnels` | `name`, `description`, `deleted_at`. |
| `funnel_steps` | `funnel_id`, `position` (único), `name`, `intent`, `payload jsonb {kind:"url", image_url, source_url?}`. |
| `funnel_step_responses` | `(run_id, profile_id, step_id)` único. `position`, `perception`, `intent_match`, `effort`, `friction text[]`, `would_continue`, `reasoning`, `meta`. Sólo filas para pasos evaluados (dropoff corta). |
| `gateway_usage` | Telemetría por llamada: `scope`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `meta`. Scopes hoy: `probe_5s`, `judge_5s`, `probe_funnel`, `reasoner_chat`, `talker_chat`, `copy_resonance`, `pricing_react`, `campaign_probe`, `campaign_landing`, `campaign_ideal`, `onboard_synthesize`, `geo_probe`, `momentum_probe`. (`seed_profile` no es un scope: `lib/seed-profiles.ts` usa `reasoner_chat` con `meta.kind`. El JTBD de `batch-intent` no registra scope propio.) |
| `ab_tests` | `target_a_id` ≠ `target_b_id` (check). `hypothesis`. `deleted_at`. |
| `ab_test_runs` | Vincula `(ab_test_id, run_id, variant 'A'|'B')`. Unique. |
| `copy_decks` + `copy_blocks` + `copy_responses` | Deck con 2..10 bloques. Reacción `(run, profile, block)` con sentiment/clarity/persuasion/would_click/critique. |
| `pricing_offers` + `pricing_prices` + `pricing_responses` | Oferta + 2..8 precios. Reacción por (run, profile, price) con would_buy/willingness_to_pay/perceived_value/critique. |
| `campaigns` | **Módulo Campañas** (ver sección dedicada). |
| `campaign_responses` | `(run_id, profile_id, query, channel)` único (multichannel). |
| `geo_analyses` | **GEO Tester** (v0.29, Gravity Model). `name`, `brand_name`, `brand_description`, `segments jsonb` (array de SegmentInput: label/jtbd/query), `results jsonb` (array de SegmentResult), `status` (`pending`/`running`/`done`/`error`). Índice `created_at DESC`. Sin tabla de runs: el análisis vive entero en la fila. |
| `momentum_challenges` | **Momentum** (v0.30, Gravity Model). `name`, `trigger_scenario`, `brand_context` (nullable), `profile_ids uuid[]`, `results jsonb` (array de ProfileMomentumResult), `status` (`pending`/`running`/`done`/`error`). Sin índice extra. |

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

Tras cada `ALTER`, ejecutar `NOTIFY pgrst, 'reload schema';` en el SQL editor o esperar a que PostgREST refresque solo (lo hace cada ~10 min). `/diag` y `/api/diag` auditan el estado.

## Módulo Campañas (Paid Ads) — detalle

Es el módulo más complejo. Modela publicidad pagada **simulada en distintas redes y estrategias**. Hoy: **Google Ads · Search RSA** y **Google Ads · Display RDA** funcionales. Las otras 5 estrategias de Google y los 4 canales restantes (Meta / LinkedIn / TikTok / X) están como `Próx.` con su descripción en la UI.

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
queries text[] (1..5)             -- search: keywords. display: intereses opcionales
headlines text[] (1..15)          -- search: 30c. display: 1..5 con 30c
descriptions text[] (1..5)        -- search: 2..4 con 90c. display: 1..5 con 90c
creatives jsonb [{kind, role, url, ...}]
channels text[] (1..5)            -- subset de {google, meta, linkedin, tiktok, x}
strategy text                     -- {search, display, pmax, demand_gen, video, app, shopping}
company_name text                 -- Display: max 25c
long_headline text                -- Display: max 90c
cta text                          -- Display: CTA de un set predefinido
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

`Channel = google | meta | linkedin | tiktok | x`. Hoy sólo `google` es seleccionable en el form. Los demás se muestran como `Próx.` (cada red tendrá sus propios campos y caps).

### Estrategias dentro de Google Ads

`Strategy = search | display | pmax | demand_gen | video | app | shopping`. Implementadas:

- **search** (RSA): URL final + 3..15 titulares (30c) + 2..4 descripciones (90c) + 1..5 queries.
- **display** (RDA): nombre de empresa (25c) + titular largo (90c) + 1..5 titulares cortos (30c) + 1..5 descripciones (90c) + CTA + creatividades obligatorias por rol (landscape 1.91:1, square 1:1, logo_square 1:1).

`isStrategyImplemented(s)` central. Para añadir Performance Max, Demand Gen, Video, App o Shopping basta con:
1. Añadir campos específicos al schema (migración).
2. Extender `CampaignInputSchema.superRefine` con sus reglas.
3. Branch en el form (igual que ya hay search vs display).
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

YouTube extrae `youtube_id` del URL con regex (`extractYouTubeId`) y guarda el thumbnail (`youtubeThumbnail(id)`). El runner usa este thumbnail jpg como multimodal (los modelos no procesan vídeo).

### Runner (`lib/experiments/campaign.ts`)

`runCampaignTest({ campaignId, profileIds })`:

1. Carga campaña y perfiles. Valida: `search` exige queries, `channels` no vacío, `≤20` perfiles.
2. Para estrategias sin queries (Display sin intereses), usa placeholder `"(contexto general)"`.
3. **Cap combinacional**: `profiles × channels × queries ≤ 200`. Si excede, error claro.
4. Crea `runs` con `kind="campaign"`.
5. Itera `profile × channel × query` (en serie por perfil, paralelo entre perfiles en chunks de 4):
   - `probeCampaignSnippet`: Reasoner multimodal. Render del snippet depende de strategy (`renderSearchSnippet`, `renderDisplaySnippet`) y framing por channel. Adjunta creatividades como imágenes (las video sólo si tienen `thumbnail_url`).
   - Si `intent_to_click >= 0.5` (LANDING_THRESHOLD): `judgeLandingMatch` (Reasoner multimodal con landing image).
   - `proposeIdealVersion`: Sonnet, propuesta del perfil con misma estructura RSA + texto libre opcional.
6. Persiste cada respuesta en `campaign_responses` con `onConflict: "run_id,profile_id,query,channel"`.
7. Summary: globales + `byChannel` (si hay >1) + `byQuery` + top barreras.

Telemetría: `gateway_usage` con scopes `campaign_probe`, `campaign_landing`, `campaign_ideal`.

### Defensa frente a migraciones pendientes

`normalizeCampaign(row)` en `lib/campaigns.ts`: si la fila no tiene `channels` (BD pre-0011), lee el `channel` legacy y lo envuelve. Si no tiene `strategy` (pre-0013), cae a `"search"`. Esto evita 500 en `/campaigns` cuando se despliega código nuevo antes de aplicar la migración correspondiente.

`createCampaign` intenta primero el shape moderno; si Postgres responde "columna no existe", hace fallback al shape anterior con `console.warn` accionable.

## Módulos Gravity Model (v0.29-v0.30)

Cuatro funcionalidades que modelan la intención del usuario como un vector (intensidad, dirección, velocidad) en lugar de como demografía estática.

### 1. Contexto JTBD en perfiles (`intent_context`)

Campo libre en `profiles`. Formato recomendado «Cuando [situación], quiero [motivación] para poder [resultado]». `buildSystemPrompt` lo inyecta como bloque «Contexto de intención (JTBD)» en TODAS las llamadas que usan ese perfil (chat, 5s, campaña, momentum, etc.). Editable en el form de perfil. Generable en lote por LLM vía `POST /api/profiles/batch-intent` (procesa los 10 perfiles más recientes; `force` regenera los que ya tienen contexto). Migración `0015`.

### 2. Intent Momentum en el chat

`ReasonerPlanSchema` (en `lib/agents.ts`) incluye un objeto `momentum` con `intensity` (0..1), `direction` (`approaching`/`stable`/`drifting`) y `velocity` (`accelerating`/`steady`/`decelerating`). El Reasoner lo rellena cada turno sin llamada extra. El `ChatPanel` lo pinta como `MomentumIndicator` bajo el razonamiento.

### 3. Clasificación de conducta 5s (`behavior_class`)

`ProbeOutputSchema` (en `lib/experiments/five-second.ts`) añade `behavior_class` (`optima` = comprende y avanza, `fuga` = carga cognitiva alta, abandona, `repesca` = duda pero intención viva). El LLM clasifica su propia conducta durante el probe (sin llamada extra). Se persiste en `five_second_responses` y la página de resultados muestra la distribución. Migración `0015`.

### 4. GEO Tester (Generative Engine Optimization) — `lib/geo.ts`

Simula cómo un buscador IA (Perplexity / Google AI Overview / ChatGPT Search) describe la marca ante cada segmento de intención (JTBD). Por segmento produce `source_engine`, `simulated_response`, `brand_mentioned`, `brand_position`, `visibility_score`, `recommendation_tone`, `key_claims`, `missing_attributes`. Runner serie por segmento (`runGeoAnalysis`), scope `geo_probe`. Rutas: `/geo` (lista), `/geo/new`, `/geo/[id]` (resultados + botón Analizar). API: `POST /api/geo/run` `{ geoId }`. Tabla `geo_analyses`. Migración `0015`.

### 5. Momentum (Intent Momentum ante-touchpoint) — `lib/momentum.ts`

Define **Triggers** (escenarios de activación JTBD) y simula cómo cada perfil los abordaría en su vida real, antes de que ninguna marca entre en su radar. Por perfil: `intent_narrative` (1ª persona), `intensity`, `direction`, `velocity`, `first_steps`, `channels`, `barriers`, `jtbd_expressed`. Runner serie por perfil (`runMomentumChallenge`), scope `momentum_probe`. Rutas: `/momentum` (lista), `/momentum/new`, `/momentum/[id]`. API: `POST /api/momentum` (crear), `POST /api/momentum/run` `{ challengeId }`. Tabla `momentum_challenges`. Migración `0016`.

> **Patrón de estado de GEO/Momentum**: el análisis vive entero en la fila (`status` + `results jsonb`), no usa la tabla `runs`. El runner marca `status='running'`, itera en serie y al final escribe `status='done'` con los resultados. Si la función se mata por timeout (sin excepción JS), el `catch` que pone `status='error'` no llega a ejecutarse y la fila queda en `running` (ver auditoría: deadlock sin reset). No hay cap combinacional como en Campañas.

## Telemetría

`gateway_usage` registra cada llamada al Gateway. `/tokens` muestra:
- **Saldo del Gateway** (consulta a `https://ai-gateway.vercel.sh/v1/credits` con `AI_GATEWAY_API_KEY`).
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

Endpoints higienizados: todos los `/api/runs/*`, `/api/chat`, `/api/profiles/[id]`, `/api/trash/[type]/[id]`, `/api/og-image`. `/api/seed/examples` mantiene detalle porque está tras doble gate (login + seed pass).

### `SEED_PASSWORD` obligatoria en producción

Sin la env, `/api/seed/access` devuelve 503 con `code: seed_password_unset`. La UI lo distingue del 401 (pass incorrecta) y muestra aviso accionable.

## Por qué importa este proyecto

Reduce ciclos de A/B testing de semanas a minutos. Permite **iterar copy y creatividades publicitarias contra cohortes consistentes** sin presupuesto de media. Cada cambio se ve en producción inmediatamente porque el flujo es cambio → bump → deploy → commit → push.
