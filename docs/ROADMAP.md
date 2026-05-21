# Roadmap

Estado vivo. Actualizar en cada hito.

## v0.1.0 — Esqueleto (actual)

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

- [ ] Instalar Supabase desde el Marketplace de Vercel. `vercel env pull`.
- [ ] Esquema inicial: `profiles`, `targets`, `runs`, `messages`, `metrics`.
- [ ] Migraciones SQL en `supabase/migrations/`.
- [ ] CRUD mínimo de `profiles` (formulario para crear vignette grounded).
- [ ] Llamada de prueba al Gateway: prompt + response simple a un perfil.

## v0.3.0 — Talker-Reasoner

- [ ] Arquitectura de dos agentes: razonador (Opus) + hablador (Sonnet).
- [ ] Log de Chain-of-Thought por turno en `messages`.
- [ ] Streaming de la conversación en UI (Server Actions + AI SDK streaming).

## v0.4.0 — Test de claridad de 5 segundos

- [ ] Subir screenshot/URL → exponer N segundos → preguntar al agente.
- [ ] Métrica: tasa de comprensión (fuzzy-match).
- [ ] Vista de resultados agregados por run.

## v0.5.0 — Simulación de embudo

- [ ] Definir un embudo (lista de pantallas).
- [ ] Run con un perfil que recorre el embudo paso a paso.
- [ ] Detección de fricción: ratio de esfuerzo percibido por paso.

## Backlog / decisiones abiertas

- ¿Auth por email (Supabase Auth) además del password global? Cuando se invite a clientes externos.
- ¿Caché de respuestas LLM en Vercel Runtime Cache para abaratar iteración?
- ¿Generación de perfiles desde datasets reales (LifeSnaps, Project Baseline)?
- ¿Vercel Queues para encolar runs largos en background?
