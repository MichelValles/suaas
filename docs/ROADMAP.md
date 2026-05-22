# Roadmap

Estado vivo. Actualizar en cada hito.

## v0.1.0 — Esqueleto

- [x] Repo git inicializado en `C:\Users\Míchel\suaas`.
- [x] Next.js 16 App Router, sin Tailwind.
- [x] Tokens del DS de sd.michelvalles.com en `globals.css`.
- [x] Login HUD (réplica del estilo adams/uoc) con cookie `auth_suaas`.
- [x] `proxy.ts` que protege todo lo no público.
- [x] Stubs de `lib/supabase.ts` y `lib/gateway.ts`.
- [x] Dashboard placeholder con status cards (Supabase / AI Gateway / Login).
- [x] Reglas operativas en `CLAUDE.md` (docs vivas + bump + deploy + commit).
- [x] Base de conocimiento (`docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`).

## v0.2.0 — Datos + primer agente

- [x] Esquema inicial en `supabase/migrations/0001_initial.sql`: `profiles`, `targets`, `runs`, `messages`, `metrics`.
- [x] `lib/profiles.ts` con `ProfileInputSchema` (zod) y CRUD vía service role.
- [x] `lib/runs.ts` con `createRun`, `appendMessage`, `listMessages`, `nextTurn`.
- [x] `lib/prompts.ts` con `buildSystemPrompt` (vignette + negative prompts).
- [x] `/profiles` (lista), `/profiles/new` (Server Action), `/profiles/[id]` (detalle con chat).
- [x] `/api/chat` (POST) con `generateText` sobre `DEFAULT_MODEL`. Persiste turnos en `messages`.
- [x] `components/app-shell.tsx` (header con nav + footer con versión).
- [x] **Bloqueante operativo resuelto**: Supabase provisionado desde el Marketplace de Vercel y migraciones aplicadas. La app opera contra base real en producción.

## v0.3.0 — Talker-Reasoner

- [x] `lib/agents.ts` con `reason()` (Opus + `generateObject` + `ReasonerPlanSchema`) y `talkStream()` (Sonnet + `streamText`).
- [x] `/api/chat` reescrito: Reasoner síncrono → persist turno `reasoner` con `meta.plan` → Talker en streaming → persist turno `talker`.
- [x] Protocolo NDJSON: frames `meta`/`delta`/`done`/`error` separados por `\n`.
- [x] `ChatPanel` lee el stream, muestra el texto progresivo y un `<details>` "Razonamiento" colapsable bajo cada turno con tono, esfuerzo, intent, barreras y plan.
- [x] Métrica `effort_ratio` por run, calculada como media de `effort` sobre turnos `reasoner`. Upsert en `metrics`.

## v0.3.x — Fixes post-lanzamiento

- [x] `0.3.1`: typo / bump menor.
- [x] `0.3.2`: `/api/chat` llama a `markRunFinished(runId, "done" | "error")` antes del frame final. Hasta 0.3.1 los runs OK quedaban con `status='running'` y `finished_at=null`.

## v0.4.0 — Test de claridad de 5 segundos

- [x] Migración `0002_five_second.sql`: tabla `five_second_responses` (vista normalizada) + índice por `run_id`. No cambios estructurales en `targets`.
- [x] `lib/targets.ts` (`TargetInputSchema`, `FiveSecondPayloadSchema`, CRUD, `resolveOgImage`).
- [x] `lib/experiments/five-second.ts` con `probeProfile`, `judgeComprehension`, `runFiveSecondTest`.
- [x] UI: `/targets` (lista), `/targets/new` (URL o upload), `/targets/[id]` (hero + runs previos + multi-select de perfiles + "Lanzar test").
- [x] `/api/runs/five-second` con orquestador paralelo (chunks de 5 en flight).
- [x] `/experiments/five-second/[runId]` con tabla sortable por perfil, summary (mean_clarity, mean_comprehension, n), top barreras.
- [x] `components/result-bar.tsx` reutilizable.
- [x] Modelos: Reasoner (Opus) para `probeProfile` (multimodal con imagen), Sonnet para `judgeComprehension`.
- [x] Métricas en `metrics`: `mean_clarity`, `mean_comprehension`, `n` (`comprehension_p50` no aporta sobre `mean_comprehension` con N pequeño, lo dejamos fuera).

Decisiones aplicadas: LLM-as-judge para fuzzy-match (no embeddings), batch sync con límite de 20 perfiles, dos modos de captura (URL → `og:image` server-side o upload a `data:` URL).

## v0.5.0 — Simulación de embudo

