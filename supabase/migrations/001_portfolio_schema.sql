-- Run this in your Supabase project's SQL Editor
-- Dashboard: https://supabase.com/dashboard → your project → SQL Editor

-- ─────────────────────────────────────────────
-- Portfolios
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL DEFAULT 'My Portfolio',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their portfolios"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Holdings (positions inside a portfolio)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id    uuid REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol          text NOT NULL,
  shares          numeric(16, 6) NOT NULL DEFAULT 0,
  avg_cost        numeric(16, 4),           -- average purchase price per share
  added_at        timestamptz DEFAULT now(),
  UNIQUE (portfolio_id, symbol)
);

ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their holdings"
  ON portfolio_assets FOR ALL
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Alert rules
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol        text NOT NULL,
  type          text NOT NULL CHECK (type IN ('stop_loss', 'take_profit', 'score_drop', 'new_opportunity')),
  threshold     numeric(16, 4) NOT NULL,    -- price or score value
  channel       text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  active        boolean DEFAULT true,
  triggered_at  timestamptz,               -- last time it fired (null = not yet)
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their alert rules"
  ON alert_rules FOR ALL
  USING (auth.uid() = user_id);
