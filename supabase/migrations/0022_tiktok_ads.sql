-- SUAAS · v0.55.0 · Canal TikTok Ads: formatos vídeo in-feed / carousel / spark
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- TikTok modela el FORMATO del anuncio como estrategia (tiktok_video,
-- tiktok_carousel, tiktok_spark); el objetivo, las variantes de texto,
-- la identidad (@usuario) y la música viven en channel_spec (jsonb) con
-- el discriminador network='tiktok'. Caps verificados contra el TikTok
-- Business Help Center y la Marketing API (junio 2026): ad text 1-100c
-- sin emojis/«#», display name 40c técnico (20 visibles), CTA de lista
-- cerrada, carousel 2-35 imágenes con música obligatoria.

-- 1) Estrategias de TikTok en el check de strategy.
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
      'meta_collection',
      'tiktok_video',
      'tiktok_carousel',
      'tiktok_spark'
    )
  );

comment on column campaigns.strategy is
  'estrategia dentro del canal: Google (search | display | pmax | demand_gen | video | app | shopping), formato de Meta (meta_single | meta_carousel | meta_collection) o formato de TikTok (tiktok_video | tiktok_carousel | tiktok_spark)';

-- 2) CTAs de TikTok (Ads Manager en español, lista cerrada de 25 opciones
--    de landing page) además de las de Google, Meta y el texto libre de
--    hasta 10c (Video action campaigns).
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
    'Instalar ahora', 'Probar en cámara',
    -- TikTok Ads (Ads Manager en español)
    'Comprar ahora', 'Registrarse', 'Solicitar ahora', 'Contáctanos',
    'Hacer pedido', 'Obtener presupuesto', 'Me interesa', 'Probar ahora',
    'Mirar ahora', 'Escuchar ahora', 'Visitar la tienda',
    'Comprar entradas ahora', 'Obtener horarios de espectáculos',
    'Unirse al hashtag', 'Grabar con este efecto', 'Ver vídeo con este efecto'
  ));

-- 3) Defensivo por si la 0021 no consta aplicada (TikTok también necesita
--    channel_spec y el cap de company_name a 75): idempotente en ambos casos.
alter table campaigns add column if not exists channel_spec jsonb;

alter table campaigns
  drop constraint if exists campaigns_company_name_len_check;

alter table campaigns
  add constraint campaigns_company_name_len_check
  check (company_name is null or char_length(company_name) <= 75);

-- 4) Documentar el shape TikTok de channel_spec.
comment on column campaigns.channel_spec is
  'campos específicos del canal. Meta (sin discriminador): {objective, placement, primary_texts[1..5], display_link?}. TikTok: {network: "tiktok", objective: reach|traffic|video_views|community_interaction|app_promotion|lead_generation|sales, ad_texts: text[1..5] (máx 100c, Spark 150c), identity_handle?, music_name?}';

insert into suaas_migrations (name) values ('0022_tiktok_ads.sql')
on conflict (name) do nothing;
