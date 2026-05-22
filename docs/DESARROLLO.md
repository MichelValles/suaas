# Desarrollo

## Setup local

```bash
cd C:\Users\Míchel\suaas
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
| `SEED_PASSWORD` | Vercel + .env.local | Pass adicional para `/seed-examples` y `/api/seed/examples`. **Obligatoria en producción** desde v0.20.0; sin ella el seed devuelve 503. En dev cae a `michel101` si falta. |
| `NEXT_PUBLIC_SUPABASE_URL` | Marketplace | Cliente browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Marketplace | Cliente browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Marketplace | Cliente server. |
| `AI_GATEWAY_API_KEY` | Vercel (manual o auto al enlazar AI Gateway) | Llamadas LLM + consulta de saldo en `/tokens`. En Vercel también funciona vía OIDC implícito si la key no está. |
| `SUAAS_DEFAULT_MODEL` | Vercel + .env.local | Talker model. Default `anthropic/claude-sonnet-4-6`. |
| `SUAAS_REASONER_MODEL` | Vercel + .env.local | Reasoner model. Default `anthropic/claude-opus-4-7`. |
| `BLOB_READ_WRITE_TOKEN` | Auto al vincular Blob store al proyecto | Subida de uploads a Vercel Blob. Si falta, `lib/blob.ts` hace fallback al `data:` URL. |
| `BLOB_STORE_ID` | Auto al vincular Blob store | Identificador del store enlazado. |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Auto al vincular Blob store | Verificación de webhooks del Blob (no usado por SUAAS hoy). |

### Notas de configuración

- **Server Actions body limit**: por defecto Next 16 lo deja en 1MB. SUAAS lo sube a `10mb` en `next.config.ts` (`experimental.serverActions.bodySizeLimit`) para que los uploads de screenshot (data: URL base64) no salten en `/targets/new` ni en `/funnels/new`. Si subes imágenes > 10MB, conviene migrar al patrón **client upload directo a Vercel Blob** con `handleUpload`.
- **Schema cache de PostgREST**: tras aplicar una migración con `ALTER TABLE`, PostgREST puede tardar en ver las columnas nuevas. Si ves errores tipo `Could not find the 'X' column of 'runs' in the schema cache`, ejecuta en el SQL editor: `NOTIFY pgrst, 'reload schema';`. `lib/runs.ts:createRun` es defensivo y sólo inserta columnas no-null para mitigar el efecto.
- **Migraciones a aplicar en orden**: `0001_initial` → `0002_five_second` → `0003_funnels` → `0004_funnel_runs` → `0005_gateway_usage` → `0006_ab_copy_pricing` → `0007_trash`. Usa `/diag` o `/api/diag` para confirmar que todas las tablas + columnas críticas de `runs` están verdes.

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
5. Verificar versión en la consola del navegador (`SUAAS · FLAT 101 vX.Y.Z · suaas.flat101.business`).
6. `git add . && git commit -m "feat|fix|...: ..."` y `git push` si hay remote.

## Subdominio

`suaas.flat101.business` no comparte deploy con `flat101business` (que aloja `adams` y `uoc`). El DNS `*.flat101.business` apunta por defecto al proyecto `flat101business`, así que para `suaas` hay que **registrar el dominio específicamente en el proyecto SUAAS de Vercel**, que tiene prioridad sobre el wildcard.

Pasos (una vez):

```bash
# desde C:\Users\Míchel\suaas
vercel link                          # crear nuevo proyecto "suaas"
vercel domains add suaas.flat101.business
```

Si el wildcard ya está en `flat101business`, Vercel reasigna automáticamente al añadir el host exacto al proyecto SUAAS (regla "longest match wins").

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
