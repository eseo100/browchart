-- =====================================================
-- BrowChart Step 13: 고객 자유 태그
-- (단골, 신부, 민감, 임산부 등 매장별 자유 태그)
-- =====================================================

alter table public.customers
  add column if not exists tags jsonb default '[]'::jsonb;
