-- 자주 먹는 식단 (Quick Log / 감시 리스트)
create table public.frequent_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  food_name text not null,
  cal integer not null default 0,
  carbs numeric(6,1) not null default 0,
  protein numeric(6,1) not null default 0,
  fat numeric(6,1) not null default 0,
  image_url text,
  count integer not null default 1,
  last_eaten_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, food_name)
);

create index frequent_meals_user_count_idx
  on public.frequent_meals (user_id, count desc);

alter table public.frequent_meals enable row level security;

create policy "Users can read own frequent_meals"
  on public.frequent_meals for select
  using (auth.uid() = user_id);

create policy "Users can insert own frequent_meals"
  on public.frequent_meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own frequent_meals"
  on public.frequent_meals for update
  using (auth.uid() = user_id);

create policy "Users can delete own frequent_meals"
  on public.frequent_meals for delete
  using (auth.uid() = user_id);

comment on table public.frequent_meals is '자주 먹는 메뉴 스냅샷·빈도 (Quick Log)';
