-- SUAAS · v0.29.0 · Gravity Model
-- Aplicar copiando en el SQL editor del proyecto Supabase.

-- 1. Contexto JTBD en perfiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intent_context text;
COMMENT ON COLUMN profiles.intent_context IS 'Contexto JTBD: "Cuando [situación], quiero [motivación] para poder [resultado]". Ancla prompts al momento de intención específico del usuario.';

-- 2. Clasificación de conducta en test de claridad 5s
ALTER TABLE five_second_responses ADD COLUMN IF NOT EXISTS behavior_class text
  CHECK (behavior_class IS NULL OR behavior_class IN ('optima', 'fuga', 'repesca'));
COMMENT ON COLUMN five_second_responses.behavior_class IS 'optima: comprende y avanza | fuga: carga cognitiva demasiado alta, abandona | repesca: dudas pero intención viva';

-- 3. Tabla de análisis GEO (Generative Engine Optimization)
CREATE TABLE IF NOT EXISTS geo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  brand_name text NOT NULL,
  brand_description text NOT NULL,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'error'))
);

COMMENT ON TABLE geo_analyses IS 'Análisis GEO: simula cómo un motor de búsqueda IA describe la marca para cada segmento de intención (JTBD).';
COMMENT ON COLUMN geo_analyses.segments IS 'Array de strings JTBD: cada uno es un segmento de intención del Gravity Model.';
COMMENT ON COLUMN geo_analyses.results IS 'Array de GeoSegmentResult: respuesta IA simulada y análisis de visibilidad por segmento.';

CREATE INDEX IF NOT EXISTS geo_analyses_created_idx ON geo_analyses (created_at DESC);
