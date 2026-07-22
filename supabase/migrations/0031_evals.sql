-- SUAAS · v0.71.0 · Historial de evaluaciones de calidad de salidas.
--
-- Una fila por (ejecución de eval, modelo objetivo): agregados por dimensión
-- como columnas (para graficar y comparar versiones en el tiempo) + el detalle
-- por caso en jsonb. app_version permite cazar regresiones entre releases.
--
-- RLS activado sin policies: bloquea anon/authenticated; el server entra con la
-- service role (misma posición que app_settings/brands, migración 0027).
-- Tras aplicar:  NOTIFY pgrst, 'reload schema';
create table if not exists evals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  app_version text,
  model text not null,
  judge text not null,
  n_cases int not null default 0,
  role_fidelity real,
  grounding real,
  non_sycophancy real,
  naturalness real,
  overall real,
  cases jsonb not null default '[]'::jsonb
);

create index if not exists evals_created_at_idx on evals (created_at desc);
create index if not exists evals_model_idx on evals (model);

alter table evals enable row level security;

insert into suaas_migrations (name) values ('0031_evals.sql')
  on conflict (name) do nothing;
