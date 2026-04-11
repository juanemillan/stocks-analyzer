-- Run once in Supabase → SQL Editor → New query
--
-- Tracks which alerts have already been emailed, to prevent duplicates.
--
-- alert_key examples:
--   P&L milestones  : "+50", "+100", "+200", "+300", "-20", "-30"
--   Opportunity     : "score_upgrade", "accum_zone", "mom_recovery"
--
-- P&L alerts reset automatically when the holding reverts (script handles this).
-- Opportunity alerts expire after 7 days (script handles TTL by deleting old rows).

CREATE TABLE IF NOT EXISTS portfolio_alert_log (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL,
  symbol     TEXT        NOT NULL,
  alert_key  TEXT        NOT NULL,   -- e.g. "+50", "accum_zone"
  alerted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, symbol, alert_key)
);

ALTER TABLE portfolio_alert_log ENABLE ROW LEVEL SECURITY;
-- The nightly script uses the service-role key which bypasses RLS.
-- No client-facing policy is needed unless you want users to see their log.
