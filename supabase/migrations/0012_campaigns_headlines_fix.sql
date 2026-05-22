-- SUAAS · v0.24.2 · Fix idempotente del check de headlines
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Razón: si la migración 0009_campaigns_relax.sql nunca se llegó a aplicar
-- (BDs creadas entre v0.21.0 y v0.22.0), el check original `between 3 and 15`
-- sigue vivo y bloquea cualquier campaña con menos de 3 titulares con el
-- mensaje «new row for relation "campaigns" violates check constraint
-- "campaigns_headlines_check"». Esta migración fuerza el check correcto.

alter table campaigns
  drop constraint if exists campaigns_headlines_check;

alter table campaigns
  add constraint campaigns_headlines_check
  check (array_length(headlines, 1) between 1 and 15);
