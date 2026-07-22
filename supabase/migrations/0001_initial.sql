-- SUAAS · esquema inicial v0.2.0
--
-- Aplicar copiando este archivo en el SQL editor del proyecto de Supabase
-- (Marketplace de Vercel -> Supabase -> Open dashboard -> SQL editor).
--
-- Convenciones:
--   - UUIDs por defecto con gen_random_uuid().
--   - jsonb para todo lo "abierto" (demografía, Big Five, COM-B, payload).
--   - timestamps en UTC con default now().
--   - Sin RLS por ahora: el acceso es exclusivamente vía SUPABASE_SERVICE_ROLE_KEY
--     desde el server (lib/supabase.ts -> getServerClient). El navegador nunca
--     habla directamente con la base, todo pasa por /api o Server Actions.

-- ============================================================
-- profiles: vignettes grounded de perfiles calibrados
-- ============================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  demographics jsonb not null,
  big_five jsonb not null,
  com_b_barriers jsonb not null,
  backstory text not null,
  source text
);

comment on column profiles.demographics is 'edad, género, ocupación, ingresos, geo...';
comment on column profiles.big_five is 'O, C, E, A, N en escala 0..1';
comment on column profiles.com_b_barriers is '{capability:[], opportunity:[], motivation:[]}';
comment on column profiles.source is 'manual | voc | dataset:lifesnaps | ...';

create index if not exists profiles_created_at_idx on profiles (created_at desc);

-- ============================================================
-- targets: lo que se evalúa (url, copy, screenshot, embudo)
-- ============================================================
create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  name text not null,
  payload jsonb not null
);

comment on column targets.kind is 'url | screenshot | copy | funnel';

-- ============================================================
-- runs: una sesión de simulación = perfil + target + parámetros
-- ============================================================
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  profile_id uuid not null references profiles(id) on delete cascade,
  target_id uuid references targets(id) on delete set null,
  kind text not null,
  status text not null default 'queued',
  params jsonb
);

comment on column runs.kind is '5s_test | funnel | pricing | copy_resonance | chat';
comment on column runs.status is 'queued | running | done | error';

create index if not exists runs_profile_idx on runs (profile_id, created_at desc);

-- ============================================================
-- messages: trazas Talker-Reasoner por turno
-- ============================================================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  turn integer not null,
  role text not null,
  content text not null,
  meta jsonb
);

comment on column messages.role is 'reasoner | talker | system | human';
comment on column messages.meta is 'model id, tokens, latency_ms, ...';

create index if not exists messages_run_turn_idx on messages (run_id, turn);

-- ============================================================
-- metrics: resultados agregados por run
-- ============================================================
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  key text not null,
  value numeric not null,
  unit text
);

comment on column metrics.key is 'comprehension_rate | effort_ratio | barrier_recall | ...';

create index if not exists metrics_run_key_idx on metrics (run_id, key);

-- ============================================================
-- trigger updated_at en profiles
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
before update on profiles
for each row execute function set_updated_at();
