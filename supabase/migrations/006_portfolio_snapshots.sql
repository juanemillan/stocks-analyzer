-- Migration 006: Portfolio daily snapshots for performance chart
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  total_value   NUMERIC(18, 2) NOT NULL,  -- sum of shares * close price on this date
  total_cost    NUMERIC(18, 2),            -- sum of shares * avg_cost (static reference)
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date
  ON portfolio_snapshots (user_id, date DESC);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Service-role key (nightly script) bypasses RLS — no insert policy needed for clients.
