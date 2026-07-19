-- SUAAS · v0.62.0 · RLS en app_settings, brands y brand_documents
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- Eran las únicas 3 tablas de 26 sin Row Level Security: cualquiera con la
-- anon key podía leer o modificar los ajustes globales y los documentos de
-- Cerebro (incluidos los marcados sensitive, cuyo flag solo los excluye de
-- los prompts, no de la API REST). Activar RLS sin policies bloquea anon y
-- authenticated; el servidor no se ve afectado porque usa la service role,
-- que ignora RLS (mismo patrón que el resto de tablas desde 0001).

alter table app_settings enable row level security;
alter table brands enable row level security;
alter table brand_documents enable row level security;

insert into suaas_migrations (name) values ('0027_rls_cerebro_settings.sql')
  on conflict (name) do nothing;
