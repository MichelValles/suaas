-- SUAAS · esquema v0.5.5 · Telemetría de tokens del AI Gateway
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Cada llamada al gateway (probe_5s, judge_5s, probe_funnel, chat reasoner /
-- talker, etc.) inserta una fila aquí para poder agregar consumo por modelo
-- y por scope.

create table if not exists gateway_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid references runs(id) on delete set null,
  scope text not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  meta jsonb
);

comment on column gateway_usage.scope is 'probe_5s | judge_5s | probe_funnel | reasoner_chat | talker_chat';
comment on column gateway_usage.meta is 'latency_ms y otros campos opcionales';

create index if not exists gateway_usage_created_idx on gateway_usage (created_at desc);
create index if not exists gateway_usage_model_idx on gateway_usage (model);
create index if not exists gateway_usage_scope_idx on gateway_usage (scope);
