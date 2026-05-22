-- SUAAS · esquema v0.7.0 · A/B tests, Copy resonance, Pricing
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Tres módulos paralelos:
--   - ab_tests: comparar dos targets ya existentes con el MISMO set de perfiles.
--   - copy_decks + copy_blocks + copy_responses: medir resonancia de texto puro.
--   - pricing_offers + pricing_prices + pricing_responses: elasticidad por precio.

-- ============================================================
-- AB tests (referencia a dos targets)
-- ============================================================
create table if not exists ab_tests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  hypothesis text,
  target_a_id uuid not null references targets(id) on delete cascade,
  target_b_id uuid not null references targets(id) on delete cascade,
  check (target_a_id <> target_b_id)
);

-- relación run-ab_test-variant
create table if not exists ab_test_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ab_test_id uuid not null references ab_tests(id) on delete cascade,
  run_id uuid not null references runs(id) on delete cascade,
  variant text not null check (variant in ('A', 'B')),
  unique (ab_test_id, variant, run_id)
);

create index if not exists ab_test_runs_test_idx on ab_test_runs (ab_test_id);

-- runs.ab_test_id para filtros directos
alter table runs
  add column if not exists ab_test_id uuid references ab_tests(id) on delete set null;
create index if not exists runs_ab_test_idx on runs (ab_test_id, created_at desc);

-- ============================================================
-- Copy resonance
-- ============================================================
create table if not exists copy_decks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  context text  -- "anuncio en Instagram", "newsletter", "headline en hero", etc.
);

create table if not exists copy_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deck_id uuid not null references copy_decks(id) on delete cascade,
  position integer not null,
  label text not null,         -- nombre interno: "v1 directo", "v2 emocional"
  text text not null,           -- el copy en sí
  unique (deck_id, position)
);

create index if not exists copy_blocks_deck_idx on copy_blocks (deck_id, position);

create table if not exists copy_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  block_id uuid not null references copy_blocks(id) on delete cascade,
  sentiment text not null,                                              -- positivo|negativo|neutro|escéptico
  clarity numeric not null check (clarity >= 0 and clarity <= 1),
  persuasion numeric not null check (persuasion >= 0 and persuasion <= 1),
  would_click boolean not null,
  critique text not null,
  meta jsonb,
  unique (run_id, profile_id, block_id)
);

create index if not exists copy_responses_run_idx on copy_responses (run_id);

-- runs.copy_deck_id para filtros directos
alter table runs
  add column if not exists copy_deck_id uuid references copy_decks(id) on delete set null;
create index if not exists runs_copy_deck_idx on runs (copy_deck_id, created_at desc);

-- ============================================================
-- Pricing
-- ============================================================
create table if not exists pricing_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text not null,
  currency text not null default 'EUR',
  anchor_price numeric  -- precio actual de referencia (opcional)
);

create table if not exists pricing_prices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  offer_id uuid not null references pricing_offers(id) on delete cascade,
  position integer not null,
  label text,           -- "barato", "actual", "premium", opcional
  price numeric not null check (price > 0),
  unique (offer_id, position)
);

create index if not exists pricing_prices_offer_idx on pricing_prices (offer_id, position);

create table if not exists pricing_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  price_id uuid not null references pricing_prices(id) on delete cascade,
  would_buy boolean not null,
  willingness_to_pay numeric not null check (willingness_to_pay >= 0 and willingness_to_pay <= 1),
  perceived_value numeric not null check (perceived_value >= 0 and perceived_value <= 1),
  critique text not null,
  meta jsonb,
  unique (run_id, profile_id, price_id)
);

create index if not exists pricing_responses_run_idx on pricing_responses (run_id);

-- runs.pricing_offer_id para filtros directos
alter table runs
  add column if not exists pricing_offer_id uuid references pricing_offers(id) on delete set null;
create index if not exists runs_pricing_offer_idx on runs (pricing_offer_id, created_at desc);
