-- SUAAS · v0.59.0 · Cerebro: base de conocimiento de marca
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- Cerebro centraliza la identidad de marca que hoy se reteclea en cada
-- módulo (GEO brand_name/brand_description, Momentum brand_context,
-- Campañas company_name/brief). Una marca tiene una descripción reutilizable
-- y N documentos .md de conocimiento (incluida info privada que no está en
-- buscadores: analytics, informes, VoC).

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  deleted_at timestamptz
);

comment on table brands is 'Cerebro: marca con identidad reutilizable y documentos de conocimiento.';
comment on column brands.description is 'Descripción/identidad pública de la marca, reutilizable como contexto en los módulos.';

create index if not exists brands_created_at_idx on brands (created_at desc);

create table if not exists brand_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null,
  kind text not null default 'nota',
  content text not null
);

comment on column brand_documents.kind is 'nota | brief | tono | producto | analytics | voc | informe ... clasificación libre del documento.';
comment on column brand_documents.content is 'Markdown del documento. Puede incluir info privada (analytics, informes) que no está en buscadores.';

create index if not exists brand_documents_brand_idx on brand_documents (brand_id, created_at desc);

-- updated_at en brands (reusa la función set_updated_at creada en 0001)
drop trigger if exists brands_updated_at on brands;
create trigger brands_updated_at
before update on brands
for each row execute function set_updated_at();

insert into suaas_migrations (name) values ('0025_cerebro.sql')
  on conflict (name) do nothing;
