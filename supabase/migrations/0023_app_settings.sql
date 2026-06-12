-- SUAAS · v0.56.0 · Ajustes globales de la app + GEO Tester con sondas reales
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.

-- 1) Tabla clave/valor para ajustes globales editables desde la UI.
--    Primer uso: 'geo_engine_models' (modelo elegido por motor en /tokens).
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table app_settings is
  'Ajustes globales de SUAAS (clave/valor jsonb). v0.56: geo_engine_models = modelo del gateway por motor del GEO Tester (claude | perplexity | chatgpt).';

-- 2) El GEO Tester deja de simular: cada segmento guarda un array `engines`
--    con la respuesta real de cada motor (Claude, Perplexity, ChatGPT),
--    sus citas y las métricas de visibilidad. Los análisis históricos
--    conservan el shape v1 (simulated_response) y se renderizan como legado.
comment on column geo_analyses.results is
  'Array de SegmentResult. v2 (sondas reales): {label, query, engines: [{engine, model, response, citations, metrics|error}]}. v1 legado: respuesta simulada y métricas planas.';

insert into suaas_migrations (name) values ('0023_app_settings.sql')
  on conflict (name) do nothing;
