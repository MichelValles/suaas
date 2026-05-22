-- SUAAS · v0.23.0 · Multi-channel para campaigns
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
--
-- Añade el canal publicitario simulado al modelo de Campaign Tester. Por
-- defecto 'google' para no romper campañas existentes (RSA estricto). Las
-- demás redes reciben el mismo modelo de datos pero el LLM ajusta el
-- framing del prompt (search vs feed) y los caps de caracteres son
-- responsabilidad de la UI (zod schemas condicionales).

alter table campaigns
  add column if not exists channel text not null default 'google';

alter table campaigns
  drop constraint if exists campaigns_channel_check;

alter table campaigns
  add constraint campaigns_channel_check
  check (channel in ('google', 'meta', 'linkedin', 'tiktok', 'x'));

create index if not exists campaigns_channel_idx
  on campaigns (channel, created_at desc);

comment on column campaigns.channel is 'red publicitaria simulada: google | meta | linkedin | tiktok | x';
