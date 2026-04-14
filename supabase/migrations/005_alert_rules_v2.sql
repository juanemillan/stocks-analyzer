-- Migration 005: Expand alert_rules for user-defined P&L thresholds and price targets
-- Run in Supabase SQL Editor

-- 1. Drop old type constraint and replace with expanded set
ALTER TABLE alert_rules
  DROP CONSTRAINT IF EXISTS alert_rules_type_check;

ALTER TABLE alert_rules
  ADD CONSTRAINT alert_rules_type_check
  CHECK (type IN ('stop_loss', 'take_profit', 'price_above', 'price_below', 'score_drop', 'new_opportunity'));

-- 2. Add unique constraint so upsert (ON CONFLICT) works per user/symbol/type
ALTER TABLE alert_rules
  DROP CONSTRAINT IF EXISTS alert_rules_user_symbol_type_key;

ALTER TABLE alert_rules
  ADD CONSTRAINT alert_rules_user_symbol_type_key
  UNIQUE (user_id, symbol, type);
