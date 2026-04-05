-- BAPS Initial Schema

-- Profiles (with body data for BMR calculation)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null default '',
  height numeric(5,1),        -- cm
  weight numeric(5,1),        -- kg
  age integer,
  gender text check (gender in ('male', 'female')),
  bmr integer not null default 0,
  target_cal integer not null default 0,
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Meals
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  food_name text not null,
  cal integer not null default 0,
  carbs numeric(6,1) not null default 0,
  protein numeric(6,1) not null default 0,
  fat numeric(6,1) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "Users can read own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can insert own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own meals"
  on public.meals for delete
  using (auth.uid() = user_id);

-- Water Logs (cup-based, 1 cup = 250ml)
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cups integer not null default 0,
  date date not null,
  unique(user_id, date)
);

alter table public.water_logs enable row level security;

create policy "Users can read own water logs"
  on public.water_logs for select
  using (auth.uid() = user_id);

create policy "Users can upsert own water logs"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own water logs"
  on public.water_logs for update
  using (auth.uid() = user_id);

-- Daily Logs
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  total_cal integer not null default 0,
  is_success boolean not null default false,
  ai_fact_summary text,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table public.daily_logs enable row level security;

create policy "Users can read own daily logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can upsert own daily logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily logs"
  on public.daily_logs for update
  using (auth.uid() = user_id);

-- Chats
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chats enable row level security;

create policy "Users can read own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

-- Indexes
create index meals_user_date_idx on public.meals (user_id, created_at);
create index water_logs_user_date_idx on public.water_logs (user_id, date);
create index daily_logs_user_date_idx on public.daily_logs (user_id, date);
create index chats_user_date_idx on public.chats (user_id, created_at);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
