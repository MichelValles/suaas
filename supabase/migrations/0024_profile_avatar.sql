-- SUAAS · v0.57.0 · Retrato fotorrealista del perfil calibrado
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.

alter table profiles add column if not exists avatar_url text;

comment on column profiles.avatar_url is
  'URL pública (Vercel Blob) del retrato generado por IA del perfil. Null si no se ha generado. El prompt de imagen no incluye el nombre: solo características demográficas y tono emocional.';

insert into suaas_migrations (name) values ('0024_profile_avatar.sql')
  on conflict (name) do nothing;
