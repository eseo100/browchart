-- =====================================================
-- BrowChart Step 10: 고객 모드 펜 그림 (알러지/디자인 메모)
-- =====================================================

alter table public.customers
  add column if not exists allergies_drawing text,
  add column if not exists design_drawing text;
