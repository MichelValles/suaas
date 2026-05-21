# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-05-21 tras v0.2.0.

## Estado actual (v0.2.0 desplegada)

- Producción: https://usaas.flat101.business (login con `michel101`, cookie `auth_usaas`).
- Esquema SQL en `supabase/migrations/0001_initial.sql`.
- `lib/profiles.ts` (zod + CRUD), `lib/runs.ts`, `lib/prompts.ts` (system prompt grounded con negative prompts).
- UI: `/profiles` lista, `/profiles/new` formulario, `/profiles/[id]` detalle + chat.
- `/api/chat` con `generateText` sobre Vercel AI Gateway, persiste turnos en `messages`.
- **Bloqueante operativo (tú)**: aún falta provisionar Supabase desde el Marketplace de Vercel y aplicar el SQL. Mientras tanto las páginas muestran un aviso, no crashean.

## Activar Supabase (lo que falta para que v0.2.0 sea funcional end-to-end)

1. Ir al dashboard de Vercel → proyecto `usaas` → Integrations → Marketplace → Supabase → Add.
2. Aceptar provisión: autoinyecta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` en producción.
3. Abrir el proyecto Supabase recién provisionado → SQL editor → pegar y ejecutar `supabase/migrations/0001_initial.sql`.
4. Redeploy (`vercel --prod --yes`) para que las nuevas env vars carguen.
5. Verificar: `https://usaas.flat101.business/profiles/new` debe permitir crear un perfil y redirigir a `/profiles/[id]` para chatear.

## Próximo hito: v0.3.0 — Talker-Reasoner

Objetivo: pasar del agente único a la arquitectura cognitiva del MD de conocimiento (sección 3): Reasoner emula Sistema 2 (analítico, lento, Opus), Talker emula Sistema 1 (fluido, rápido, Sonnet).

### Diseño

`/api/chat` se reescribe en dos pasos:

1. **Reasoner** (`REASONER_MODEL`): recibe el system prompt grounded + el mensaje humano + historial. Output estructurado (`generateObject` con schema): estado interno percibido del usuario, plan de respuesta, posibles barreras detectadas. Se persiste como turno `reasoner` con `meta.cot = true`.
2. **Talker** (`DEFAULT_MODEL`): recibe el plan del reasoner + system prompt + historial. Output texto natural en voz del perfil. Se persiste como turno `talker`.

### Tareas

- [ ] `lib/agents.ts` con `reason(profile, history, message)` y `talk(profile, plan, history)`.
- [ ] Schema zod para el plan del Reasoner: `state`, `barriers_detected[]`, `tone`, `intent`, `plan`.
- [ ] Streaming del Talker al cliente con `streamText` (que aparezca palabra a palabra).
- [ ] Vista "Chain of Thought" colapsable en el chat (mostrar el plan del reasoner bajo cada respuesta del talker).
- [ ] Métrica derivada: `effort_ratio` por run, calculada del plan del reasoner.

### Decisiones abiertas

- ¿Cachear el plan del reasoner con Vercel Runtime Cache si la conversación se repite por A/B (mismo perfil + mismo prompt)?
- ¿Encolar runs largos en Vercel Queues (si la conversación se extiende a 20+ turnos)?
- ¿Targets (`targets`) y runs de tipo `5s_test`/`funnel` antes o después del Talker-Reasoner?

## Comandos de emergencia

```bash
# Logs en vivo del deploy más reciente
vercel logs https://usaas.flat101.business --follow

# Promover un deploy de preview a producción
vercel promote <deployment-url>

# Rollback al deploy anterior
vercel rollback

# Ver y editar env vars
vercel env ls
vercel env add <NAME> production
vercel env rm <NAME> production

# Sincronizar env vars al .env.local
vercel env pull
```
