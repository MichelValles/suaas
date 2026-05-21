# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-05-21 tras v0.3.0 + plan detallado de v0.4.0.

## Estado actual (v0.3.0 desplegada)

- Producción: https://usaas.flat101.business (login con `michel101`, cookie `auth_usaas`).
- Arquitectura Talker-Reasoner viva en `/api/chat`:
  - Reasoner (`REASONER_MODEL`, Opus) → `generateObject` con `ReasonerPlanSchema`.
  - Talker (`DEFAULT_MODEL`, Sonnet) → `streamText` con plan inyectado en el system.
  - Protocolo NDJSON: frames `meta` (plan completo) → N×`delta` → `done`.
- `ChatPanel` consume el stream y muestra un `<details>` "Razonamiento" colapsable con estado, intent, tono, esfuerzo, barreras y plan.
- Métrica `effort_ratio` por run en tabla `metrics` (media de `effort` sobre turnos `reasoner`).
- **Sigue bloqueado por Supabase** hasta que provisione y aplique `0001_initial.sql`. Sin DB el chat falla con 5xx (no hay `runs` ni `messages` donde persistir).

## Activar Supabase (prerequisito operativo, sigue pendiente)

1. Vercel dashboard → proyecto `usaas` → Integrations → Marketplace → Supabase → Add.
2. Supabase dashboard → SQL editor → pegar y ejecutar `supabase/migrations/0001_initial.sql`.
3. `vercel --prod --yes` para que las env vars inyectadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) se carguen en runtime.
4. Verificar end-to-end: crear un perfil en `/profiles/new`, abrir `/profiles/[id]`, mandar un mensaje. Debe verse "Razonando…", luego el texto del Talker aparece palabra a palabra, y al final el `<details>` muestra el plan.

---

# v0.4.0 — Test de claridad de 5 segundos (plan detallado)

Objetivo: pasar del chat libre a un primer experimento estructurado de la matriz del MD de conocimiento (sección 4): "Test de claridad de 5 segundos" sobre una URL o screenshot, ejecutable en batch sobre N perfiles, con métricas agregadas por target.

## Decisiones tomadas previamente

- **Fuzzy-match para `comprehension_rate`**: arrancar con **LLM-as-judge** (más simple, sin gestionar embeddings). Si el coste sube, migrar a embeddings + similitud coseno en una migración posterior.
- **Batch sync**: 10-20 perfiles por run es viable en una request síncrona (con `maxDuration: 300` que es el default en Vercel ahora). Si se supera, sacar a Vercel Queues (anotado pero no para v0.4.0).
- **Captura del target**: empezar con **dos modos**: (a) URL pública renderizada como imagen vía `og:image` de la propia URL (rápido pero impreciso) y (b) upload manual de screenshot (controlado pero requiere acción humana). Postponer integración con `screenshotone.com` o similar.

## Esquema

`supabase/migrations/0002_five_second.sql`:

```sql
-- targets: payload de un test 5s
-- {
--   "kind": "5s_test",
--   "main_promise": "string que se espera que el usuario recuerde",
--   "image_url": "https://... (og:image) | data: URL inline",
--   "source_url": "https://landing.example.com (opcional, para referencia)"
-- }
-- No cambios estructurales necesarios: targets.payload ya es jsonb.

-- five_second_responses: respuestas individuales por (run, profile) en un test 5s
create table if not exists five_second_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  recall text not null,
  perceived_offer text not null,
  clarity numeric not null check (clarity >= 0 and clarity <= 1),
  comprehension_rate numeric check (comprehension_rate is null or (comprehension_rate >= 0 and comprehension_rate <= 1)),
  barriers_detected text[] not null default '{}'::text[],
  meta jsonb,
  unique (run_id, profile_id)
);

create index if not exists five_second_responses_run_idx on five_second_responses (run_id);

-- runs.kind ya admite '5s_test' (string libre); sin alteraciones.
```

Nota: si por trazabilidad se quieren ver los prompts y outputs LLM por perfil, se sigue persistiendo en `messages` con `role=reasoner` por cada perfil. `five_second_responses` es la **vista normalizada** para agregaciones.

## Estructura de archivos a crear

