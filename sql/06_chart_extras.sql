-- =====================================================
-- BrowChart Step 6: 고객 차트 확장 필드
-- - 알러지/디자인/컬러 태그 (jsonb 배열)
-- - 펜으로 적은 메모 그림 (base64)
-- =====================================================

alter table public.customers
  add column if not exists allergies_tags jsonb default '[]'::jsonb,
  add column if not exists design_tags jsonb default '[]'::jsonb,
  add column if not exists color_tags jsonb default '[]'::jsonb,
  add column if not exists notes_drawing text;
