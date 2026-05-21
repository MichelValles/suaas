# Proyecto

## Qué es

**USAAS** (Synthetic Users as a Service) es una plataforma interna de Flat 101 para hacer test de usabilidad, copy y embudos con **agentes sintéticos calibrados**. Permite descartar variantes de bajo rendimiento antes de comprometer tráfico real, simular elasticidad de precios y validar heurísticas (Nielsen, Hick) sin coste de reclutamiento.

- **Dominio**: `usaas.flat101.business`.
- **Hosting**: Vercel (proyecto independiente, no comparte deploy con `flat101business`).
- **Acceso**: contraseña global (cookie `auth_usaas`). Comparte mecánica con `adams.flat101.business` y `uoc.flat101.business`.

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
  page.tsx                <- dashboard con status cards + CTA a /profiles
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
  api/
    auth/route.ts         <- POST valida password y setea auth_usaas; DELETE limpia
    chat/route.ts         <- POST: turn humano + Reasoner (object) + Talker (stream NDJSON)

lib/
  auth.ts                 <- AUTH_COOKIE, AUTH_VALUE, getAccessPassword()
  version.ts              <- APP_VERSION (espejo de package.json)
  supabase.ts             <- getBrowserClient(), getServerClient()
  gateway.ts              <- DEFAULT_MODEL, REASONER_MODEL, isGatewayConfigured()
  profiles.ts             <- ProfileInputSchema (zod) + CRUD (server-only)
  runs.ts                 <- Run/Message types + createRun, appendMessage, upsertMetric, ...
  prompts.ts              <- buildSystemPrompt(profile) con negative prompts
  agents.ts               <- ReasonerPlanSchema, reason() (object), talkStream() (text)
  utils.ts                <- cx() (concatenador de clases)

components/
  app-shell.tsx           <- AppShell + PageHeading reutilizables
  console-banner.tsx      <- imprime USAAS + versión en la consola del navegador

public/
  logos/flat101.svg       <- logo de marca

supabase/
  migrations/
    0001_initial.sql      <- profiles, targets, runs, messages, metrics + trigger

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

Login con **password global** (`process.env.ACCESS_PASSWORD`, fallback dev `michel101`) y cookie `auth_usaas` (`httpOnly`, `sameSite=lax`, `secure` en prod, 30 días).

Flujo:
1. Usuario llega a cualquier ruta no pública sin cookie.
2. `proxy.ts` redirige a `/login`.
3. El form envía `{ password }` a `/api/auth`.
4. Si la password es correcta, se setea `auth_usaas=ok`.
5. Redirect a `/`, dashboard accesible.

## Modelo de datos

Migración inicial en `supabase/migrations/0001_initial.sql`. Sin RLS: el acceso es vía `SUPABASE_SERVICE_ROLE_KEY` desde el server, el navegador nunca habla con la base directamente.

| Tabla | Propósito |
|---|---|
| `profiles` | Vignettes grounded: demografía (`jsonb`), Big Five (`jsonb` 0..1), barreras COM-B (`jsonb` con capability/opportunity/motivation), backstory, source. Trigger `updated_at`. |
| `targets` | URLs / copy / screenshots / embudos a evaluar. `kind` + `payload` jsonb. |
| `runs` | Una sesión de simulación: `profile_id`, `target_id`, `kind` (`chat` / `5s_test` / `funnel` / `pricing`), `status`, `params`. |
| `messages` | Trazas por turno. `role`: `human` / `talker` / `reasoner` / `system`. `meta` jsonb con model, tokens, latency. |
| `metrics` | Resultados agregados por run. Pares `key` + `value` numérico. |

Aplicar (una vez): copiar `0001_initial.sql` en el SQL editor del proyecto Supabase y ejecutar. Ver `ROADMAP.md` para evolución.

## Por qué importa este proyecto

Reduce ciclos de A/B testing y permite iterar sobre copy/UX en minutos en lugar de semanas. Es producto interno **activo**: cada cambio se ve en producción inmediatamente porque el flujo es cambio → bump → deploy → commit.
