-- The condition that would invalidate a user's investment thesis.
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS invalidation text;
