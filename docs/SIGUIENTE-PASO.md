# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-05-21 tras v0.3.0.

## Estado actual (v0.3.0 desplegada)

- Producción: https://usaas.flat101.business (login con `michel101`, cookie `auth_usaas`).
- Arquitectura Talker-Reasoner viva en `/api/chat`:
  - Reasoner (`REASONER_MODEL`, Opus) → `generateObject` con `ReasonerPlanSchema`.
  - Talker (`DEFAULT_MODEL`, Sonnet) → `streamText` con plan inyectado en el system.
  - Protocolo NDJSON: frames `meta` (plan completo) → N×`delta` → `done`.
- `ChatPanel` consume el stream y muestra un `<details>` "Razonamiento" colapsable con estado, intent, tono, esfuerzo, barreras y plan.
- Métrica `effort_ratio` por run en tabla `metrics` (media de `effort` sobre turnos `reasoner`).
- **Sigue bloqueado por Supabase** hasta que provisione y aplique `0001_initial.sql`. Sin DB el chat falla con 5xx (no hay `runs` ni `messages` donde persistir).

## Activar Supabase (sigue siendo el único prerequisito operativo)

1. Vercel dashboard → proyecto `usaas` → Integrations → Marketplace → Supabase → Add.
2. Supabase dashboard → SQL editor → pegar y ejecutar `supabase/migrations/0001_initial.sql`.
3. `vercel --prod --yes` para que las env vars inyectadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) se carguen en runtime.
4. Verificar end-to-end: crear un perfil en `/profiles/new`, abrir `/profiles/[id]`, mandar un mensaje. Debe verse "Razonando…", luego el texto del Talker aparece palabra a palabra, y al final el `<details>` muestra el plan.

## Próximo hito: v0.4.0 — Test de claridad de 5 segundos

Objetivo: pasar del chat libre a un primer experimento estructurado del cuadro de aplicaciones (sección 4 del MD de conocimiento): "Test de claridad de 5 segundos" sobre una URL o screenshot.

### Diseño

1. **Targets**: añadir UI para crear `targets` con `kind = "5s_test"` y `payload = { url | imageDataUrl, mainPromise: string }`.
2. **Run de tipo 5s_test**:
   - Mostrar el target al perfil "como si lo viera 5 segundos" (en prompt: "miras esta pantalla 5 segundos y la ocultan").
   - Reasoner devuelve: qué entendió, qué creyó que ofrece, nivel de claridad (0..1), recall de la promesa principal.
   - Talker no interviene (es test, no diálogo).
3. **Métrica**: `comprehension_rate` por run = fuzzy-match entre `mainPromise` y `recall` (LLM-as-judge o similitud por embeddings).
4. **Vista de resultados**: agregada por target, con N perfiles, media de comprensión, distribución de barreras detectadas.

### Tareas

- [ ] Esquema: añadir migración `0002_5s_test.sql` si hace falta extender `targets.payload` o crear índices nuevos.
- [ ] `/targets` (lista) + `/targets/new` (form con URL o upload).
- [ ] `lib/experiments/five-second.ts` con `runFiveSecondTest(profile, target)`.
- [ ] Endpoint `/api/runs/5s_test` que itera N perfiles y devuelve el resumen.
- [ ] Vista de resultados con tabla y barras de `comprehension_rate`.

### Decisiones abiertas

- **Embeddings vs LLM-as-judge** para fuzzy-match: empezar con LLM-as-judge (más simple) y migrar si el coste sube.
- **Batch sync vs en background**: para 10-20 perfiles el sync es viable; >50 ya necesita Vercel Queues.
- **Captura del target**: ¿URL pública que renderizamos con `og:image` o `screenshotone.com`? ¿O preferir upload manual de screenshot para no depender de un tercero?

## Decisiones de v0.3.0 a recordar

- El Reasoner persiste su `plan` en `messages.meta.plan` (no en `content`). El `content` del turno reasoner es el resumen "plan" textual.
- `effort_ratio` se calcula desde `messages.meta.plan.effort`, no desde un campo dedicado. Si cambia el esquema del plan, actualizar `listEffortValues` en `lib/runs.ts`.
- El stream NDJSON es propio (no AI SDK UI streams). Cada frame es JSON + `\n`. Si en v0.4.0 se adopta `useChat`, hay que cambiar el endpoint a `toUIMessageStreamResponse()`.

## Comandos de emergencia

```bash
vercel logs https://usaas.flat101.business --follow
vercel promote <deployment-url>
vercel rollback
vercel env ls
vercel env pull
```
