-- =====================================================
-- BrowChart Step 14: 요일별 영업시간 + 휴무일
-- - business_hours: 길이 7 jsonb 배열 (일, 월, 화, 수, 목, 금, 토)
-- - closed_dates: 특정 날짜 휴무 (YYYY-MM-DD 문자열 배열)
-- =====================================================

alter table public.salons
  add column if not exists business_hours jsonb,
  add column if not exists closed_dates jsonb default '[]'::jsonb;

-- 기존 단일 open_hour/close_hour를 7일로 펼쳐서 채움
update public.salons
set business_hours = jsonb_build_array(
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false),
  jsonb_build_object('open', coalesce(open_hour, 10), 'close', coalesce(close_hour, 19), 'closed', false)
)
where business_hours is null;
