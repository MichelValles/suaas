-- SUAAS · esquema v0.5.2 · Runs de embudo
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Un run de embudo recorre un funnel paso a paso con uno o más perfiles.
-- Cada paso genera una respuesta normalizada en `funnel_step_responses`.
-- Si en un paso el perfil decide no continuar (would_continue=false), no se
-- generan filas para los pasos siguientes (el embudo cierra ahí).

-- ============================================================
-- runs.funnel_id: enlazar runs con funnels (opcional, igual que target_id)
-- ============================================================
alter table runs
  add column if not exists funnel_id uuid references funnels(id) on delete set null;

create index if not exists runs_funnel_idx on runs (funnel_id, created_at desc);

-- ============================================================
-- funnel_step_responses: respuesta normalizada por (run, profile, step)
-- ============================================================
create table if not exists funnel_step_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  step_id uuid not null references funnel_steps(id) on delete cascade,
  position integer not null,
  perception text not null,
  intent_match numeric not null check (intent_match >= 0 and intent_match <= 1),
  effort numeric not null check (effort >= 0 and effort <= 1),
  friction text[] not null default '{}'::text[],
  would_continue boolean not null,
  reasoning text,
  meta jsonb,
  unique (run_id, profile_id, step_id)
);

comment on column funnel_step_responses.perception is 'qué cree el perfil que está viendo, en su voz';
comment on column funnel_step_responses.intent_match is '0..1 claridad de qué tiene que hacer ahora';
comment on column funnel_step_responses.effort is '0..1 esfuerzo percibido para avanzar';
comment on column funnel_step_responses.friction is 'fricciones concretas que cita el perfil';
comment on column funnel_step_responses.would_continue is 'si el perfil seguiría al paso siguiente';
comment on column funnel_step_responses.reasoning is 'justificación interna del Reasoner (debug)';

create index if not exists funnel_step_responses_run_idx
  on funnel_step_responses (run_id);

create index if not exists funnel_step_responses_run_position_idx
  on funnel_step_responses (run_id, position);
