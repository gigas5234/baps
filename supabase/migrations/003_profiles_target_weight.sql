-- 목표 체중 (차트 기준선·개인정보)
alter table public.profiles
  add column if not exists target_weight numeric(5,1);

comment on column public.profiles.target_weight is '목표 몸무게 kg (선택)';
