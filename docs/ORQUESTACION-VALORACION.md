# Valoración de orquestación de agentes: ¿n8n? (jul-2026)

> Investigación verificada (código, docs oficiales de Vercel y precios de n8n a julio de 2026) para decidir si SUAAS debe adoptar n8n como orquestador de sus agentes. **Conclusión: no, todavía no.** La combinación correcta hoy es Vercel Cron (ya disponible, gratis en Hobby) para lo periódico y Vercel Workflow DevKit (GA, incluido en Hobby) para la durabilidad de los runners, cuando toque. Documento hermano de [`VERTEX-AI-VALORACION.md`](./VERTEX-AI-VALORACION.md), que llegó a la misma filosofía: mínima dispersión de plataformas.

## 1. El problema real que habría que resolver

Los tres problemas operativos de SUAAS no son de «orquestación visual», son de durabilidad y programación temporal:

| Problema | Estado |
|---|---|
| **B-01/B-03**: GEO y Momentum corren síncronos dentro del POST (`maxDuration 300`); un timeout deja la fila en `running` para siempre (deadlock) | GEO en `lib/geo.ts`, Momentum en `lib/momentum.ts`. Campañas ya lo resolvió a mano: `after()` + pool de 5 + deadline interno 270 s + resume (`lib/experiments/campaign.ts`) |
| **Keep-alive**: el Supabase Free se pausa tras ~1 semana sin actividad de API (incidente del 19-jul-2026: 7 deploys bloqueados y app degradada) | Resuelto con cron diario (v0.62.0) |
| **Monitorización GEO periódica**: «la tendencia es el producto, la foto única es ruido» | Pendiente; encaja como cron diario |

## 2. n8n: qué aporta y qué costaría

**Aporta**: UI visual de flujos, ~500 nodos de integración con SaaS, webhooks, reintentos por nodo, scheduling, log de ejecuciones. Su nicho es el pegamento no-code entre servicios de terceros.

**Costaría**:
- **Cloud**: 24 €/mes (Starter, 2.500 ejecuciones) o 60 €/mes (Pro, 10.000); al superar el cupo los workflows se detienen. **Self-host**: VPS (~5-10 €/mes) + Docker + Postgres + TLS + actualizaciones + backups: un servidor más que mantener.
- **Duplicación de secretos (decisivo)**: para orquestar algo útil necesitaría la service role key de Supabase o la llave del AI Gateway en su credential store: un segundo sistema con llaves maestras, justo cuando la auditoría va en la dirección contraria (RLS, secretos fuera del bundle).
- **La fricción estructural**: la lógica de agentes vive en TypeScript (AI SDK 6 + zod 4 + streaming NDJSON + control de presupuesto + resume). n8n solo podría (a) reimplementarla en nodos (sus nodos AI van sobre LangChain, no el AI SDK; el Code node de Cloud no permite imports npm): duplicación que diverge, descartado; o (b) llamar por HTTP a los endpoints actuales: entonces **solo orquesta, no ejecuta**, el cómputo sigue dentro de la Vercel Function con su `maxDuration 300`, y **no arregla B-01/B-03**. Solo añadiría un cron externo con reintentos, que Vercel Cron da gratis.

**Veredicto**: no como orquestador de los agentes. **Escenario futuro en el que sí**: integraciones no-code con los sistemas del cliente (empujar resultados GEO a su Slack/Sheets/HubSpot, disparar análisis desde un formulario externo). En ese caso n8n sería **consumidor de la API de SUAAS vía webhooks** con una API key de scope limitado, nunca dueño de los runners ni portador de la service role.

## 3. Alternativas nativas (verificadas)

| Opción | Estado | ¿Resuelve B-01/B-03? | Coste |
|---|---|---|---|
| **Vercel Cron Jobs** | Disponible ya. Hobby: hasta 100 crons/proyecto, frecuencia máx. diaria, precisión ±59 min, auth automática con `CRON_SECRET` | Paliativo: un reaper diario libera los locks zombis | 0 € |
| **Vercel Workflow DevKit** | GA desde abril de 2026, npm `workflow`, directivas `'use workflow'`/`'use step'`. Incluido en Hobby: 50.000 eventos/mes, duración de run ilimitada | **Sí, de raíz**: retry por step, el run sobrevive a deploys y crashes, sin acoplarse a `maxDuration`. Mantiene TODO el TypeScript intacto (lo que n8n no puede) | 0 € al volumen actual (~70 runs de campaña/mes cabrían gratis) |
| Vercel Queues | Beta pública, sustrato de Workflows | Obligaría a reimplementar el patrón run/step a mano | ~0 € |
| Supabase pg_cron + Edge Functions | Free | No (Deno: duplicaría la lógica). Y como keep-alive se apagaría a sí mismo: pg_cron corre dentro de la base, no genera actividad de API y un proyecto pausado no lo ejecuta | 0 € |
| Inngest / Trigger.dev | Maduros | Sí, pero duplican lo que Workflows da nativo, con un tercero más | Free tier |

## 4. Hoja de ruta adoptada

1. **Hecho (v0.62.0)**: cron de keep-alive de Supabase (`/api/cron/keepalive`, diario) y reaper anti-zombi (`/api/cron/reaper`, diario) que libera los deadlocks B-01/B-03 marcando `error` los `running` de más de 1 hora (los runs de campaña quedan reanudables: `prepareCampaignResume` acepta zombis). Prerrequisito aplicado: GEO y Momentum fijan `updated_at` al pasar a `running`.
2. **Pendiente (cron diario)**: monitor GEO periódico: re-lanzar un análisis marcado para seguimiento (lista de ids en `app_settings.geo_monitor_ids`) una vez al día.
3. **Siguiente iteración de robustez**: migrar los tres runners a Workflow DevKit (un step por combinación/segmento-motor/perfil, retry automático, sin deadline interno). Antes de tocarlo: verificar compatibilidad del paquete `workflow` con Next 16.2.6 en `node_modules/next/dist/docs/` y probar en preview.

Reevaluar n8n solo si aparece el caso de uso de integraciones no-code con sistemas del cliente (sección 2).
