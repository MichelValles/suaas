# Proyecto

## Qué es

**SUAAS** (Synthetic Users as a Service) es una plataforma interna de Flat 101 para hacer test de usabilidad, copy y embudos con **agentes sintéticos calibrados**. Permite descartar variantes de bajo rendimiento antes de comprometer tráfico real, simular elasticidad de precios y validar heurísticas (Nielsen, Hick) sin coste de reclutamiento.

- **Dominio**: `suaas.flat101.business`.
- **Hosting**: Vercel (proyecto independiente, no comparte deploy con `flat101business`).
- **Acceso**: contraseña global (cookie `auth_suaas`). Comparte mecánica con `adams.flat101.business` y `uoc.flat101.business`.

## Cliente

- **Construye y opera**: Flat 101 (Míchel Valles).
- **Uso interno**: equipos de UXR/CRO de Flat 101 y, en una segunda fase, clientes externos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| UI | React 19.2.4 |
| Estilos | **CSS plano + tokens del design system** (sd.michelvalles.com). Sin Tailwind. |
| Animación | `motion` 12.x |
| Fuentes | Nunito Sans + DM Serif Text (`next/font/google`) |
| Datos | Supabase (Postgres + Auth + Storage), provisionado desde Marketplace de Vercel |
| LLM | Vercel AI Gateway (multi-proveedor con failover) |
| Lenguaje | TypeScript 5 estricto |
| Lint | ESLint 9 con `eslint-config-next` |
| Deploy | Vercel CLI (`vercel --prod --yes`) |

**Importante**: esta versión de Next.js tiene breaking changes vs. lo que sabe un LLM típico. Antes de tocar APIs de Next.js, leer `node_modules/next/dist/docs/`.

## Estructura de carpetas

```
app/
  layout.tsx              <- html + fuentes + metadata + ConsoleBanner
  globals.css             <- tokens del design system + clases semánticas
  robots.ts               <- noindex global
  icon.svg                <- favicon
  page.tsx                <- home: presentación del software (feature cards + cómo funciona)
  diag/
    page.tsx              <- estado visual del esquema (server-side, mismo dato que /api/diag)
  tokens/
    page.tsx              <- créditos AI Gateway + acumulado interno por modelo/scope
  login/
    page.tsx              <- pantalla de contraseña (Server)
    login-form.tsx        <- formulario HUD oscuro (Client)
  profiles/
    page.tsx              <- lista de perfiles (Server)
    new/
      page.tsx
      new-form.tsx        <- formulario con useActionState
      actions.ts          <- Server Action createProfileAction
    [id]/
      page.tsx            <- detalle: traits + barreras + chat
      chat-panel.tsx      <- Client: ChatPanel
  targets/
    page.tsx              <- lista de targets (Server)
    new/
      page.tsx
      new-form.tsx        <- form 5s_test (modo URL o upload), Client
      actions.ts          <- Server Action createTargetAction (resuelve og:image)
    [id]/
      page.tsx            <- detalle: hero + runs previos + multi-select de perfiles
      launch-panel.tsx    <- Client: lanzar /api/runs/five-second + navega a resultados
  funnels/
    page.tsx              <- lista de embudos (Server)
    new/
      page.tsx
      new-form.tsx        <- form con pasos dinámicos (mín 2, máx 12), Client
      actions.ts          <- Server Action createFunnelAction (resuelve og:image por paso)
    [id]/
      page.tsx            <- detalle: secuencia + runs previos + LaunchPanel
      launch-panel.tsx    <- Client: multi-select de perfiles + lanzar /api/runs/funnel
  experiments/
    five-second/
      [runId]/
        page.tsx          <- summary, top barreras, tabla por perfil (Server)
        responses-table.tsx <- Client: sortable + expandible
    funnel/
      [runId]/
        page.tsx          <- summary, dropoff por paso, top fricciones, tabla por perfil
        responses-table.tsx <- Client: matriz perfil × paso con drill-down expandible
  api/
    auth/route.ts         <- POST valida password y setea auth_suaas; DELETE limpia
    chat/route.ts         <- POST: turn humano + Reasoner (object) + Talker (stream NDJSON)
    diag/route.ts         <- GET: estado de Supabase + count por tabla (debug, protegido por cookie)
    runs/
      five-second/route.ts <- POST: ejecuta runFiveSecondTest sobre N perfiles
      funnel/route.ts     <- POST: ejecuta runFunnelTest (recorrido paso a paso con dropoff)

lib/
  auth.ts                 <- AUTH_COOKIE, AUTH_VALUE, getAccessPassword()
  version.ts              <- APP_VERSION (espejo de package.json)
  supabase.ts             <- getBrowserClient(), getServerClient()
  gateway.ts              <- DEFAULT_MODEL, REASONER_MODEL, isGatewayConfigured()
  profiles.ts             <- ProfileInputSchema (zod) + CRUD (server-only)
  runs.ts                 <- Run/Message types + createRun, appendMessage, upsertMetric, markRunFinished, listRunsByTarget, getMetricsForRun
  prompts.ts              <- buildSystemPrompt(profile) con negative prompts
  agents.ts               <- ReasonerPlanSchema, reason() (object), talkStream() (text)
  targets.ts              <- TargetInputSchema, FiveSecondPayloadSchema + CRUD + resolveOgImage(url)
  funnels.ts              <- FunnelInputSchema, FunnelStepInputSchema + CRUD (server-only)
  usage.ts                <- recordUsage(), getUsageSummary(), getGatewayCredits() (telemetría tokens)
  experiments/
    five-second.ts        <- probeProfile, judgeComprehension, runFiveSecondTest, listFiveSecondResponses, summarizeResponses
    funnel.ts             <- probeFunnelStep, runFunnelTest, listFunnelStepResponses, summarizeFunnelResponses
  utils.ts                <- cx() (concatenador de clases)

components/
  app-shell.tsx           <- AppShell (sidebar + main + footer con badges) + PageHeading
  sidebar.tsx             <- Sidebar (client, lateral izquierdo, colapsable en móvil) con iconos lucide
  console-banner.tsx      <- imprime SUAAS + versión en la consola del navegador
  result-bar.tsx          <- ResultBar (label + valor 0..1 + porcentaje + hint)

public/
  logos/flat101.svg       <- logo de marca

supabase/
  migrations/
    0001_initial.sql      <- profiles, targets, runs, messages, metrics + trigger
    0002_five_second.sql  <- five_second_responses (vista normalizada por (run, profile))
    0003_funnels.sql      <- funnels + funnel_steps (secuencia ordenada de pantallas)
    0004_funnel_runs.sql  <- runs.funnel_id + funnel_step_responses (run, profile, step)
    0005_gateway_usage.sql <- gateway_usage (telemetría de tokens por scope/modelo)

proxy.ts                  <- middleware: bloquea todo lo no público sin cookie
next.config.ts
tsconfig.json
package.json
.env.example
AGENTS.md
CLAUDE.md
docs/
```

