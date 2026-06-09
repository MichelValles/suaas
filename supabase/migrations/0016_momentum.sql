-- Tabla para escenarios de activación (retos de Intent Momentum)
CREATE TABLE IF NOT EXISTS momentum_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  trigger_scenario text NOT NULL,
  brand_context text,
  profile_ids uuid[] NOT NULL DEFAULT '{}',
  results jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'error'))
);
