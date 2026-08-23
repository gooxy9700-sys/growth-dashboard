-- Run in the Supabase SQL editor after enabling Email auth.
create table if not exists public.growth_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.growth_snapshots enable row level security;

create policy "users can read their own growth snapshot"
  on public.growth_snapshots for select
  using (auth.uid() = user_id);

create policy "users can insert their own growth snapshot"
  on public.growth_snapshots for insert
  with check (auth.uid() = user_id);

create policy "users can update their own growth snapshot"
  on public.growth_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Required for real-time cross-device updates. Run once per project.
alter publication supabase_realtime add table public.growth_snapshots;
