-- SUAAS · v0.22.0 · Relax constraints de campaigns
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Cambios:
--   1) headlines: ya no exige mínimo 3, ahora basta con 1 (sigue acotando a 15).
--      El operador puede crear campañas con un único titular para iterar rápido,
--      sabiendo que un RSA real exige 3+ para activarse en Google Ads.

alter table campaigns
  drop constraint if exists campaigns_headlines_check;

alter table campaigns
  add constraint campaigns_headlines_check
  check (array_length(headlines, 1) between 1 and 15);
