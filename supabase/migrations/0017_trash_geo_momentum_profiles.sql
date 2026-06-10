-- SUAAS · v0.32.0 · Papelera para GEO, Momentum y Perfiles
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Extiende el soft delete (0007_trash.sql) a las tres entidades que quedaban
-- fuera. Las listas (listGeoAnalyses, listMomentumChallenges, listProfiles)
-- filtran `deleted_at IS NULL` desde el código; /trash muestra las filas con
-- `deleted_at IS NOT NULL` para restaurarlas o borrarlas en duro.
--
-- En perfiles esto es además una red de seguridad: el borrado duro destruye
-- en cascada runs y respuestas históricas (on delete cascade), así que el
-- soft delete evita perder resultados de experimentos por un clic accidental.

alter table geo_analyses        add column if not exists deleted_at timestamptz;
alter table momentum_challenges add column if not exists deleted_at timestamptz;
alter table profiles            add column if not exists deleted_at timestamptz;

create index if not exists geo_analyses_deleted_at_idx        on geo_analyses        (deleted_at);
create index if not exists momentum_challenges_deleted_at_idx on momentum_challenges (deleted_at);
create index if not exists profiles_deleted_at_idx            on profiles            (deleted_at);
