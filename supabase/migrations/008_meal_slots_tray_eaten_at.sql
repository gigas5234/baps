-- 슬롯(Bucket) + 트레이(그룹) + eaten_at (언제 먹었는지). created_at은 행 삽입 시각 유지.

drop function if exists public.confirm_meal_and_optional_frequent(
  text, integer, numeric, numeric, numeric, text, integer, boolean,
  integer, numeric, numeric, numeric, text
);

create or replace function public.meal_slot_from_ts(ts timestamptz)
returns text
language sql
immutable
as $$
  select case
    when extract(hour from (ts at time zone 'Asia/Seoul')) >= 22
      or extract(hour from (ts at time zone 'Asia/Seoul')) < 5 then 'latenight'
    when extract(hour from (ts at time zone 'Asia/Seoul')) < 11 then 'breakfast'
    when extract(hour from (ts at time zone 'Asia/Seoul')) < 15 then 'lunch'
    when extract(hour from (ts at time zone 'Asia/Seoul')) < 17 then 'snack'
    when extract(hour from (ts at time zone 'Asia/Seoul')) < 22 then 'dinner'
    else 'latenight'
  end;
$$;

comment on function public.meal_slot_from_ts is
  'Asia/Seoul 시각 기준 끼니 슬롯 (breakfast|lunch|snack|dinner|latenight)';

alter table public.meals
  add column if not exists eaten_at timestamptz,
  add column if not exists meal_slot text,
  add column if not exists meal_group_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'meals_meal_slot_check'
  ) then
    alter table public.meals
      add constraint meals_meal_slot_check
      check (
        meal_slot is null
        or meal_slot in (
          'breakfast', 'lunch', 'snack', 'dinner', 'latenight'
        )
      );
  end if;
end $$;

comment on column public.meals.eaten_at is '실제 섭취 시각(로컬날짜 필터·슬롯 표시 기준)';
comment on column public.meals.meal_slot is '끼니 슬롯 — 드래그 이동 시 동기화';
comment on column public.meals.meal_group_id is '한 사진/한 끼 트레이 — 동일 ID 행을 한 카드로 묶음';

-- 백필: 기존 행은 각각 독립 트레이(meal_group_id = id)
update public.meals
set
  eaten_at = coalesce(eaten_at, created_at),
  meal_slot = coalesce(meal_slot, public.meal_slot_from_ts(coalesce(eaten_at, created_at))),
  meal_group_id = coalesce(meal_group_id, id)
where eaten_at is null
   or meal_slot is null
   or meal_group_id is null;

alter table public.meals alter column eaten_at set not null;
alter table public.meals alter column meal_slot set not null;
alter table public.meals alter column meal_group_id set not null;

create or replace function public.meals_bi_set_slot_group()
returns trigger
language plpgsql
as $$
begin
  if new.eaten_at is null then
    new.eaten_at := coalesce(new.created_at, now());
  end if;
  if new.meal_slot is null or btrim(coalesce(new.meal_slot, '')) = '' then
    new.meal_slot := public.meal_slot_from_ts(new.eaten_at);
  end if;
  if new.meal_group_id is null then
    new.meal_group_id := gen_random_uuid();
  end if;
  return new;
end;
$$;

drop trigger if exists meals_bi_set_slot_group on public.meals;
create trigger meals_bi_set_slot_group
  before insert on public.meals
  for each row
  execute procedure public.meals_bi_set_slot_group();

create index if not exists meals_user_eaten_at_idx
  on public.meals (user_id, eaten_at);

-- RLS: 업데이트(슬롯 이동)
drop policy if exists "Users can update own meals" on public.meals;
create policy "Users can update own meals"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RPC: 식사 저장 (슬롯·그룹·eaten_at 확장)
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
  p_frequent_image_url text,
  p_meal_slot text default null,
  p_meal_group_id uuid default null,
  p_eaten_at timestamptz default null
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
  v_eaten timestamptz := coalesce(p_eaten_at, now());
  v_slot text;
  v_group uuid := coalesce(p_meal_group_id, gen_random_uuid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if v_name = '' then
    raise exception 'invalid food_name';
  end if;

  v_slot := coalesce(
    nullif(trim(coalesce(p_meal_slot, '')), ''),
    public.meal_slot_from_ts(v_eaten)
  );

  insert into public.meals (
    user_id, food_name, cal, carbs, protein, fat, image_url, price_won,
    eaten_at, meal_slot, meal_group_id
  )
  values (
    v_user, v_name, p_cal, p_carbs, p_protein, p_fat,
    nullif(trim(coalesce(p_image_url, '')), ''),
    p_price_won,
    v_eaten,
    v_slot,
    v_group
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
  integer, numeric, numeric, numeric, text, text, uuid, timestamptz
) from public;

grant execute on function public.confirm_meal_and_optional_frequent(
  text, integer, numeric, numeric, numeric, text, integer, boolean,
  integer, numeric, numeric, numeric, text, text, uuid, timestamptz
) to authenticated;

comment on function public.confirm_meal_and_optional_frequent is
  'meals 1행 삽입 + 옵션 frequent; p_meal_slot·p_meal_group_id·p_eaten_at 로 트레이·슬롯·촬영시각 반영';
