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
  page.tsx                <- dashboard tras login (placeholder con status cards)
  login/
    page.tsx              <- pantalla de contraseña (Server)
    login-form.tsx        <- formulario HUD oscuro (Client)
  api/
    auth/route.ts         <- POST valida password y setea auth_usaas; DELETE limpia

lib/
  auth.ts                 <- AUTH_COOKIE, AUTH_VALUE, getAccessPassword()
  version.ts              <- APP_VERSION (espejo de package.json)
  supabase.ts             <- getBrowserClient(), getServerClient()
  gateway.ts              <- gateway, DEFAULT_MODEL, REASONER_MODEL
  utils.ts                <- cx() (concatenador de clases)

components/
  console-banner.tsx      <- imprime USAAS + versión en la consola del navegador

public/
  logos/flat101.svg       <- logo de marca

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

## Modelo de datos (planificado)

Pendiente de la primera implementación con Supabase. Esbozo inicial:

| Tabla | Propósito |
|---|---|
| `profiles` | Vignettes grounded: demografía, Big Five, barreras COM-B, backstory. |
| `targets` | URLs / flujos / propuestas de valor a evaluar. |
| `runs` | Una sesión de simulación: perfil + target + parámetros del experimento. |
| `messages` | Trazas Talker-Reasoner por turno (sistema 1 + sistema 2). |
| `metrics` | Resultados agregados por run: ratio de esfuerzo, comprensión, barreras detectadas. |

Ver `ROADMAP.md` para el orden de implementación.

## Por qué importa este proyecto

Reduce ciclos de A/B testing y permite iterar sobre copy/UX en minutos en lugar de semanas. Es producto interno **activo**: cada cambio se ve en producción inmediatamente porque el flujo es cambio → bump → deploy → commit.
