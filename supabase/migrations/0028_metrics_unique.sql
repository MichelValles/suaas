-- SUAAS · v0.62.0 · Unicidad de métricas por run: upsert atómico
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- upsertMetric hacía delete + insert sin transacción: una carrera entre dos
-- cierres del mismo run podía duplicar o perder una métrica. Se deduplica el
-- histórico (conservando la fila más reciente) y se sustituye el índice plano
-- de 0001 por uno único (run_id, key) para que PostgREST acepte el upsert con
-- on_conflict. Esta migración debe aplicarse ANTES de desplegar el código que
-- usa el upsert.

delete from metrics a
using metrics b
where a.run_id = b.run_id
  and a.key = b.key
  and (a.created_at < b.created_at
       or (a.created_at = b.created_at and a.id < b.id));

drop index if exists metrics_run_key_idx;
create unique index if not exists metrics_run_key_uniq on metrics (run_id, key);

insert into suaas_migrations (name) values ('0028_metrics_unique.sql')
  on conflict (name) do nothing;
