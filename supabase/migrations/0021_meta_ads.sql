-- SUAAS · v0.54.0 · Canal Meta Ads: formatos single / carousel / collection
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- Meta modela el FORMATO del anuncio como estrategia (meta_single,
-- meta_carousel, meta_collection); el objetivo ODAX, el placement de
-- simulación y los textos principales viven en channel_spec (jsonb).
-- Los caps de copy usan el máximo técnico de la Marketing API
-- (asset_feed_spec: body 1.024c, title/description 255c, 5 variantes);
-- los recomendados de visualización se avisan en el form sin bloquear.

-- 1) Estrategias de Meta en el check de strategy.
alter table campaigns
  drop constraint if exists campaigns_strategy_check;

alter table campaigns
  add constraint campaigns_strategy_check
  check (
    strategy in (
      'search',
      'display',
      'pmax',
      'demand_gen',
      'video',
      'app',
      'shopping',
      'meta_single',
      'meta_carousel',
      'meta_collection'
    )
  );

comment on column campaigns.strategy is
  'estrategia dentro del canal: Google (search | display | pmax | demand_gen | video | app | shopping) o formato de Meta (meta_single | meta_carousel | meta_collection)';

-- 2) Nombre de empresa: 75c (nombre de página de Facebook). El límite de
--    25c de Google lo garantiza zod por estrategia.
alter table campaigns
  drop constraint if exists campaigns_company_name_len_check;

alter table campaigns
  add constraint campaigns_company_name_len_check
  check (company_name is null or char_length(company_name) <= 75);

-- 3) CTAs de Meta (Ads Manager en español, lista cerrada) además de las de
--    Google y del texto libre de hasta 10c (Video action campaigns).
alter table campaigns
  drop constraint if exists campaigns_cta_check;

alter table campaigns
  add constraint campaigns_cta_check
  check (cta is null or char_length(cta) <= 10 or cta in (
    -- Google Ads (Display / PMax / Demand Gen)
    'Más información', 'Comprar', 'Reservar ahora', 'Suscribirse',
    'Descargar', 'Instalar', 'Aprender más', 'Solicitar presupuesto',
    'Inscribirse', 'Ver más', 'Contactar', 'Aplicar ahora',
    -- Meta Ads (Administrador de anuncios en español)
    'Registrarte', 'Suscribirte', 'Reservar', 'Enviar solicitud',
    'Realizar pedido', 'Solicitar cita', 'Escuchar', 'Enviar mensaje',
    'Enviar mensaje de WhatsApp', 'Llamar ahora', 'Cómo llegar',
    'Contactarnos', 'Jugar', 'Ver menú', 'Donar ahora', 'Obtener oferta',
    'Instalar ahora', 'Probar en cámara'
  ));

-- 4) Campos específicos del canal (hoy solo Meta):
--    { objective, placement, primary_texts[], display_link? }
alter table campaigns add column if not exists channel_spec jsonb;

comment on column campaigns.channel_spec is
  'campos específicos del canal. Meta: {objective: awareness|traffic|engagement|leads|app_promotion|sales, placement: facebook_feed|instagram_feed|instagram_stories|instagram_reels|threads_feed|whatsapp_status, primary_texts: text[1..5] (máx 1.024c), display_link?}';

insert into suaas_migrations (name) values ('0021_meta_ads.sql')
on conflict (name) do nothing;
