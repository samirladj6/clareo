-- =============================================
-- Table pour stocker les fichiers Excel importés
-- Exécuter dans Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS datasets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  file_name TEXT,
  columns JSONB,
  data JSONB,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access datasets" ON datasets FOR ALL TO anon USING (true) WITH CHECK (true);
