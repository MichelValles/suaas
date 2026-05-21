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
- [ ] Run con un perfil que recorre el embudo paso a paso.
- [ ] Detección de fricción: ratio de esfuerzo percibido por paso.
- [ ] Almacenamiento de uploads en Vercel Blob (sustituir `data:` URLs en `five_second_responses` / `targets.payload`).

## Backlog / decisiones abiertas

- ¿Auth por email (Supabase Auth) además del password global? Cuando se invite a clientes externos.
- ¿Caché de respuestas LLM en Vercel Runtime Cache para abaratar iteración?
- ¿Generación de perfiles desde datasets reales (LifeSnaps, Project Baseline)?
- ¿Vercel Queues para encolar runs largos en background?
