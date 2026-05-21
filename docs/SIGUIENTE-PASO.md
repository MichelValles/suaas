# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-05-21 tras v0.1.0.

## Estado actual (v0.1.0 desplegada)

- Producción: https://usaas.flat101.business (login con `michel101`, cookie `auth_usaas`).
- Proyecto Vercel: `michelvalles-projects/usaas` (independiente de `flat101business`).
- Repo git local: `C:\Users\Míchel\usaas`, rama `main`, sin remote configurado todavía.
- Stack cableado: Next 16 + React 19 + Motion + Supabase (stub) + Vercel AI Gateway (stub).
- Sin Tailwind: sólo tokens del DS de sd.michelvalles.com en `app/globals.css`.
- Reglas operativas en `CLAUDE.md`. Base de conocimiento en `docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`.

## Por dónde empezar la próxima sesión

1. **Leer en orden**: `docs/README.md` → `docs/PROYECTO.md` → `docs/ROADMAP.md` → este archivo.
2. **Verificar que la app sigue viva**:
   ```bash
   curl -sI https://usaas.flat101.business
   # Esperado: 307 -> /login
   curl -sI https://usaas.flat101.business/login
   # Esperado: 200 OK
   ```
3. **Local**:
   ```bash
   cd C:\Users\Míchel\usaas
   npm install        # si node_modules no está
   vercel env pull    # sincroniza ACCESS_PASSWORD y futuras vars de Supabase/Gateway
   npm run dev        # localhost:3000
   ```

## Próximo hito: v0.2.0 — Datos + primer agente

Objetivo: pasar de "esqueleto" a "puedo crear un perfil sintético y conversar con él".

### 1. Provisionar Supabase

Desde el dashboard de Vercel del proyecto `usaas`:
- Integrations → Marketplace → Supabase → Add.
- Esto autoprovisiona `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en producción.
- `vercel env pull` en local para sincronizar.
- Tras esto, el dashboard de USAAS debería mostrar la status card "Supabase" en `ready` (sustituye `pending`).

### 2. Esquema inicial

Crear `supabase/migrations/0001_initial.sql` con:

```sql
-- profiles: vignettes grounded
create table profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  demographics jsonb not null,         -- edad, género, ocupación, ingresos
  big_five jsonb not null,             -- O, C, E, A, N (0..1)
  com_b_barriers jsonb not null,       -- {capability, opportunity, motivation}
  backstory text not null,
  source text                          -- 'manual' | 'voc' | 'dataset:lifesnaps' | ...
);

-- targets: lo que se evalúa
create table targets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,                  -- 'url' | 'screenshot' | 'copy' | 'funnel'
  name text not null,
  payload jsonb not null               -- url, base64, texto, lista de pasos...
);

-- runs: ejecuciones (perfil + target + parámetros)
create table runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references targets(id) on delete cascade,
  kind text not null,                  -- '5s_test' | 'funnel' | 'pricing' | 'copy_resonance'
  status text not null default 'queued', -- queued | running | done | error
  params jsonb,
  finished_at timestamptz
);

-- messages: trazas Talker-Reasoner por turno
create table messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  turn integer not null,
  role text not null,                  -- 'reasoner' | 'talker' | 'system' | 'human'
  content text not null,
  meta jsonb,                          -- model id, tokens, latency
  created_at timestamptz not null default now()
);

-- metrics: resultados agregados por run
create table metrics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  key text not null,                   -- 'comprehension_rate' | 'effort_ratio' | ...
  value numeric not null,
  unit text,
  created_at timestamptz not null default now()
);

create index on messages (run_id, turn);
create index on metrics (run_id, key);
```

Aplicar con `supabase db push` (si se instala Supabase CLI) o pegarlo en el SQL editor del dashboard.

### 3. CRUD mínimo de `profiles`

- `app/profiles/page.tsx` (server): lista perfiles con `getServerClient()`.
- `app/profiles/new/page.tsx` (server): formulario.
- Server Action para insertar.
- Validación con `zod`.

### 4. Primera llamada al Gateway

`app/api/runs/create/route.ts`:

```ts
import { generateText } from "ai";
import { DEFAULT_MODEL } from "@/lib/gateway";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { profileId, prompt } = await req.json();
  const supa = getServerClient();
  const { data: profile } = await supa.from("profiles").select("*").eq("id", profileId).single();

  const { text } = await generateText({
    model: DEFAULT_MODEL,
    system: buildSystemPrompt(profile),  // usa la vignette
    prompt,
  });

  return Response.json({ text });
}
```

`buildSystemPrompt(profile)`: incluir demografía, Big Five, barreras COM-B, backstory y los **negative prompts** del MD de conocimiento (sección 6 de `CONOCIMIENTO-USUARIOS-SINTETICOS.md`) para evitar agentes "demasiado cooperativos".

### 5. Bump + deploy

`lib/version.ts` y `package.json` → `0.2.0`. Deploy. Commit.

## Decisiones abiertas

- ¿Supabase Auth para usuarios externos o seguimos con password global? (todavía suficiente para MVP interno).
- ¿Vercel Queues para encolar runs largos (Talker-Reasoner puede pasar de 20s)?
- ¿Vercel Runtime Cache para abaratar reusar respuestas del modelo en iteraciones del mismo prompt?
- ¿Git remote? Ahora mismo el repo es sólo local. Si se quiere CI de Vercel por push (en vez de `vercel --prod`), hay que crear repo en GitHub y conectarlo desde el dashboard de Vercel.

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
```
