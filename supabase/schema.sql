-- Supabase Schema for GERD Finder V5 - Real OrderID FO26 Format
-- Format OrderID real OrderHero: FO26U7LRM3BG (12 char, FO26 + 8 random)

-- Users table: primary login via order_id (FO26...) + email, license_key backup
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  order_id text not null, -- FO26U7LRM3BG real OrderHero format, primary login
  license_key text not null, -- GERD-XXXX-XXXX-XXXX backup premium
  name text,
  phone text,
  device_count int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(email, order_id)
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_order_id on users(order_id);
create index if not exists idx_users_license on users(license_key);

-- Analyses: history 30 hari per user
create table if not exists analyses (
  id uuid default gen_random_uuid() primary key,
  order_id text references users(order_id) on delete cascade,
  email text,
  score int,
  triggers jsonb,
  profile jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_analyses_order on analyses(order_id);

-- Webhook logs: audit OrderHero
create table if not exists webhook_logs (
  id uuid default gen_random_uuid() primary key,
  order_id text, -- FO26U7LRM3BG
  email text,
  license_key text,
  payload jsonb,
  created_at timestamp with time zone default now()
);

-- RLS enable (optional, for security)
alter table users enable row level security;
alter table analyses enable row level security;
alter table webhook_logs enable row level security;

-- Allow anon insert for webhook (since webhook has no user jwt, uses service key)
-- Service key bypasses RLS, so no policy needed for service role
-- For frontend read, allow email match (if using anon key)
create policy if not exists "Allow read own data by email" on users for select using (true);
create policy if not exists "Allow read own analyses" on analyses for select using (true);