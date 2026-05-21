# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-05-22 tras v0.4.0 (Test de claridad de 5 segundos).

## Estado actual (v0.4.0 desplegada)

- Producción: https://suaas.flat101.business (login con `michel101`, cookie `auth_suaas`).
- Supabase activado en la org separada del Marketplace de Vercel (proyecto `supabase-erin-mirror`). Migraciones aplicadas: `0001_initial.sql` y `0002_five_second.sql`.
- Vercel AI Gateway con créditos cargados.
- **Chat Talker-Reasoner** funcionando en `/profiles/[id]`. Runs cerrados correctamente (`status='done'`, `finished_at` poblado).
- **Test de claridad de 5 segundos** funcionando end-to-end:
  - `/targets` lista, `/targets/new` (modo URL con resolución de `og:image` server-side o subida de imagen a `data:` URL), `/targets/[id]` (hero + runs previos + multi-select de perfiles + botón "Lanzar test 5s").
  - `/api/runs/five-second` orquesta probe (Opus multimodal) + judge (Sonnet) sobre N perfiles en chunks de 5 en flight, con `maxDuration=300`.
  - `/experiments/five-second/[runId]` muestra summary (mean_clarity, mean_comprehension, n), top 3 barreras agregadas y tabla sortable por perfil (expandible para ver recall + perceived_offer + barreras).
  - Métricas persistidas en `metrics`: `mean_clarity`, `mean_comprehension`, `n`.
- Perfiles sembrados: **Marta Cebrián** y **Joaquín Espinosa** (origen `manual`). Suficiente para validar el contraste, pero conviene ampliar para sprints siguientes.

## v0.5.0 — Simulación de embudo (planteamiento)

Objetivo: pasar del test atómico (una pantalla) a una secuencia (un embudo). Un mismo perfil recorre N pantallas y se mide su recall + esfuerzo paso a paso, detectando dónde se cae.

### Decisiones provisionales (revisar al empezar)

- **Granularidad del embudo**: cada paso es un `target` independiente. El embudo es una lista ordenada de `target_id`s + un nombre. Persistencia: nueva tabla `funnels(id, name, steps jsonb)` donde `steps = [{target_id, label}]`.
- **Modelo conversacional intra-funnel**: el perfil mantiene memoria entre pasos. Pasamos por cada paso el historial previo (recall + perceived_offer del paso anterior) en el `messages` del Reasoner. Decisión abierta: ¿reusamos `runs` con un `step_index` adicional o creamos `funnel_runs` separada? Sugerencia: una sola `runs` con `kind='funnel'` y los detalles por paso en `messages` con `meta.step_index`.
- **Métrica clave**: `friction_curve` = vector `effort` por paso. Y `dropoff_step`: índice del primer paso con `effort > 0.7` o cuando el perfil declara abandono.
- **UI mínima**:
  - `/funnels` lista.
  - `/funnels/new` form con drag-and-drop de targets existentes (orden importa).
  - `/funnels/[id]` detalle con multi-select de perfiles + "Lanzar simulación".
  - `/experiments/funnel/[runId]` con timeline horizontal: una columna por paso, cada columna con thumbnail del target + ResultBar de `effort` + el recall corto.

### Pre-trabajo (no bloquea v0.4.0)

- **Subir uploads a Vercel Blob**: las imágenes en `data:` URLs hinchan la DB y el bundle de las páginas de listado. v0.5.0 es buen momento para introducir `@vercel/blob`, migrar `payload.image_url` a URLs `https://...blob.vercel-storage.com/...` y dejar `data:` sólo como fallback offline.
- **Generación de perfiles desde dataset**: el cuello actual es seguir teniendo sólo 2 perfiles. Antes de v0.5.0 conviene tener 6-10. Considerar `/profiles/generate-batch` con LLM bootstrap desde un brief.

## Decisiones de v0.4.0 a recordar (no romper)

- `targets.kind` se queda como `text` libre (no enum). El discriminator de `payload` es `payload.kind = "5s_test"`.
- `five_second_responses` tiene `unique (run_id, profile_id)`: `upsert` con `onConflict='run_id,profile_id'` para idempotencia ante reintentos.
- El orquestador de `runFiveSecondTest` marca el run como `done` o `error` siempre vía `markRunFinished`. Si el judge falla, dejamos `comprehension_rate=null` pero seguimos el run.
- El judge usa `DEFAULT_MODEL` (Sonnet) con `prompt` simple. Si el coste sube o se quiere consistencia inter-target, probar Opus para judge en próximas iteraciones.
- Sin Tailwind. Patrón `ResultBar` documentado en `SISTEMA-DISENO.md`.

## Comandos de emergencia

```bash
vercel logs https://suaas.flat101.business --follow
vercel promote <deployment-url>
vercel rollback
vercel env ls
vercel env pull
```
