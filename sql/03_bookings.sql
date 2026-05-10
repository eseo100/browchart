-- =====================================================
-- BrowChart Step 3: 예약 테이블
-- 실행: Supabase SQL Editor → New snippet → 붙여넣기 → Run
-- =====================================================

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  menu_id uuid references public.menus(id) on delete set null,

  -- 손님 정보 (비로그인 예약)
  customer_name text not null,
  customer_phone text not null,
  customer_email text,

  -- 상담 내용 (시술 경험, 알러지 등 — 유연하게)
  consultation jsonb default '{}'::jsonb,

  -- 희망 일시
  desired_date date,
  desired_time time,
  customer_memo text,

  -- 예약 상태
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),

  -- 예약금 (계좌입금형으로 시작, PG 필드 미리 열어둠)
  deposit_amount integer default 0,
  deposit_status text default 'unpaid' check (
    deposit_status in ('unpaid', 'paid', 'refunded', 'waived')
  ),
  payment_method text default 'bank_transfer' check (
    payment_method in ('bank_transfer', 'pg', 'onsite', 'waived')
  ),
  pg_payment_id text,

  -- 동의서 (지금은 구조만, 추후 모듈형 동의서 시스템 연결)
  consent_signed boolean default false,
  consent_data jsonb,

  -- 메시지 채널 (SMS 우선, 알림톡 추후)
  message_channel text default 'sms' check (
    message_channel in ('sms', 'kakao_alimtalk', 'none')
  ),

  -- 손님 마이페이지용 토큰 (회원가입 없이 본인 예약 확인)
  access_token text unique not null default encode(gen_random_bytes(16), 'hex'),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_bookings_salon_id on public.bookings(salon_id);
create index if not exists idx_bookings_status on public.bookings(salon_id, status);
create index if not exists idx_bookings_desired_date on public.bookings(salon_id, desired_date);
create index if not exists idx_bookings_phone on public.bookings(salon_id, customer_phone);
create index if not exists idx_bookings_token on public.bookings(access_token);

-- =====================================================
-- RLS
-- =====================================================
alter table public.bookings enable row level security;

-- 원장: 본인 매장 예약만 다 볼 수 있음
drop policy if exists "owners can view their bookings" on public.bookings;
create policy "owners can view their bookings"
  on public.bookings for select
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

drop policy if exists "owners can update their bookings" on public.bookings;
create policy "owners can update their bookings"
  on public.bookings for update
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

drop policy if exists "owners can delete their bookings" on public.bookings;
create policy "owners can delete their bookings"
  on public.bookings for delete
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

-- 손님(비로그인): 예약 신청(insert)만 가능, 조회/수정 불가
-- 마이페이지 조회는 access_token으로 별도 처리 (RPC 또는 next API)
drop policy if exists "anon can create bookings" on public.bookings;
create policy "anon can create bookings"
  on public.bookings for insert
  to anon
  with check (true);

-- updated_at 트리거
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.handle_updated_at();