- [x] **Definición + persistencia de embudos** (v0.5.0): migración `0003_funnels.sql` (`funnels` + `funnel_steps`), `lib/funnels.ts` con `FunnelInputSchema` / CRUD, `/funnels` (lista), `/funnels/new` (form dinámico, 2..12 pasos, modos URL o upload por paso), `/funnels/[id]` (secuencia ordenada con hero por paso). Nav "Embudos" en el shell.
- [x] **Run con perfil(es) recorriendo el embudo paso a paso** (v0.5.2): migración `0004_funnel_runs.sql` (`runs.funnel_id` + `funnel_step_responses`), `lib/experiments/funnel.ts` con `probeFunnelStep` (Reasoner multimodal con memoria de pasos previos) y `runFunnelTest` (orquestador en chunks de 5), `/api/runs/funnel`, `LaunchPanel` en `/funnels/[id]`, `/experiments/funnel/[runId]` con summary, dropoff por paso, top fricciones agregadas y tabla por perfil con drill-down expandible.
- [x] **Detección de fricción**: cada respuesta de paso captura `effort` 0..1, `intent_match` 0..1 y un array de `friction` textual. Las métricas agregadas (`completion_rate`, `mean_effort`, `mean_intent_match`) y el dropoff por paso permiten ver dónde se rompe el embudo.
- [x] **Almacenamiento de uploads en Vercel Blob** (v0.6.1): `lib/blob.ts` con `uploadDataUrlToBlob` (helper que sube `data:` URLs a Blob con sufijo aleatorio y devuelve la URL pública). Acciones de creación de target y de funnel convierten los uploads en URLs https permanentes en lugar de meter el `data:` URL en jsonb (la base no se llena de blobs base64). Store `suaas-uploads · store_1yLEHreMdAwe3V6D` creado en `iad1`. Si `BLOB_READ_WRITE_TOKEN` no está disponible, hace fallback al `data:` URL para no romper desarrollo local.

## v0.7.0 — A/B tests, Copy resonance, Pricing

Tres módulos nuevos de experimentación en una sola release.

- [x] **A/B tests**: tabla `ab_tests` (target_a_id, target_b_id, hypothesis), tabla puente `ab_test_runs` (variant A|B) + columna `runs.ab_test_id`. Lanzar un A/B dispara DOS runs 5s en paralelo con el mismo set de perfiles vía `runAbTest` (reutiliza `runFiveSecondTest`). Rutas: `/ab` lista, `/ab/new`, `/ab/[id]` detalle + LaunchPanel, `/experiments/ab/[abTestId]` con comparativa lado a lado + ganador.
- [x] **Copy resonance**: tablas `copy_decks` + `copy_blocks` + `copy_responses` + `runs.copy_deck_id`. `lib/experiments/copy.ts` con `reactToBlock` (Sonnet via `generateObject`, sin imagen). Cada perfil reacciona a 2..10 bloques con sentiment, clarity 0..1, persuasion 0..1, would_click y critique. Rutas: `/copy`, `/copy/new`, `/copy/[id]`, `/experiments/copy/[runId]` (bloques ordenados por persuasión + barra de sentimiento + drill-down por perfil).
- [x] **Pricing**: tablas `pricing_offers` + `pricing_prices` (2..8 niveles) + `pricing_responses` + `runs.pricing_offer_id`. `lib/experiments/pricing.ts` con `reactToPrice`. Cada perfil reacciona a cada precio con would_buy, willingness_to_pay 0..1, perceived_value 0..1, critique. Métricas: curva de demanda, sweet_spot por revenue esperado (price × buy_rate). Rutas: `/pricing`, `/pricing/new`, `/pricing/[id]`, `/experiments/pricing/[runId]`.
- [x] Componente reutilizable `components/profile-launch-panel.tsx` para multi-select de perfiles + lanzamiento. Reemplazará progresivamente los LaunchPanel específicos en futuras iteraciones.
- [x] Sidebar con 3 entradas nuevas: A/B tests (`Split`), Copy (`MessageSquareText`), Pricing (`Tag`).
- [x] `/diag` y `/api/diag` añaden las 8 tablas nuevas.
- [x] Telemetría de tokens extendida a `copy_resonance` y `pricing_react` scopes.

Aplicar `0006_ab_copy_pricing.sql` en Supabase antes de crear el primer registro de cualquiera de los tres.

## v0.8.0 — Explorador de perfiles + reutilización de selección

Refactor grande del módulo de perfiles para tratarlo como software (no como lista web).

- [x] **Vista grid/tabla** con toggle por comodidad. La tabla muestra demografía + Big Five compacto; el grid muestra nombre, ocupación, dots O·C·E·A·N y tag de hover. Cambio en `components/profile-explorer.tsx`.
- [x] **Filtros**:
   - Rangos numéricos por edad y por cada rasgo Big Five (0..1).
   - Texto "contiene" multipalabra (AND, normalizado, sin acentos): busca en name, occupation, gender, income_band, geo, barreras COM-B y source. Explícitamente NO incluye backstory.
   - Filtros activos resaltan el botón. Reset disponible.
