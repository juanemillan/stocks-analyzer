-- Private investment notes for each user's watchlist.
CREATE TABLE IF NOT EXISTS watchlist (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);

ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS thesis text;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS target_price numeric(16,4);
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS review_date date;
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watching'
  CHECK (status IN ('watching', 'researching', 'ready', 'passed'));

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own their watchlist" ON watchlist;
CREATE POLICY "Users own their watchlist" ON watchlist FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