## Autenticación

Login con **password global** (`process.env.ACCESS_PASSWORD`, fallback dev `michel101`) y cookie `auth_suaas` (`httpOnly`, `sameSite=lax`, `secure` en prod, 30 días).

Flujo:
1. Usuario llega a cualquier ruta no pública sin cookie.
2. `proxy.ts` redirige a `/login`.
3. El form envía `{ password }` a `/api/auth`.
4. Si la password es correcta, se setea `auth_suaas=ok`.
5. Redirect a `/`, dashboard accesible.

## Modelo de datos

Migración inicial en `supabase/migrations/0001_initial.sql`. Sin RLS: el acceso es vía `SUPABASE_SERVICE_ROLE_KEY` desde el server, el navegador nunca habla con la base directamente.

| Tabla | Propósito |
|---|---|
| `profiles` | Vignettes grounded: demografía (`jsonb`), Big Five (`jsonb` 0..1), barreras COM-B (`jsonb` con capability/opportunity/motivation), backstory, source. Trigger `updated_at`. |
| `targets` | URLs / copy / screenshots / embudos a evaluar. `kind` + `payload` jsonb. |
| `runs` | Una sesión de simulación: `profile_id`, `target_id`, `kind` (`chat` / `5s_test` / `funnel` / `pricing`), `status`, `params`. |
| `messages` | Trazas por turno. `role`: `human` / `talker` / `reasoner` / `system`. `meta` jsonb con model, tokens, latency. |
| `metrics` | Resultados agregados por run. Pares `key` + `value` numérico (p.ej. `mean_clarity`, `mean_comprehension`, `effort_ratio`, `n`). |
| `five_second_responses` | Vista normalizada por `(run_id, profile_id)` para tests de claridad de 5 segundos: `recall`, `perceived_offer`, `clarity`, `comprehension_rate`, `barriers_detected`, `meta`. |
| `funnels` | Cabecera del embudo: `name`, `description`. |
| `funnel_steps` | Pasos ordenados del embudo: `funnel_id`, `position` (único por embudo), `name`, `intent` (qué debería hacer el usuario), `payload` jsonb `{kind, image_url, source_url?}`. |
| `funnel_step_responses` | Respuesta normalizada por `(run_id, profile_id, step_id)`: `position`, `perception`, `intent_match` 0..1, `effort` 0..1, `friction` text[], `would_continue`, `reasoning`, `meta`. Sólo hay fila para los pasos que el perfil llegó a evaluar (el dropoff corta el recorrido). |
| `gateway_usage` | Telemetría por llamada al AI Gateway: `run_id` (nullable), `scope` (`probe_5s` / `judge_5s` / `probe_funnel` / `reasoner_chat` / `talker_chat`), `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `meta`. Alimenta `/tokens`. |

Aplicar las migraciones por orden en el SQL editor del proyecto Supabase (`0001_initial.sql`, `0002_five_second.sql`, `0003_funnels.sql`, `0004_funnel_runs.sql`, `0005_gateway_usage.sql`). Ver `ROADMAP.md` para evolución.

## Por qué importa este proyecto

Reduce ciclos de A/B testing y permite iterar sobre copy/UX en minutos en lugar de semanas. Es producto interno **activo**: cada cambio se ve en producción inmediatamente porque el flujo es cambio → bump → deploy → commit.
