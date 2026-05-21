# Desarrollo

## Setup local

```bash
cd C:\Users\Míchel\usaas
npm install
cp .env.example .env.local        # rellenar vars
npm run dev                       # http://localhost:3000
```

Password de dev (si no defines `ACCESS_PASSWORD`): **`michel101`**.

## Variables de entorno

Ver `.env.example` para el listado completo. Esenciales:

| Var | Dónde | Para qué |
|---|---|---|
| `ACCESS_PASSWORD` | Vercel + .env.local | Login global. |
| `NEXT_PUBLIC_SUPABASE_URL` | Marketplace | Cliente browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Marketplace | Cliente browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Marketplace | Cliente server. |
| `AI_GATEWAY_API_KEY` | Auto en Vercel | Gateway AI. |
| `USAAS_DEFAULT_MODEL` | Vercel + .env.local | Talker model. Default `anthropic/claude-sonnet-4-6`. |
| `USAAS_REASONER_MODEL` | Vercel + .env.local | Reasoner model. Default `anthropic/claude-opus-4-7`. |

Para sincronizar local con Vercel:

```bash
vercel link
vercel env pull .env.local
```

## Deploy

Cada cambio funcional sigue el ciclo de `CLAUDE.md`:

1. Editar.
2. Actualizar `docs/` si aplica.
3. Bump de versión en `lib/version.ts` y `package.json` (mantener sincronizados).
4. `vercel --prod --yes`.
5. Verificar versión en la consola del navegador (`USAAS · FLAT 101 vX.Y.Z · usaas.flat101.business`).
6. `git add . && git commit -m "feat|fix|...: ..."` y `git push` si hay remote.

## Subdominio

`usaas.flat101.business` no comparte deploy con `flat101business` (que aloja `adams` y `uoc`). El DNS `*.flat101.business` apunta por defecto al proyecto `flat101business`, así que para `usaas` hay que **registrar el dominio específicamente en el proyecto USAAS de Vercel**, que tiene prioridad sobre el wildcard.

Pasos (una vez):

```bash
# desde C:\Users\Míchel\usaas
vercel link                          # crear nuevo proyecto "usaas"
vercel domains add usaas.flat101.business
```

Si el wildcard ya está en `flat101business`, Vercel reasigna automáticamente al añadir el host exacto al proyecto USAAS (regla "longest match wins").

## Comandos útiles

```bash
npm run dev          # dev con Turbopack
npm run build        # build de prod
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
vercel dev           # dev con env vars de Vercel inyectadas
vercel env pull      # sync env vars
vercel --prod --yes  # deploy producción
```

## Troubleshooting

- **El login no acepta `michel101`**: verifica que no haya `ACCESS_PASSWORD` definida en `.env.local` o que coincida.
- **Cookie no persiste en local**: navegador con `secure` requiere HTTPS. En dev, la cookie cae a `secure: false` automáticamente (`process.env.NODE_ENV === "production"`).
- **Tailwind se cuela por accidente**: revisa que `globals.css` no tenga `@import "tailwindcss"` ni `@theme inline`. No instalar `tailwindcss` ni `postcss`.
- **Versión en consola no cambia tras deploy**: forzar hard-reload (Ctrl+Shift+R). Si sigue, comprobar que el bump se aplicó en `lib/version.ts` Y `package.json`.
