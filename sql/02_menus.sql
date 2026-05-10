-- =====================================================
-- BrowChart Step 2: 시술 메뉴
-- 실행: Supabase SQL Editor → New snippet → 붙여넣기 → Run
-- =====================================================

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  category text not null default 'eyebrow' check (
    category in ('eyebrow', 'lip', 'eyelash', 'retouch', 'removal', 'other')
  ),
  name text not null,
  price integer not null default 0,
  duration_minutes integer not null default 60,
  deposit_amount integer default 0,
  description text,
  precautions text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_menus_salon_id on public.menus(salon_id);
create index if not exists idx_menus_active on public.menus(salon_id, is_active);

-- RLS
alter table public.menus enable row level security;

drop policy if exists "owners can manage their menus" on public.menus;
create policy "owners can manage their menus"
  on public.menus for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

-- 손님(비로그인)이 예약 페이지에서 활성화된 메뉴 볼 수 있어야 함
drop policy if exists "public can view active menus" on public.menus;
create policy "public can view active menus"
  on public.menus for select
  to anon
  using (is_active = true);

-- updated_at 트리거
drop trigger if exists menus_updated_at on public.menus;
create trigger menus_updated_at
  before update on public.menus
  for each row execute function public.handle_updated_at();
