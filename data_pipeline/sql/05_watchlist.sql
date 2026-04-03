-- =============================================================
-- Watchlist
--   Per-user watchlist stored in Supabase (auth.users).
--   RLS ensures users only see and modify their own rows.
-- =============================================================

create table if not exists watchlist (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  symbol     text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table watchlist enable row level security;

create policy "Users select own watchlist"
  on watchlist for select
  using (auth.uid() = user_id);

create policy "Users insert own watchlist"
  on watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users delete own watchlist"
  on watchlist for delete
  using (auth.uid() = user_id);
