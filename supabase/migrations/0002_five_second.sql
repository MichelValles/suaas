-- SUAAS · esquema v0.4.0 · Test de claridad de 5 segundos
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- targets.payload para un 5s_test sigue esta forma:
--   {
--     "kind": "5s_test",
--     "main_promise": "string que se espera que el usuario recuerde",
--     "image_url": "https://... (og:image) | data: URL inline",
--     "source_url": "https://landing.example.com (opcional, para referencia)"
--   }
-- No requiere alterar `targets` (payload es jsonb abierto).
-- `runs.kind` admite "5s_test" sin cambios estructurales (es text libre).

-- ============================================================
-- five_second_responses: respuesta normalizada por (run, profile)
-- ============================================================
create table if not exists five_second_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null references runs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  recall text not null,
  perceived_offer text not null,
  clarity numeric not null check (clarity >= 0 and clarity <= 1),
  comprehension_rate numeric check (comprehension_rate is null or (comprehension_rate >= 0 and comprehension_rate <= 1)),
  barriers_detected text[] not null default '{}'::text[],
  meta jsonb,
  unique (run_id, profile_id)
);

comment on column five_second_responses.recall is 'qué recuerda el perfil tras la vista de 5s';
comment on column five_second_responses.perceived_offer is 'qué cree que le ofrece la pantalla';
comment on column five_second_responses.clarity is '0..1 según el propio perfil';
comment on column five_second_responses.comprehension_rate is 'score LLM-as-judge contra main_promise (0..1)';
comment on column five_second_responses.barriers_detected is 'fricciones citadas durante la simulación';
comment on column five_second_responses.meta is 'modelos, latencias, prompts efectivos';

create index if not exists five_second_responses_run_idx
  on five_second_responses (run_id);
