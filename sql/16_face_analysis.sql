-- =====================================================
-- BrowChart Step 16: 얼굴 분석 (사진+펜+얼굴형 분석)
-- minachart의 face-tab을 BrowChart에 이식
-- =====================================================

create table if not exists public.face_analyses (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  photo_url text,                    -- base64 dataURL (또는 storage path)
  drawing_url text,                  -- 사진 위에 그린 펜 그림 base64
  features jsonb default '{}'::jsonb, -- { 얼굴형: '계란형', 비율: '균형', ... }
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_face_analyses_customer
  on public.face_analyses(customer_id);
create index if not exists idx_face_analyses_salon
  on public.face_analyses(salon_id);

alter table public.face_analyses enable row level security;

drop policy if exists "owners can manage their face analyses" on public.face_analyses;
create policy "owners can manage their face analyses"
  on public.face_analyses for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

drop trigger if exists face_analyses_updated_at on public.face_analyses;
create trigger face_analyses_updated_at
  before update on public.face_analyses
  for each row execute function public.handle_updated_at();