- [x] **Selección**: checkbox por fila, contador "X sel." en toolbar, "Seleccionar todos los visibles" y limpiar selección.
- [x] **Acciones por fila** (modo manage): ver (`/profiles/[id]`), editar (`/profiles/[id]/edit`) y eliminar (con `confirm` + endpoint `DELETE /api/profiles/[id]`).
- [x] **Backstory en hover**: tarjeta y fila tienen un tooltip absoluto con la backstory completa. No aparece en filtros ni columnas.
- [x] **Validación robusta** en create + edit. `lib/profile-form.ts` con `ProfileFormSchema` reutilizable: edad entero 18-99, Big Five 0..1, género enum, backstory ≥20. Mensajes con etiquetas en castellano.
- [x] **Fix selector género**: `colorScheme: dark` + `background: var(--ink-900)` en options. Antes se veía blanco sobre blanco según el SO/navegador.
- [x] **Página de edición** `/profiles/[id]/edit` que reutiliza `<ProfileForm>` compartido.
- [x] **ProfileLaunchPanel rehecho** sobre `<ProfileExplorer mode="picker">`: ahora todos los sitios donde se selecciona perfil (targets, funnels, copy, pricing, A/B) heredan filtros, vista grid/tabla y hover de backstory.

Aplazadas a futuras subversiones (por alcance):
- ~~v0.8.2~~ → reasignada a la retirada del hover de backstory (ver más abajo).
- v0.8.3: generación automática de 48 perfiles vía LLM.

## v0.8.1 — Importador y exportador CSV de perfiles

- [x] `lib/csv.ts`: parser/serializer CSV isomórfico sin dependencias (RFC 4180 simplificado, soporte `,` y `;`, comillas dobles, BOM, EOL `\n`/`\r\n`).
- [x] `lib/profile-csv.ts`: schema CSV con 16 columnas (`PROFILE_CSV_HEADERS`), `profileToCsvRow` (export) y `validateCsvRow` (import, reutiliza `ProfileFormSchema` para que las reglas sean idénticas al formulario web).
- [x] **Exportar**: botón en la toolbar de `/profiles`. Exporta los **seleccionados** si hay selección o los **visibles** según los filtros aplicados. Descarga client-side, UTF-8 + BOM (Excel lo respeta).
- [x] **Importar**: `/profiles/import` con dropzone, detección automática de separador, parseo cliente, validación fila a fila con preview de estado (verde/rojo) y mensaje específico por fila errónea. Server action `importProfilesAction` inserta sólo las filas válidas; tope de 500 filas por import.
- [x] Columnas desconocidas del CSV se ignoran con aviso, y faltantes generan un error claro en la validación (no se importa la fila).
- [x] Listas COM-B (capability/opportunity/motivation) se serializan con `;` interno para sobrevivir al separador `,` del CSV.

## v0.8.2 — Retirada del hover de backstory

- [x] Quitado el tooltip flotante de backstory en el grid y la tabla (ruido visual). La backstory sigue accesible abriendo el detalle del perfil. Limpieza de `.profile-hover*` en `globals.css`.

## v0.8.3 — Generación de perfiles vía LLM

- [x] `lib/seed-profiles.ts`: 50 seeds curados en castellano (demografía española variada, desde estudiantes a jubilados, urbano/rural, diferentes ocupaciones y barreras COM-B). Schema `SeedOutputSchema` con validación zod estricta. Generación con Reasoner (Opus) via `generateObject`.
- [x] `streamSeededProfiles(n)`: orquestador async generator que produce eventos `started` / `progress` / `error` / `done`. Inserta cada perfil inmediatamente para no perder trabajo si algo falla a mitad.
- [x] `/api/profiles/seed` (POST): endpoint con stream NDJSON. Cuerpo `{ n: 48 }`.
- [x] `/profiles/seed`: UI con selector de N, botón "Generar", barra de progreso y log en vivo (verde por perfil creado, rojo por error con el seed que lo originó).
- [x] Botón "Generar con LLM" añadido a la toolbar de `/profiles` junto a "Importar/Exportar CSV".
- [x] Telemetría: cada generación registra en `gateway_usage` con `scope: reasoner_chat` y meta `kind: seed_profile`.

## v0.6.0 — App shell tipo software

- [x] Sidebar lateral izquierdo (240px en desktop, overlay colapsable en móvil con botón hamburguesa) reemplazando el header con nav. Iconos `lucide-react` por entrada.
- [x] Footer global con badges de estado (Supabase ready / AI Gateway ready) en verde cuando están configurados.
- [x] Home reescrita como presentación del software (feature cards + cómo funciona en 3 pasos), no como dashboard de estado.
- [x] Nueva ruta `/diag`: vista visual del estado del esquema y configuración (mismo dato que `/api/diag` pero renderizado).
- [x] Nueva ruta `/tokens`: créditos del AI Gateway + acumulado interno por modelo y por scope. Soportada por migración `0005_gateway_usage.sql` y `lib/usage.ts`. Llamadas instrumentadas: probe_5s, judge_5s, probe_funnel, reasoner_chat, talker_chat.

## Backlog / decisiones abiertas

- ¿Auth por email (Supabase Auth) además del password global? Cuando se invite a clientes externos.
- ¿Caché de respuestas LLM en Vercel Runtime Cache para abaratar iteración?
- ¿Generación de perfiles desde datasets reales (LifeSnaps, Project Baseline)?
- ¿Vercel Queues para encolar runs largos en background?
