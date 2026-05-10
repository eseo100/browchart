-- =====================================================
-- BrowChart Step 8: 매장 영업시간 설정
-- =====================================================

alter table public.salons
  add column if not exists open_hour integer default 10,
  add column if not exists close_hour integer default 19;
