-- Per-user 물 1잔 기준 용량 (ml). 기존 데이터는 250ml 유지.
alter table public.profiles
  add column if not exists water_cup_ml integer not null default 250
    check (water_cup_ml >= 50 and water_cup_ml <= 1000);

comment on column public.profiles.water_cup_ml is '물 기록 1잔당 ml (예: 200, 250, 500)';
