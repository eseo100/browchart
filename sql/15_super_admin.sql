-- =====================================================
-- BrowChart Step 15: SaaS 관리자(super_admin) 권한
-- 미나님이 모든 매장을 통합 관리할 수 있게
-- =====================================================

-- 1. 헬퍼 함수 (RLS에서 사용)
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;

-- 2. salons: 본인 매장 외에 super_admin은 모든 매장 조회
drop policy if exists "super admin can view all salons" on public.salons;
create policy "super admin can view all salons"
  on public.salons for select
  using (public.is_super_admin());

-- 3. profiles: super_admin은 모든 프로필 조회
drop policy if exists "super admin can view all profiles" on public.profiles;
create policy "super admin can view all profiles"
  on public.profiles for select
  using (public.is_super_admin());

-- 4. bookings: 통계용
drop policy if exists "super admin can view all bookings" on public.bookings;
create policy "super admin can view all bookings"
  on public.bookings for select
  using (public.is_super_admin());

-- 5. customers
drop policy if exists "super admin can view all customers" on public.customers;
create policy "super admin can view all customers"
  on public.customers for select
  using (public.is_super_admin());

-- 6. consents
drop policy if exists "super admin can view all consents" on public.consents;
create policy "super admin can view all consents"
  on public.consents for select
  using (public.is_super_admin());

-- 7. 미나님 계정을 super_admin으로 지정
-- ⚠️ 본인 이메일이 다르면 아래 이메일을 바꿔서 실행
update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users where email = 'jangmina7@naver.com'
);
