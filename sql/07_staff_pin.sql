-- =====================================================
-- BrowChart Step 7: 직원 PIN (고객 모드 빠져나올 때 사용)
-- =====================================================

alter table public.salons
  add column if not exists staff_pin text;
