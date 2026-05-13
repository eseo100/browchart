-- =====================================================
-- BrowChart Step 17: 매장별 입금 계좌 정보
-- 손님 예약완료 페이지에 표시할 계좌 안내
-- =====================================================

alter table public.salons
  add column if not exists bank_name text,
  add column if not exists account_number text,
  add column if not exists account_holder text;

-- get_booking_by_token RPC에 계좌 정보 추가 (anon이 손님 본인 예약 조회 시)
drop function if exists public.get_booking_by_token(text);

create or replace function public.get_booking_by_token(p_token text)
returns table (
  id uuid,
  customer_name text,
  desired_date date,
  desired_time time,
  deposit_amount integer,
  deposit_status text,
  status text,
  menu_name text,
  menu_price integer,
  salon_name text,
  salon_slug text,
  bank_name text,
  account_number text,
  account_holder text
)
language sql
security definer
set search_path = public
as $$
  select
    b.id, b.customer_name, b.desired_date, b.desired_time,
    b.deposit_amount, b.deposit_status, b.status,
    m.name, m.price,
    s.name, s.slug,
    s.bank_name, s.account_number, s.account_holder
  from public.bookings b
  left join public.menus m on m.id = b.menu_id
  left join public.salons s on s.id = b.salon_id
  where b.access_token = p_token
  limit 1
$$;

grant execute on function public.get_booking_by_token(text) to anon;
grant execute on function public.get_booking_by_token(text) to authenticated;
