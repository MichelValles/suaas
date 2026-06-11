-- SUAAS · v0.45.0 · Shopping: producto del feed como fuente del anuncio
--
-- Aplicar en el SQL editor del proyecto Supabase (puede pegarse en la misma
-- sesión que 0019_consolidacion.sql). Luego: NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- En Shopping no se redactan titulares ni descripciones: Google genera la
-- ficha desde el feed de Merchant Center (spec 7052112). La campaña guarda
-- el producto bajo test en `product` (jsonb): id (50c), title (150c),
-- description (5000c), price (ISO 4217), availability, brand (70c), gtin,
-- mpn (70c, si no hay gtin), condition. El link del producto es final_url
-- y la imagen principal va en creatives.

alter table campaigns add column if not exists product jsonb;

comment on column campaigns.product is
  'producto del feed para campañas shopping: {id, title, description, price, availability, brand?, gtin?, mpn?, condition?}';

insert into suaas_migrations (name) values ('0020_shopping.sql')
on conflict (name) do nothing;
