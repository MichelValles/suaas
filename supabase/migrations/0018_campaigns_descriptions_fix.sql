-- SUAAS · v0.32.0 · Fix del check de descriptions + índice de papelera
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Razón 1: el check original de 0008_campaigns.sql exige `between 2 and 4`
-- descripciones, pero el zod de lib/campaigns.ts permite 1..5 (Display puede
-- llevar 1 o 5). Una campaña válida en la app fallaba en el insert con
-- «violates check constraint "campaigns_descriptions_check"».
--
-- Razón 2: campaigns nació con deleted_at inline (0008) pero sin el índice
-- que 0007_trash.sql creó para el resto de tablas con papelera.

alter table campaigns
  drop constraint if exists campaigns_descriptions_check;

alter table campaigns
  add constraint campaigns_descriptions_check
  check (array_length(descriptions, 1) between 1 and 5);

create index if not exists campaigns_deleted_at_idx on campaigns (deleted_at);
