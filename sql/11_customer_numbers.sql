-- =====================================================
-- BrowChart Step 11: 고객번호 (매장별 등록 순서대로 자동 부여)
-- 동명이인 구분용. 검색용도는 아님 (검색은 이름/전화번호로)
-- =====================================================

alter table public.customers
  add column if not exists customer_number integer;

-- 기존 고객들 등록 순서대로 번호 백필
with numbered as (
  select id, salon_id,
    row_number() over (partition by salon_id order by created_at, id) as num
  from public.customers
)
update public.customers c
set customer_number = numbered.num
from numbered
where c.id = numbered.id and c.customer_number is null;

-- 새 고객 insert 시 자동 부여
create or replace function public.assign_customer_number()
returns trigger
language plpgsql
as $$
begin
  if new.customer_number is null then
    select coalesce(max(customer_number), 0) + 1
    into new.customer_number
    from public.customers
    where salon_id = new.salon_id;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_assign_number on public.customers;
create trigger customers_assign_number
  before insert on public.customers
  for each row execute function public.assign_customer_number();
