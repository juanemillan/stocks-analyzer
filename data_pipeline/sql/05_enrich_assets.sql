-- ===========================================
-- 05_enrich_assets.sql
-- Adds metadata columns to the assets table
-- Safe to run multiple times (IF NOT EXISTS /
-- each statement is guarded).
-- ===========================================

ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sector      TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS industry    TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS website     TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS country     TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
