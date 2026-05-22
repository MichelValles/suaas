-- SUAAS · v0.26.0 · Campos específicos de Display Ads
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Display Ads (RDA) tiene campos que no aplican a Search:
--   - company_name: nombre de empresa (25c)
--   - long_headline: titular largo (90c)
--   - cta: call to action (de un set predefinido por Google)
-- Las imágenes / vídeos por rol se siguen guardando en `creatives` (jsonb)
-- con un campo `role` añadido por validación zod.

alter table campaigns
  add column if not exists company_name text;

alter table campaigns
  add column if not exists long_headline text;

alter table campaigns
  add column if not exists cta text;

comment on column campaigns.company_name is 'nombre de empresa (Display, max 25 chars). NULL para Search.';
comment on column campaigns.long_headline is 'titular largo (Display, max 90 chars). NULL para Search.';
comment on column campaigns.cta is 'call to action de Google Ads (Display / Demand Gen / etc.). NULL para Search.';
