-- SUAAS · v0.63.0 · RAG de Cerebro: chunks con embeddings (pgvector 0.8)
--
-- Aplicar en el SQL editor del proyecto Supabase. Luego:
--   NOTIFY pgrst, 'reload schema';
-- Idempotente.
--
-- Sustituye el volcado íntegro de buildBrandContext (30.000 chars a ciegas)
-- por recuperación por similitud: cada documento no sensible se trocea en
-- chunks de ~1.000 caracteres con solape, se vectoriza vía AI Gateway
-- (openai/text-embedding-3-small, 1536 dims) y match_brand_chunks devuelve
-- solo los fragmentos relevantes para la query del módulo. Los documentos
-- sensitive NUNCA se indexan (filtro en app) NI se devuelven (filtro aquí):
-- defensa en profundidad.

create extension if not exists vector with schema extensions;

create table if not exists brand_document_chunks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  document_id uuid not null references brand_documents(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1536),
  embedding_model text not null default 'openai/text-embedding-3-small',
  unique (document_id, chunk_index)
);

comment on table brand_document_chunks is
  'RAG de Cerebro: fragmentos vectorizados de brand_documents no sensibles. Se regeneran al guardar o editar el documento.';

create index if not exists brand_document_chunks_brand_idx
  on brand_document_chunks (brand_id);

-- HNSW (pgvector >= 0.5.0): funciona sobre tabla vacía, a diferencia de
-- ivfflat. Con el volumen actual (decenas de chunks) es futurible, pero
-- evita otra migración cuando el corpus crezca.
create index if not exists brand_document_chunks_embedding_idx
  on brand_document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- Mismo patrón que 0027: RLS sin policies bloquea anon/authenticated;
-- el servidor entra con la service role, que ignora RLS.
alter table brand_document_chunks enable row level security;

-- Búsqueda por similitud coseno.
create or replace function match_brand_chunks(
  p_brand_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count int default 6,
  p_min_similarity double precision default 0.15
)
returns table (
  document_id uuid,
  title text,
  kind text,
  chunk_index int,
  content text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.document_id,
    d.title,
    d.kind,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from brand_document_chunks c
  join brand_documents d on d.id = c.document_id
  where c.brand_id = p_brand_id
    and d.sensitive = false
    and c.embedding is not null
    and 1 - (c.embedding <=> p_query_embedding) >= p_min_similarity
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;

revoke execute on function match_brand_chunks(uuid, extensions.vector, int, double precision)
  from anon, authenticated;

-- Los módulos guardan la marca elegida para poder recuperar por similitud
-- en tiempo de ejecución (hoy solo guardan el texto aplanado del picker).
alter table geo_analyses
  add column if not exists brand_id uuid references brands(id) on delete set null;
alter table momentum_challenges
  add column if not exists brand_id uuid references brands(id) on delete set null;

insert into suaas_migrations (name) values ('0029_rag_cerebro.sql')
  on conflict (name) do nothing;
