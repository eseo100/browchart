-- =====================================================
-- BrowChart Step 4: 시간 슬롯 충돌 체크 + 손님 본인 예약 조회
-- =====================================================

-- 1. 기존의 너무 넓은 anon SELECT 정책 제거 (손님 개인정보 노출 방지)
drop policy if exists "anon can view bookings by token" on public.bookings;

-- 2. 슬롯 충돌 체크용 view (개인정보 X, 매장/날짜/시간/소요시간만)
create or replace view public.booking_slots as
select
  b.salon_id,
  b.desired_date,
  b.desired_time,
  b.status,
  coalesce(m.duration_minutes, 60) as duration_minutes
from public.bookings b
left join public.menus m on m.id = b.menu_id
where b.status in ('pending', 'confirmed');

grant select on public.booking_slots to anon;
grant select on public.booking_slots to authenticated;

-- 3. 손님 본인 예약 조회 RPC (access_token으로만 접근)
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
  salon_slug text
)
language sql
security definer
set search_path = public
as $$
  select
    b.id, b.customer_name, b.desired_date, b.desired_time,
    b.deposit_amount, b.deposit_status, b.status,
    m.name, m.price,
    s.name, s.slug
  from public.bookings b
  left join public.menus m on m.id = b.menu_id
  left join public.salons s on s.id = b.salon_id
  where b.access_token = p_token
  limit 1
$$;

grant execute on function public.get_booking_by_token(text) to anon;
grant execute on function public.get_booking_by_token(text) to authenticated;
