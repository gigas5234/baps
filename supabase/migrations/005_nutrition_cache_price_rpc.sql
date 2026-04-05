-- 공용 영양 캐시 (텍스트 분석 Gemini 호출 절감)
create table if not exists public.nutrition_dictionary (
  id uuid primary key default gen_random_uuid(),
  normalized_key text not null unique,
  food_name_display text not null,
  cal integer not null,
  carbs numeric(6,1) not null,
  protein numeric(6,1) not null,
  fat numeric(6,1) not null,
  source text not null default 'gemini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_dictionary_key_idx
  on public.nutrition_dictionary (normalized_key);

alter table public.nutrition_dictionary enable row level security;

create policy "Authenticated read nutrition_dictionary"
  on public.nutrition_dictionary for select
  to authenticated
  using (true);

create policy "Authenticated insert nutrition_dictionary"
  on public.nutrition_dictionary for insert
  to authenticated
  with check (true);

create policy "Authenticated update nutrition_dictionary"
  on public.nutrition_dictionary for update
  to authenticated
  using (true);

comment on table public.nutrition_dictionary is '음식명 정규화 키 → 영양 추정 캐시 (Gemini/시드 등)';

-- 식사 단가(선택): 가성비 코치 등에 사용
alter table public.meals
  add column if not exists price_won integer;

comment on column public.meals.price_won is '선택: 해당 끼니 식비(원)';

-- 식사 저장 + 자주 먹는 메뉴 업서트를 한 트랜잭션으로
-- SECURITY DEFINER: search_path 고정으로 search path injection 완화
create or replace function public.confirm_meal_and_optional_frequent(
  p_food_name text,
  p_cal integer,
  p_carbs numeric,
  p_protein numeric,
  p_fat numeric,
  p_image_url text,
  p_price_won integer,
  p_save_frequent boolean,
  p_frequent_cal integer,
  p_frequent_carbs numeric,
  p_frequent_protein numeric,
  p_frequent_fat numeric,
  p_frequent_image_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_user uuid := auth.uid();
  v_name text := trim(p_food_name);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if v_name = '' then
    raise exception 'invalid food_name';
  end if;

  insert into public.meals (
    user_id, food_name, cal, carbs, protein, fat, image_url, price_won
  )
  values (
    v_user, v_name, p_cal, p_carbs, p_protein, p_fat,
    nullif(trim(coalesce(p_image_url, '')), ''),
    p_price_won
  )
  returning id into v_meal_id;

  if p_save_frequent then
    insert into public.frequent_meals (
      user_id, food_name, cal, carbs, protein, fat, image_url, count, last_eaten_at
    )
    values (
      v_user,
      v_name,
      p_frequent_cal,
      p_frequent_carbs,
      p_frequent_protein,
      p_frequent_fat,
      nullif(trim(coalesce(p_frequent_image_url, p_image_url, '')), ''),
      1,
      now()
    )
    on conflict (user_id, food_name) do update set
      cal = excluded.cal,
      carbs = excluded.carbs,
      protein = excluded.protein,
      fat = excluded.fat,
      image_url = excluded.image_url,
      count = public.frequent_meals.count + 1,
      last_eaten_at = now();
  end if;

  return v_meal_id;
end;
$$;

revoke all on function public.confirm_meal_and_optional_frequent(
  text, integer, numeric, numeric, numeric, text, integer, boolean,
  integer, numeric, numeric, numeric, text
) from public;

grant execute on function public.confirm_meal_and_optional_frequent(
  text, integer, numeric, numeric, numeric, text, integer, boolean,
  integer, numeric, numeric, numeric, text
) to authenticated;

comment on function public.confirm_meal_and_optional_frequent is
  'meals 1행 삽입 후 옵션으로 frequent_meals 업서트 (원자적)';

insert into public.nutrition_dictionary (
  normalized_key, food_name_display, cal, carbs, protein, fat, source
)
values
  ('사과 1개', '사과 1개', 95, 25.0, 0.5, 0.3, 'seed'),
  ('바나나 1개', '바나나 1개', 89, 22.8, 1.1, 0.3, 'seed'),
  ('계란 1개', '계란(달걀) 1개', 72, 0.4, 6.3, 5.0, 'seed'),
  ('밥 1공기', '밥 1공기', 310, 69.0, 5.5, 0.4, 'seed')
on conflict (normalized_key) do nothing;
