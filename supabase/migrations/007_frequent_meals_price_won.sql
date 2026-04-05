-- 자주 먹는 식단: 대표 식비(퀵 로그 시 끼니 식비 기본값)
alter table public.frequent_meals
  add column if not exists price_won integer;

comment on column public.frequent_meals.price_won is '대표 식비(원, 선택) — 퀵 로그 기록 시 meals.price_won 기본값';
