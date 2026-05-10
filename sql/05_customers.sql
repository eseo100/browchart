-- =====================================================
-- BrowChart Step 5: 고객 차트
-- 예약(bookings)에 들어있는 손님 정보를 별도 customers 테이블로 정리
-- 폰번호 = 매장 내 손님 식별자 (회원가입 X)
-- =====================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,

  -- 식별자
  phone text not null,
  name text,
  email text,
  birth_date date,

  -- 차트 정보 (시술자가 적는 메모)
  skin_type text,           -- 건성/지성/복합/민감 등 자유텍스트
  allergies text,           -- 알러지/특이사항
  preferred_design text,    -- 선호 디자인/컬러
  notes text,               -- 자유 메모

  -- 통계 (트리거로 자동 갱신)
  total_visits integer default 0,
  last_visit_at timestamptz,
  next_retouch_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (salon_id, phone)
);

create index if not exists idx_customers_salon on public.customers(salon_id);
create index if not exists idx_customers_phone on public.customers(salon_id, phone);
create index if not exists idx_customers_retouch on public.customers(salon_id, next_retouch_date);

-- RLS
alter table public.customers enable row level security;

drop policy if exists "owners can manage their customers" on public.customers;
create policy "owners can manage their customers"
  on public.customers for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

-- updated_at 트리거
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.handle_updated_at();

-- =====================================================
-- 트리거 1: 예약 생성될 때 customer 자동 upsert
-- =====================================================
create or replace function public.upsert_customer_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (salon_id, phone, name, email)
  values (new.salon_id, new.customer_phone, new.customer_name, new.customer_email)
  on conflict (salon_id, phone) do update
    set name = coalesce(excluded.name, customers.name),
        email = coalesce(excluded.email, customers.email),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists booking_creates_customer on public.bookings;
create trigger booking_creates_customer
  after insert on public.bookings
  for each row execute function public.upsert_customer_from_booking();

-- =====================================================
-- 트리거 2: 예약 status가 completed로 바뀌면 통계 갱신
-- last_visit_at 업데이트 + next_retouch_date 자동 계산 (5주 후, 추후 메뉴별 설정 가능)
-- =====================================================
create or replace function public.update_customer_stats_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_date timestamptz;
begin
  if new.status = 'completed' and (old.status is null or old.status <> 'completed') then
    visit_date := coalesce(
      (new.desired_date::timestamptz + coalesce(new.desired_time, '00:00')::time),
      now()
    );

    update public.customers
    set total_visits = total_visits + 1,
        last_visit_at = visit_date,
        next_retouch_date = coalesce(new.desired_date, current_date) + 35,
        updated_at = now()
    where salon_id = new.salon_id and phone = new.customer_phone;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_completed_updates_stats on public.bookings;
create trigger booking_completed_updates_stats
  after update on public.bookings
  for each row execute function public.update_customer_stats_on_completion();

-- =====================================================
-- 기존 bookings에서 customer 백필 (이미 들어온 예약들 정리)
-- =====================================================
insert into public.customers (salon_id, phone, name, email)
select distinct on (salon_id, customer_phone)
  salon_id, customer_phone, customer_name, customer_email
from public.bookings
order by salon_id, customer_phone, created_at desc
on conflict (salon_id, phone) do nothing;

-- 기존 completed 예약을 통계에 반영
update public.customers c
set total_visits = sub.cnt,
    last_visit_at = sub.last_at,
    next_retouch_date = (sub.last_date + 35)::date
from (
  select salon_id, customer_phone,
    count(*) as cnt,
    max(coalesce(desired_date::timestamptz, created_at)) as last_at,
    max(coalesce(desired_date, current_date)) as last_date
  from public.bookings
  where status = 'completed'
  group by salon_id, customer_phone
) sub
where c.salon_id = sub.salon_id and c.phone = sub.customer_phone;
