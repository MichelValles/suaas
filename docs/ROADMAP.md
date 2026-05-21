# Roadmap

Estado vivo. Actualizar en cada hito.

## v0.1.0 — Esqueleto

- [x] Repo git inicializado en `C:\Users\Míchel\usaas`.
- [x] Next.js 16 App Router, sin Tailwind.
- [x] Tokens del DS de sd.michelvalles.com en `globals.css`.
- [x] Login HUD (réplica del estilo adams/uoc) con cookie `auth_usaas`.
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
- [ ] **Bloqueante operativo**: provisionar Supabase desde el Marketplace de Vercel y aplicar `0001_initial.sql` en el SQL editor. Hasta entonces las páginas muestran un aviso y no crashean.

## v0.3.0 — Talker-Reasoner

- [x] `lib/agents.ts` con `reason()` (Opus + `generateObject` + `ReasonerPlanSchema`) y `talkStream()` (Sonnet + `streamText`).
- [x] `/api/chat` reescrito: Reasoner síncrono → persist turno `reasoner` con `meta.plan` → Talker en streaming → persist turno `talker`.
- [x] Protocolo NDJSON: frames `meta`/`delta`/`done`/`error` separados por `\n`.
- [x] `ChatPanel` lee el stream, muestra el texto progresivo y un `<details>` "Razonamiento" colapsable bajo cada turno con tono, esfuerzo, intent, barreras y plan.
- [x] Métrica `effort_ratio` por run, calculada como media de `effort` sobre turnos `reasoner`. Upsert en `metrics`.

## v0.4.0 — Test de claridad de 5 segundos (planificado, plan completo en `SIGUIENTE-PASO.md`)

Resumen:

- [ ] Migración `0002_five_second.sql`: tabla `five_second_responses` (vista normalizada) + índice por `run_id`. No cambios estructurales en `targets`.
- [ ] `lib/targets.ts` (`TargetInputSchema`, `FiveSecondPayloadSchema`, CRUD).
- [ ] `lib/experiments/five-second.ts` con `probeProfile`, `judgeComprehension`, `runFiveSecondTest`.
- [ ] UI: `/targets` (lista), `/targets/new` (URL o upload), `/targets/[id]` (multi-select de perfiles + "Lanzar test").
- [ ] `/api/runs/five-second` con orquestador paralelo (chunks de 5 en flight).
- [ ] `/experiments/five-second/[runId]` con tabla por perfil, `mean_clarity`, `mean_comprehension`, top barreras.
- [ ] `components/result-bar.tsx` reutilizable.
- [ ] Modelos: Reasoner (Opus) para `probeProfile` (multimodal con imagen), Sonnet para `judgeComprehension`.
- [ ] Métricas en `metrics`: `mean_clarity`, `mean_comprehension`, `comprehension_p50`.

Decisiones tomadas: LLM-as-judge para fuzzy-match (no embeddings de momento), batch sync con límite de 20 perfiles, dos modos de captura (URL → `og:image` server-side o upload a `data:` URL). Pendientes en `SIGUIENTE-PASO.md`.

## v0.5.0 — Simulación de embudo

- [ ] Definir un embudo (lista de pantallas).
- [ ] Run con un perfil que recorre el embudo paso a paso.
- [ ] Detección de fricción: ratio de esfuerzo percibido por paso.

## Backlog / decisiones abiertas

- ¿Auth por email (Supabase Auth) además del password global? Cuando se invite a clientes externos.
- ¿Caché de respuestas LLM en Vercel Runtime Cache para abaratar iteración?
- ¿Generación de perfiles desde datasets reales (LifeSnaps, Project Baseline)?
- ¿Vercel Queues para encolar runs largos en background?
