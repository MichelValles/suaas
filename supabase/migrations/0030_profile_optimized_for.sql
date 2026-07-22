-- SUAAS · v0.68.0 · Cliente/marca para el que se ha modelado un perfil.
--
-- null = perfil base del formulario. Alimenta el icono de origen en la rejilla
-- de /profiles (estrellas si está optimizado para un cliente, formulario si no)
-- y el selector del editor y la ficha. Idempotente.
--
-- Tras aplicar:  NOTIFY pgrst, 'reload schema';
alter table profiles add column if not exists optimized_for text;

insert into suaas_migrations (name) values ('0030_profile_optimized_for.sql')
  on conflict (name) do nothing;
