-- SUAAS · v0.25.0 · Estrategia publicitaria dentro de cada canal
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Cada canal publicitario (Google, Meta, etc.) tiene distintas estrategias
-- con campos propios. Empezamos modelando las 7 de Google Ads. Sólo `search`
-- (RSA) está implementada hoy; el resto se sembrará como "En construcción"
-- en la UI hasta que tengan sus campos específicos.

alter table campaigns
  add column if not exists strategy text not null default 'search';

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
      'shopping'
    )
  );

create index if not exists campaigns_strategy_idx
  on campaigns (strategy, created_at desc);

comment on column campaigns.strategy is 'estrategia dentro del canal: search | display | pmax | demand_gen | video | app | shopping (hoy sólo search está implementada)';
