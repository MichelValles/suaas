-- SUAAS · v0.24.0 · Multi-canal por campaña
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Una misma campaña ahora puede probarse en varias redes a la vez. El runner
-- itera profile × channel × query y persiste una fila por combinación en
-- campaign_responses. Esto permite comparar la misma copy en search vs feed
-- sin duplicar la campaña.

-- ============================================================
-- 1) campaigns: channel (text) → channels (text[])
-- ============================================================

-- añadir columna nueva con default array['google']
alter table campaigns
  add column if not exists channels text[] not null default array['google']::text[];

-- backfill: copiar el channel actual al array
update campaigns
  set channels = array[channel]
  where channel is not null
    and (channels is null or array_length(channels, 1) is null or channels = array['google']::text[]);

-- drop constraints e índice del channel antiguo
alter table campaigns drop constraint if exists campaigns_channel_check;
drop index if exists campaigns_channel_idx;

-- drop column channel
alter table campaigns drop column if exists channel;

-- check sobre channels: 1..5 elementos, todos en el set válido
alter table campaigns
  drop constraint if exists campaigns_channels_check;
alter table campaigns
  add constraint campaigns_channels_check
  check (
    array_length(channels, 1) between 1 and 5
    and channels <@ array['google', 'meta', 'linkedin', 'tiktok', 'x']::text[]
  );

-- índice GIN para filtrar por channels (útil cuando crezca)
create index if not exists campaigns_channels_gin_idx
  on campaigns using gin (channels);

comment on column campaigns.channels is 'redes publicitarias simuladas: subconjunto de google | meta | linkedin | tiktok | x';

-- ============================================================
-- 2) campaign_responses: añadir channel y rehacer unique key
-- ============================================================

alter table campaign_responses
  add column if not exists channel text not null default 'google';

-- check del set válido
alter table campaign_responses
  drop constraint if exists campaign_responses_channel_check;
alter table campaign_responses
  add constraint campaign_responses_channel_check
  check (channel in ('google', 'meta', 'linkedin', 'tiktok', 'x'));

-- drop el unique anterior (auto-nombre campaign_responses_run_id_profile_id_query_key)
-- y crear uno nuevo con channel incluido
alter table campaign_responses
  drop constraint if exists campaign_responses_run_id_profile_id_query_key;
alter table campaign_responses
  drop constraint if exists campaign_responses_unique;
alter table campaign_responses
  add constraint campaign_responses_unique
  unique (run_id, profile_id, query, channel);

create index if not exists campaign_responses_channel_idx
  on campaign_responses (run_id, channel);

comment on column campaign_responses.channel is 'la red en la que se evaluó esta respuesta (subset de campaigns.channels)';
