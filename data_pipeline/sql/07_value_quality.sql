-- Value & quality data for the Buffett-style screen.
-- Metrics are refreshed from the provider; NULL means unavailable, never zero.

ALTER TABLE assets ADD COLUMN IF NOT EXISTS market_cap NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS trailing_pe NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS forward_pe NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS price_to_book NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS enterprise_to_ebitda NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS free_cashflow NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operating_cashflow NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS total_debt NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS total_cash NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS return_on_equity NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS profit_margins NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS revenue_growth NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS earnings_growth NUMERIC;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS valuation_updated_at TIMESTAMPTZ;

CREATE OR REPLACE VIEW v_value_quality_candidates AS
SELECT
  a.symbol, a.name, a.asset_type, a.racional_url, a.sector,
  a.market_cap, a.trailing_pe, a.forward_pe, a.price_to_book,
  a.enterprise_to_ebitda, a.free_cashflow, a.total_debt, a.total_cash,
  a.return_on_equity, a.profit_margins, a.revenue_growth, a.earnings_growth,
  CASE WHEN a.return_on_equity >= 0.15 THEN 1 ELSE 0 END
  + CASE WHEN a.free_cashflow > 0 THEN 1 ELSE 0 END
  + CASE WHEN a.trailing_pe > 0 AND a.trailing_pe <= 25 THEN 1 ELSE 0 END
  + CASE WHEN a.enterprise_to_ebitda > 0 AND a.enterprise_to_ebitda <= 15 THEN 1 ELSE 0 END
  + CASE WHEN a.total_debt IS NULL OR a.total_cash IS NULL OR a.total_debt <= a.total_cash * 3 THEN 1 ELSE 0 END
  + CASE WHEN a.profit_margins >= 0.10 THEN 1 ELSE 0 END AS value_quality_score
FROM assets a
WHERE a.is_active = TRUE
  AND a.asset_type = 'EQUITY'
  AND a.market_cap >= 2000000000
  AND a.return_on_equity IS NOT NULL
  AND a.free_cashflow IS NOT NULL
  AND a.trailing_pe IS NOT NULL;
