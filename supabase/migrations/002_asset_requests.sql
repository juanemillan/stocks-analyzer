-- Asset request table: users suggest tickers to be added to the platform
CREATE TABLE IF NOT EXISTS asset_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    symbol      TEXT NOT NULL,
    reason      TEXT,
    status      TEXT NOT NULL DEFAULT 'pending', -- pending | added | rejected
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
