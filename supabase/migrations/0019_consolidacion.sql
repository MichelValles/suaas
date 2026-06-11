-- SUAAS · v0.37.0 · Consolidación de esquema de campañas + tracking de migraciones
--
-- Aplicar copiando este archivo entero en el SQL editor del proyecto Supabase.
-- Luego ejecutar: NOTIFY pgrst, 'reload schema';
--
-- Idempotente: se puede pegar dos veces sin efectos.
--
-- Incluye también, agrupadas para una sola sesión de SQL editor, las columnas
-- de las releases v0.39 (juez de comprensión, behavior_class) y v0.40 (ranking
-- por asset) del plan docs/CAMPANAS-PLAN-MEJORA.md. El código de cada feature
-- llegará después: las columnas ya estarán.

-- ============================================================
-- 1) Tracking de migraciones aplicadas
--    Sin esto, los fallbacks defensivos del código son permanentes porque
--    nunca se sabe qué SQL se aplicó. Convención hacia delante: cada
--    migración nueva termina insertando su propia fila.
-- ============================================================
create table if not exists suaas_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

insert into suaas_migrations (name) values
  ('0001_initial.sql'),
  ('0002_five_second.sql'),
  ('0003_funnels.sql'),
  ('0004_funnel_runs.sql'),
  ('0005_gateway_usage.sql'),
  ('0006_ab_copy_pricing.sql'),
  ('0007_trash.sql'),
  ('0008_campaigns.sql'),
  ('0009_campaigns_relax.sql'),
  ('0010_campaigns_channel.sql'),
  ('0011_campaigns_multichannel.sql'),
  ('0012_campaigns_headlines_fix.sql'),
  ('0013_campaigns_strategy.sql'),
  ('0014_campaigns_display.sql'),
  ('0015_gravity_model.sql'),
  ('0016_momentum.sql'),
  ('0017_trash_geo_momentum_profiles.sql'),
  ('0018_campaigns_descriptions_fix.sql')
on conflict (name) do nothing;

-- ============================================================
-- 2) Columna legacy `channel` (pre-0011, sustituida por channels[])
-- ============================================================
alter table campaigns drop column if exists channel;

-- ============================================================
-- 3) Checks de arrays con coalesce
--    array_length('{}') es NULL y un CHECK con NULL pasa, así que los
--    mínimos originales nunca se garantizaron en BD para arrays vacíos.
--    Rangos = el sobre laxo del zod (la validación fina por estrategia
--    vive en CampaignInputSchema): queries 0..5 (Display no lleva),
--    headlines 1..15, descriptions 1..5.
-- ============================================================
alter table campaigns drop constraint if exists campaigns_queries_check;
alter table campaigns add constraint campaigns_queries_check
  check (coalesce(array_length(queries, 1), 0) between 0 and 5);

alter table campaigns drop constraint if exists campaigns_headlines_check;
alter table campaigns add constraint campaigns_headlines_check
  check (coalesce(array_length(headlines, 1), 0) between 1 and 15);

alter table campaigns drop constraint if exists campaigns_descriptions_check;
alter table campaigns add constraint campaigns_descriptions_check
  check (coalesce(array_length(descriptions, 1), 0) between 1 and 5);

-- ============================================================
-- 4) Checks de Display (longitudes y CTA del set de Google Ads)
-- ============================================================
alter table campaigns drop constraint if exists campaigns_company_name_len_check;
alter table campaigns add constraint campaigns_company_name_len_check
  check (company_name is null or char_length(company_name) <= 25);

alter table campaigns drop constraint if exists campaigns_long_headline_len_check;
alter table campaigns add constraint campaigns_long_headline_len_check
  check (long_headline is null or char_length(long_headline) <= 90);

-- CTA: o un valor del set de Google Ads (Display/PMax/Demand Gen) o texto
-- libre de hasta 10 caracteres (Video action campaigns, spec 17091270).
alter table campaigns drop constraint if exists campaigns_cta_check;
alter table campaigns add constraint campaigns_cta_check
  check (cta is null or char_length(cta) <= 10 or cta in (
    'Más información', 'Comprar', 'Reservar ahora', 'Suscribirse',
    'Descargar', 'Instalar', 'Aprender más', 'Solicitar presupuesto',
    'Inscribirse', 'Ver más', 'Contactar', 'Aplicar ahora'
  ));

-- ============================================================
-- 5) Row Level Security sin policies
--    El service role (servidor) salta RLS; la anon key queda deny-all.
--    La app no cambia: nunca usa la anon key contra estas tablas.
-- ============================================================
alter table campaigns enable row level security;
alter table campaign_responses enable row level security;

-- ============================================================
-- 6) Columnas de releases posteriores (agrupadas aquí a propósito)
-- ============================================================

-- v0.39 · juez neutral de comprensión del anuncio
alter table campaigns
  add column if not exists intended_message text;
comment on column campaigns.intended_message is
  'mensaje que el anunciante quiere que se entienda; lo contrasta un juez neutral contra perceived_offer';

alter table campaign_responses
  add column if not exists comprehension_rate numeric
  check (comprehension_rate is null or (comprehension_rate >= 0 and comprehension_rate <= 1));
comment on column campaign_responses.comprehension_rate is
  '0..1 del juez neutral: cuánto coincide perceived_offer con intended_message';

-- v0.39 · behavior_class del Gravity Model (espejo de 0015 para five_second)
alter table campaign_responses
  add column if not exists behavior_class text
  check (behavior_class is null or behavior_class in ('optima', 'fuga', 'repesca'));
comment on column campaign_responses.behavior_class is
  'conducta predicha del Gravity Model: optima (click), fuga (ignora), repesca (sin click pero la necesidad sigue viva)';

-- v0.40 · ranking por asset (combinación RSA mostrada en cada respuesta)
alter table campaign_responses
  add column if not exists shown_headlines text[];
alter table campaign_responses
  add column if not exists shown_descriptions text[];
comment on column campaign_responses.shown_headlines is
  'titulares concretos mostrados en la combinación RSA muestreada de esta respuesta';

-- ============================================================
-- 7) Registrar esta migración
-- ============================================================
insert into suaas_migrations (name) values ('0019_consolidacion.sql')
on conflict (name) do nothing;
