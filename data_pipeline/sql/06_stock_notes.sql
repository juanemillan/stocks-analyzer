-- =============================================================
-- Stock Notes
--   Per-user, per-symbol private notes stored in Supabase.
--   RLS ensures users only see and modify their own rows.
--   Upsert on (user_id, symbol) — one note per symbol per user.
-- =============================================================

create table if not exists stock_notes (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  symbol     text        not null,
  note       text        not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table stock_notes enable row level security;

create policy "Users select own notes"
  on stock_notes for select
  using (auth.uid() = user_id);

create policy "Users insert own notes"
  on stock_notes for insert
  with check (auth.uid() = user_id);

create policy "Users update own notes"
  on stock_notes for update
  using (auth.uid() = user_id);

create policy "Users delete own notes"
  on stock_notes for delete
  using (auth.uid() = user_id);
