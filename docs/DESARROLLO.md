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
| `SEED_PASSWORD` | Vercel + .env.local | Pass adicional para `/seed-examples`, `/api/seed/examples`, `/profiles/seed` y `/api/profiles/seed`. **Obligatoria en producción** desde v0.20.0; sin ella el seed devuelve 503. En dev cae a `michel101` si falta. |
| `NEXT_PUBLIC_SUPABASE_URL` | Marketplace | Cliente browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Marketplace | Cliente browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Marketplace | Cliente server. |
| `AI_GATEWAY_API_KEY` | Vercel (manual o auto al enlazar AI Gateway) | Llamadas LLM + consulta de saldo en `/tokens`. En Vercel también funciona vía OIDC implícito si la key no está. |
| `SUAAS_DEFAULT_MODEL` | Vercel + .env.local | Talker model. Default `anthropic/claude-sonnet-4-6`. |
| `SUAAS_REASONER_MODEL` | Vercel + .env.local | Reasoner model. Default `anthropic/claude-opus-4-7`. Desde v0.47.2 solo lo usan chat (reasoner), onboard y seed de perfiles; el runner de campañas va entero en `SUAAS_DEFAULT_MODEL`. |
| `SUAAS_DAILY_TOKEN_BUDGET` | Vercel (opcional) | Presupuesto diario de tokens (ventana 24h sobre `gateway_usage`). Sin configurar no hay límite. Desde v0.48.0 el gate (429) cubre todas las rutas que consumen LLM: runs, geo, momentum, chat, onboard, seeds y batch-intent. Ojo: es un freno local; el tope real del gasto es el budget de la API key en el dashboard del AI Gateway (recomendado con refresh period mensual, nunca `none`). |
| `CRON_SECRET` | Vercel | **Necesaria desde v0.62.0** para los crons diarios (`/api/cron/keepalive`, que evita la pausa por inactividad del Supabase Free, y `/api/cron/reaper`, que libera runs zombis). Vercel la envía como `Authorization: Bearer` a cada invocación programada; sin ella los handlers devuelven 401 (fail-closed) y el cron no hace nada. Crear con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y `vercel env add CRON_SECRET production` (pegar el valor). |
| `GRAVITY_PASSWORD` | Vercel (opcional) | Contraseña de «Conceptos pendientes» de `/gravity`, verificada en servidor desde v0.62.0 (antes viajaba en el bundle del cliente). Sin definir cae al valor histórico. |
| `SUAAS_EMBEDDING_MODEL` | Vercel (opcional) | Modelo de embeddings del RAG de Cerebro (v0.63.0). Default `openai/text-embedding-3-small` (1536 dims, 0,02 $/1M tokens vía gateway). |
| `BLOB_READ_WRITE_TOKEN` | Auto al vincular Blob store al proyecto | Subida de uploads a Vercel Blob. Si falta, `lib/blob.ts` hace fallback al `data:` URL. |
| `BLOB_STORE_ID` | Auto al vincular Blob store | Identificador del store enlazado. |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Auto al vincular Blob store | Verificación de webhooks del Blob (no usado por SUAAS hoy). |

### Notas de configuración

- **Server Actions body limit**: por defecto Next 16 lo deja en 1MB. SUAAS lo sube a `10mb` en `next.config.ts` (`experimental.serverActions.bodySizeLimit`) para que los uploads de screenshot (data: URL base64) no salten en `/targets/new` ni en `/funnels/new`. Si subes imágenes > 10MB, conviene migrar al patrón **client upload directo a Vercel Blob** con `handleUpload`.
- **Schema cache de PostgREST**: tras aplicar una migración con `ALTER TABLE`, PostgREST puede tardar en ver las columnas nuevas. Si ves errores tipo `Could not find the 'X' column of 'runs' in the schema cache`, ejecuta en el SQL editor: `NOTIFY pgrst, 'reload schema';`. `lib/runs.ts:createRun` es defensivo y sólo inserta columnas no-null para mitigar el efecto.
- **Migraciones a aplicar en orden** (estado actual, v0.34.x):
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
   12. `0012_campaigns_headlines_fix.sql` (idempotente, parche)
   13. `0013_campaigns_strategy.sql`
   14. `0014_campaigns_display.sql`
   15. `0015_gravity_model.sql`
   16. `0016_momentum.sql`
   17. `0017_trash_geo_momentum_profiles.sql`
   18. `0018_campaigns_descriptions_fix.sql` (idempotente, parche)
   19. `0019_consolidacion.sql` (idempotente: tracking `suaas_migrations`, checks, RLS, columnas de v0.39/v0.40)
   20. `0020_shopping.sql` (idempotente: `campaigns.product`)

   Las 20 constan aplicadas (2026-06-11). Usa `/diag` o `/api/diag` para confirmar que todas las tablas + columnas críticas están verdes y que «Tracking de migraciones» no lista pendientes. El campo `pending_migrations` del JSON de `/api/diag` es el atajo: lista deduplicada de los archivos `.sql` que faltan por aplicar.

- **¿Cómo aplico las migraciones?** El proyecto suaas **no está conectado a Git en Vercel**, así que `supabase db push` automático no aplica. El flujo es manual:
   1. Vercel → Marketplace → Supabase → **Open in Supabase** → SQL editor.
   2. Pegar el contenido del archivo `.sql`.
   3. Ejecutar.
   4. Ejecutar `NOTIFY pgrst, 'reload schema';` para refrescar el cache de PostgREST inmediatamente.
   5. Comprobar en `/diag` que la tabla y columnas nuevas aparecen verdes.

   `POSTGRES_URL_NON_POOLING` está marcada como `sensitive` en Vercel, así que `vercel env pull` devuelve `""`. Esto impide aplicar las migraciones desde el código del agente directamente.

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
- **`/seed-examples` me pide pass y la rechaza** (aplica igual a `/profiles/seed`, comparten el gate `seed_access`): probablemente `SEED_PASSWORD` no está en el entorno (Vercel responde 503 con `code: seed_password_unset`). Configúrala con `vercel env add SEED_PASSWORD production --force --yes --value <pass>` y haz redeploy.
- **`/campaigns` da 500 `TypeError: Cannot read 'length' of undefined`**: faltan migraciones de Campañas. v0.24.1 añadió `normalizeCampaign` defensivo pero conviene aplicar 0010..0014 si no lo has hecho.
- **`new row for relation "campaigns" violates check constraint "campaigns_headlines_check"`**: la migración 0009 (relax headlines a 1..15) no está aplicada. Ejecuta `0012_campaigns_headlines_fix.sql` que es idempotente.
- **`/api/runs/campaign` da error "Combinatorial demasiado grande"**: estás pidiendo más de 200 combinaciones perfil × canal × query. Reduce alguno.
- **Cookie no persiste en local**: navegador con `secure` requiere HTTPS. En dev, la cookie cae a `secure: false` automáticamente (`process.env.NODE_ENV === "production"`).
- **Tailwind se cuela por accidente**: revisa que `globals.css` no tenga `@import "tailwindcss"` ni `@theme inline`. No instalar `tailwindcss` ni `postcss`.
- **Versión en consola no cambia tras deploy**: forzar hard-reload (Ctrl+Shift+R). Si sigue, comprobar que el bump se aplicó en `lib/version.ts` Y `package.json`.
- **Imagen Display no aparece en preview**: el rol de la creatividad no es `landscape_image` o `logo_square`. Cámbialo en el selector de Rol de la creatividad.
