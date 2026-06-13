-- SUAAS · v0.60.0 · Documento de marca privado (no se envía a los modelos)
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- Un documento marcado como sensible se guarda en Cerebro pero queda
-- EXCLUIDO de buildBrandContext: nunca se inyecta en los campos de marca de
-- los módulos ni, por tanto, en ningún prompt que salga al AI Gateway. Es la
-- forma de cero retención que la app puede garantizar: no se envía.

alter table brand_documents add column if not exists sensitive boolean not null default false;

comment on column brand_documents.sensitive is
  'Si true, documento privado: se guarda pero NUNCA se inyecta en prompts (excluido de buildBrandContext), así no viaja al gateway ni a los proveedores.';

insert into suaas_migrations (name) values ('0026_brand_documents_sensitive.sql')
  on conflict (name) do nothing;
