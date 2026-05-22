-- SUAAS · esquema v0.13 · Papelera (soft delete)
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Añade `deleted_at` a las 5 entidades testeables. Las listas existentes
-- (listTargets, listFunnels, listAbTests, listCopyDecks, listPricingOffers)
-- filtran `deleted_at IS NULL` desde el código. La página /trash muestra las
-- filas con `deleted_at IS NOT NULL` para restaurarlas o borrarlas en duro.

alter table targets         add column if not exists deleted_at timestamptz;
alter table funnels         add column if not exists deleted_at timestamptz;
alter table ab_tests        add column if not exists deleted_at timestamptz;
alter table copy_decks      add column if not exists deleted_at timestamptz;
alter table pricing_offers  add column if not exists deleted_at timestamptz;

create index if not exists targets_deleted_at_idx        on targets        (deleted_at);
create index if not exists funnels_deleted_at_idx        on funnels        (deleted_at);
create index if not exists ab_tests_deleted_at_idx       on ab_tests       (deleted_at);
create index if not exists copy_decks_deleted_at_idx     on copy_decks     (deleted_at);
create index if not exists pricing_offers_deleted_at_idx on pricing_offers (deleted_at);
