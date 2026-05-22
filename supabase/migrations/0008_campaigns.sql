-- SUAAS · esquema v0.21.0 · Campaign Tester (Paid Search)
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
-- Luego ejecutar: NOTIFY pgrst, 'reload schema';
--
-- Una campaign modela un anuncio RSA (Responsive Search Ad) de Google Ads:
-- nombre, brief, landing (URL + imagen), 1..5 queries objetivo, 3..15 headlines
-- (max 30 chars cada uno), 2..4 descriptions (max 90 chars), 0..6 creatividades.
-- Cada run produce una respuesta normalizada por (run, profile, query) en
-- `campaign_responses` con tres bloques:
--   1) snippet eval: intent_to_click, perceived_offer, clarity, credibility,
--      differentiation, barriers.
--   2) landing eval (sólo si intent_to_click >= 0.5): landing_match + critique.
--   3) versión ideal del perfil: ideal_headline + ideal_description +
--      ideal_promise + ideal_free_text opcional.

-- ============================================================
-- campaigns: definición del anuncio bajo test
-- ============================================================
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  name text not null,
  brief text,                                    -- contexto libre del operador
  final_url text not null,                       -- URL de la landing
  landing_image_url text not null,               -- og:image o upload
  landing_source_url text,                       -- source si se resolvió por URL
  queries text[] not null
    check (array_length(queries, 1) between 1 and 5),
  headlines text[] not null
    check (array_length(headlines, 1) between 3 and 15),
  descriptions text[] not null
    check (array_length(descriptions, 1) between 2 and 4),
  creatives jsonb not null default '[]'::jsonb   -- [{url:string, label?:string}]
);

create index if not exists campaigns_created_at_idx
  on campaigns (created_at desc);

comment on column campaigns.queries is 'palabras clave objetivo del Paid Search';
comment on column campaigns.headlines is 'titulares RSA (max 30 chars cada uno, validado en zod)';
comment on column campaigns.descriptions is 'descripciones RSA (max 90 chars cada una, validado en zod)';
comment on column campaigns.creatives is 'array de objetos {url, label?} opcionales';

-- ============================================================
-- runs.campaign_id: enlazar runs con campaigns
-- ============================================================
alter table runs
  add column if not exists campaign_id uuid references campaigns(id) on delete set null;

create index if not exists runs_campaign_idx
  on runs (campaign_id, created_at desc);

-- ============================================================
-- campaign_responses: una fila por (run, profile, query)
-- ============================================================
create table if not exists campaign_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  query text not null,
  -- snippet eval
  intent_to_click numeric not null check (intent_to_click >= 0 and intent_to_click <= 1),
  perceived_offer text not null,
  clarity numeric not null check (clarity >= 0 and clarity <= 1),
  credibility numeric not null check (credibility >= 0 and credibility <= 1),
  differentiation numeric not null check (differentiation >= 0 and differentiation <= 1),
  barriers text[] not null default '{}'::text[],
  -- landing eval (sólo si intent_to_click >= 0.5)
  landing_evaluated boolean not null default false,
  landing_match numeric check (landing_match is null or (landing_match >= 0 and landing_match <= 1)),
  landing_critique text,
  -- versión ideal del perfil
  ideal_headline text not null,
  ideal_description text not null,
  ideal_promise text not null,
  ideal_free_text text,
  meta jsonb,
  unique (run_id, profile_id, query)
);

create index if not exists campaign_responses_run_idx
  on campaign_responses (run_id);
create index if not exists campaign_responses_query_idx
  on campaign_responses (run_id, query);

comment on column campaign_responses.intent_to_click is '0..1 probabilidad subjetiva de hacer click bajo la query';
comment on column campaign_responses.landing_match is 'sólo se evalúa si intent_to_click >= 0.5; null en caso contrario';
comment on column campaign_responses.ideal_headline is 'titular alternativo en la voz del perfil (max 30 chars)';
comment on column campaign_responses.ideal_description is 'descripción alternativa en la voz del perfil (max 90 chars)';
comment on column campaign_responses.ideal_promise is 'promesa central que el perfil esperaría leer';