```
app/
  targets/
    page.tsx              <- lista de targets, Server. Aviso si Supabase off.
    new/
      page.tsx
      new-form.tsx        <- form con kind=5s_test, main_promise, modo URL | upload
      actions.ts          <- Server Action createTargetAction
    [id]/
      page.tsx            <- detalle del target + lista de runs ejecutados + CTA "Lanzar test 5s"
  experiments/
    five-second/
      [runId]/
        page.tsx          <- vista de resultados agregados de un run
        responses-table.tsx <- Client: tabla con sort por clarity
  api/
    targets/route.ts      <- (opcional) si se quiere POST desde JS además de Server Action
    runs/five-second/route.ts <- POST: kicks off un run sobre N perfiles
                                  (sync iterativo, Node runtime, maxDuration 300)

lib/
  targets.ts              <- TargetInputSchema (zod) + CRUD server-only
  experiments/
    five-second.ts        <- runFiveSecondTest(profile, target) + score(judge)

components/
  result-bar.tsx          <- barra horizontal con valor 0..1 (reutilizable)
```

## Signatures clave

```ts
// lib/targets.ts
export const FiveSecondPayloadSchema = z.object({
  kind: z.literal("5s_test"),
  main_promise: z.string().min(3),
  image_url: z.string().url().or(z.string().startsWith("data:")),
  source_url: z.string().url().optional(),
});
export type FiveSecondPayload = z.infer<typeof FiveSecondPayloadSchema>;

export type Target = {
  id: string;
  created_at: string;
  kind: "5s_test"; // luego "funnel" | "pricing" | "copy"
  name: string;
  payload: FiveSecondPayload;
};

export async function listTargets(): Promise<Target[]>;
export async function getTarget(id: string): Promise<Target | null>;
export async function createTarget(input: {
  name: string;
  payload: FiveSecondPayload;
}): Promise<Target>;

// lib/experiments/five-second.ts
export type FiveSecondResponse = {
  profileId: string;
  recall: string;
  perceived_offer: string;
  clarity: number;
  comprehension_rate: number | null;
  barriers_detected: string[];
};

// 1) Llama al Reasoner del perfil con el target "vista 5s" en multimodal.
//    Schema zod: { recall, perceived_offer, clarity, barriers_detected }.
//    Modelo: REASONER_MODEL (Opus tiene mejor recall que Sonnet aquí).
export async function probeProfile(
  profile: Profile,
  target: Target,
): Promise<Omit<FiveSecondResponse, "profileId" | "comprehension_rate">>;

// 2) Judge: LLM-as-judge que compara main_promise vs recall.
//    Schema zod: { score: 0..1, reasoning: string }.
//    Modelo: DEFAULT_MODEL (Sonnet basta).
export async function judgeComprehension(
  mainPromise: string,
  recall: string,
): Promise<{ score: number; reasoning: string }>;

// 3) Orquestador: itera perfiles, persiste responses, calcula agregado.
export async function runFiveSecondTest(input: {
  targetId: string;
  profileIds: string[];
}): Promise<{ runId: string; summary: { n: number; mean_clarity: number; mean_comprehension: number; top_barriers: string[] } }>;
```

## Flujo del endpoint `/api/runs/five-second`

1. Validar body (`targetId`, `profileIds` con length 1..20).
2. Cargar `target` y `profiles` en paralelo.
3. Crear un `runs` con `kind=5s_test`, `target_id`, `status=running`, `params={ profileIds, model: REASONER_MODEL }`.
4. Para cada perfil **en paralelo con `Promise.all`** (límite 5 en flight con un semaphore tipo `pLimit(5)` para no saturar el Gateway):
   - `probeProfile(profile, target)` → `recall`, `perceived_offer`, `clarity`, `barriers_detected`.
   - `judgeComprehension(target.payload.main_promise, recall)` → `score`.
   - Insertar en `five_second_responses`.
5. Calcular agregados: `mean_clarity`, `mean_comprehension`, `top_barriers` (top 3 por frecuencia).
6. Upsert en `metrics`: claves `mean_clarity`, `mean_comprehension`, `comprehension_p50`.
7. `markRunFinished(runId, "done")`.
8. Devolver JSON con `runId` y `summary`. La UI navega a `/experiments/five-second/[runId]`.

## UI

- **`/targets`**: grid de cards igual que `/profiles`. CTA "Crear target".
- **`/targets/new`**:
  - `name`, `main_promise` (textarea corta), modo radio: `URL` o `Upload`.
  - Si URL: input `source_url`, intentar generar preview con `<img src="...og-image-proxy">` (en v0.4.0, basta con resolver `og:image` server-side en la Server Action y guardar el resultado en `payload.image_url`; si falla, error inline).
  - Si Upload: `<input type="file">`, convertir a `data:` URL client-side, persistir en `payload.image_url`.
