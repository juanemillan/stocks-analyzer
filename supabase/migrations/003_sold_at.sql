-- Add sold_at to portfolio_assets so syncs can mark positions as sold
-- instead of deleting them (user's choice).
-- NULL  → active holding
-- set   → detected as no longer in Racional on that date

ALTER TABLE portfolio_assets
    ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
