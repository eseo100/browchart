-- =====================================================
-- BrowChart Step 18: 간단 매출 입력 (예약과 별개의 수기 매출)
-- 워크인, 현금시술 등 예약 안 거치고 들어온 매출 기록용
-- =====================================================

create table if not exists public.quick_sales (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  date date not null,
  customer_name text,
  menu_name text not null,
  amount integer not null check (amount >= 0),
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_quick_sales_salon_date
  on public.quick_sales(salon_id, date);

alter table public.quick_sales enable row level security;

drop policy if exists "owners can manage their quick sales" on public.quick_sales;
create policy "owners can manage their quick sales"
  on public.quick_sales for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

drop trigger if exists quick_sales_updated_at on public.quick_sales;
create trigger quick_sales_updated_at
  before update on public.quick_sales
  for each row execute function public.handle_updated_at();
