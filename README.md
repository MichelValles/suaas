# USAAS · Synthetic Users as a Service

Plataforma para experimentación predictiva en UX y CRO con agentes sintéticos calibrados. Vive en `usaas.flat101.business`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estricto · Motion · Supabase · Vercel AI Gateway. **Sin Tailwind**: sólo tokens del design system de [sd.michelvalles.com](https://sd.michelvalles.com).

## Comandos

```bash
npm install          # primera vez
npm run dev          # localhost:3000 con Turbopack
npm run build        # build de producción
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

## Acceso

Login con password global (cookie `auth_usaas`). En dev fallback: `michel101`. En prod: `process.env.ACCESS_PASSWORD`.

## Documentación

Empezar por [`docs/README.md`](./docs/README.md).

## Reglas del proyecto

Ver [`CLAUDE.md`](./CLAUDE.md): documentación viva, bump de versión y deploy en cada cambio, sin em-dash, castellano completo.
