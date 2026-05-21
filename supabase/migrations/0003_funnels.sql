-- SUAAS · esquema v0.5.0 · Simulación de embudo
--
-- Aplicar copiando este archivo en el SQL editor del proyecto Supabase
-- (Marketplace de Vercel -> Supabase -> Open in Supabase -> SQL editor).
--
-- Un embudo es una lista ordenada de pantallas. Cada paso vive en
-- `funnel_steps` y tiene:
--   - position (1..N): orden estable
--   - name: etiqueta corta del paso (ej. "Hero", "Formulario", "Confirmación")
--   - intent: qué debería hacer el usuario en ese paso (ej. "hacer click en CTA")
--   - payload: jsonb { kind: "url"|"upload", image_url, source_url? }
--
-- Los embudos son independientes de `targets`: si la misma pantalla aparece
-- en un test de 5s y en un embudo, se sube dos veces. Decisión tomada en
-- v0.5.0 para no acoplar ciclos de vida.

-- ============================================================
-- funnels: cabecera del embudo
-- ============================================================
create table if not exists funnels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text
);

create index if not exists funnels_created_at_idx on funnels (created_at desc);

-- ============================================================
-- funnel_steps: pantallas ordenadas dentro de un embudo
-- ============================================================
create table if not exists funnel_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  funnel_id uuid not null references funnels(id) on delete cascade,
  position integer not null,
  name text not null,
  intent text not null,
  payload jsonb not null,
  unique (funnel_id, position)
);

comment on column funnel_steps.intent is 'qué debería hacer el usuario en este paso (CTA, rellenar form, etc.)';
comment on column funnel_steps.payload is '{kind: "url"|"upload", image_url, source_url?}';

create index if not exists funnel_steps_funnel_idx
  on funnel_steps (funnel_id, position);
