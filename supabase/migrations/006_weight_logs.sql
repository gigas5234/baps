-- 일자별 체중 로그 (기기 간 동기화) + 프로필 체중 원자 갱신
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  kg numeric(5,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date),
  constraint weight_logs_kg_range check (kg > 0 and kg < 500)
);

create index if not exists weight_logs_user_date_idx
  on public.weight_logs (user_id, date desc);

alter table public.weight_logs enable row level security;

create policy "Users can read own weight logs"
  on public.weight_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own weight logs"
  on public.weight_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weight logs"
  on public.weight_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own weight logs"
  on public.weight_logs for delete
  using (auth.uid() = user_id);

comment on table public.weight_logs is '일자당 1행 체중 기록 (추이/코칭용)';

-- weight_logs 업서트 + profiles.weight 동기화 (한 트랜잭션)
-- SECURITY DEFINER: search_path 고정
create or replace function public.upsert_weight_log_and_profile(
  p_date date,
  p_kg numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_date is null then
    raise exception 'invalid date';
  end if;
  if p_kg is null or p_kg <= 0 or p_kg >= 500 then
    raise exception 'invalid kg';
  end if;

  insert into public.weight_logs (user_id, date, kg)
  values (v_user, p_date, round(p_kg::numeric, 1))
  on conflict (user_id, date) do update set
    kg = excluded.kg,
    updated_at = now()
  returning id into v_id;

  update public.profiles
  set
    weight = round(p_kg::numeric, 1),
    updated_at = now()
  where id = v_user;

  return v_id;
end;
$$;

revoke all on function public.upsert_weight_log_and_profile(date, numeric) from public;

grant execute on function public.upsert_weight_log_and_profile(date, numeric) to authenticated;

comment on function public.upsert_weight_log_and_profile is
  'weight_logs 업서트 후 profiles.weight 갱신 (원자적)';
