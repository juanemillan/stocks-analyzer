-- Migration 007: AI nightly insight cards
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_insights (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE        NOT NULL,
  lang        TEXT        NOT NULL CHECK (lang IN ('es', 'en')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (date, lang)
);

-- Public read access — insight cards are not user-specific
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ai_insights"
  ON ai_insights FOR SELECT
  USING (true);

-- Service-role (pipeline) writes via service key — no insert policy needed for anon clients.