- **`/targets/[id]`**:
  - Hero con el screenshot + main_promise.
  - Sección "Runs": tabla compacta con runs previos (fecha, N perfiles, mean_clarity, mean_comprehension).
  - Bloque "Lanzar test": multi-select de perfiles (checkbox grid sobre `listProfiles()`), botón "Lanzar test 5s". POST a `/api/runs/five-second`, navegar a la vista de resultados al recibir el `runId`.
- **`/experiments/five-second/[runId]`**:
  - Hero con el target + `summary`.
  - Tres `StatusCard`-style con `mean_clarity`, `mean_comprehension`, `n`.
  - Tabla `responses-table.tsx` por perfil (sortable por clarity y comprehension_rate), expandible por fila para ver `recall`, `perceived_offer`, `barriers_detected`.
  - Sección "Top barreras" con bar chart simple usando el patrón `ResultBar` de `result-bar.tsx`.

## Prompt del Reasoner para 5s_test

Modelar la simulación como **vista breve y oclusión**:

```
Eres {profile.name}. Acabas de ver la siguiente pantalla durante exactamente
5 segundos antes de que la ocultaran. No la puedes mirar de nuevo. Sé honesto
sobre lo que recuerdas (puede ser poco). No completes lo que no viste.

- recall: qué recuerdas de lo que viste. Máximo 2 frases.
- perceived_offer: qué crees que te ofrece esa pantalla. Máximo 1 frase.
- clarity: 0..1 según lo claro que te quedó (0 = no entendiste nada, 1 = clarísimo).
- barriers_detected: qué te frenó o confundió (vocabulario, exceso de info,
  promesa vaga, falta de prueba social, etc.). Lista corta.
```

Pasar la imagen via `content: [{ type: "image", image: payload.image_url }, ...]` en `generateObject`.

## Verificaciones para considerar v0.4.0 terminada

1. Migración `0002_five_second.sql` aplicada en Supabase.
2. `/targets/new` crea un target con `main_promise = "Préstamo personal sin papeleo"` y una imagen.
3. Lanzar test sobre 3 perfiles. La vista de resultados muestra `recall` y `perceived_offer` con diferencias claras entre perfiles.
4. `metrics` tiene filas `mean_clarity`, `mean_comprehension` para el run.
5. Versión bumpeada a `0.4.0`, deploy en prod, consola del navegador imprime `USAAS · FLAT 101 v0.4.0`.

## Tareas (orden sugerido)

- [ ] Migración `0002_five_second.sql` (sólo `five_second_responses` + índice).
- [ ] `lib/targets.ts` + `lib/experiments/five-second.ts`.
- [ ] `/targets` lista + `/targets/new` con Server Action.
- [ ] `/targets/[id]` con multi-select de perfiles + botón "Lanzar test".
- [ ] `/api/runs/five-second` con orquestador paralelo (límite 5 en flight).
- [ ] `/experiments/five-second/[runId]` con tabla y agregados.
- [ ] `components/result-bar.tsx` (reutilizable para barras 0..1).
- [ ] Docs: añadir patrón `ResultBar` a `SISTEMA-DISENO.md`. Actualizar `PROYECTO.md` con el nuevo árbol. Cerrar `ROADMAP.md` v0.4.0.
- [ ] Bump 0.3.x → 0.4.0, deploy, commit.

## Decisiones abiertas (para revisar al empezar)

- ¿`pLimit` artesanal o `p-limit` como dep? Artesanal con `Promise.all` + chunks de 5 es suficiente, evita dep.
- ¿La imagen va en `payload.image_url` siempre (incluso si es upload)? Sí, simplifica el render. Para uploads usar `data:` URLs hasta que se integre Vercel Blob (futura v0.5.x).
- ¿El judge LLM-as-judge tiene system prompt fijo o se calibra por target? Para v0.4.0 fijo. Calibración por target = ruido innecesario en MVP.

---

## Decisiones de v0.3.0 a recordar (no romper en v0.4.0)

- El Reasoner persiste su `plan` en `messages.meta.plan` (no en `content`). `effort_ratio` se calcula desde ahí.
- El stream NDJSON de `/api/chat` es propio (no AI SDK UI streams). Si en algún momento se migra a `toUIMessageStreamResponse()`, hay que actualizar `chat-panel.tsx` también.
- Sin Tailwind. Cualquier patrón visual nuevo se documenta en `SISTEMA-DISENO.md`.

## Comandos de emergencia

```bash
vercel logs https://usaas.flat101.business --follow
vercel promote <deployment-url>
vercel rollback
vercel env ls
vercel env pull
```
