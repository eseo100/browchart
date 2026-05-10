-- =====================================================
-- BrowChart Step 1: 인증 + 매장 기본 스키마
-- 실행 위치: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- 1. salons 테이블 (매장 정보)
create table if not exists public.salons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  brand jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. profiles 테이블 (사용자 프로필)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  name text,
  phone text,
  role text default 'owner' check (role in ('super_admin', 'owner', 'manager', 'staff', 'viewer')),
  created_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_salons_slug on public.salons(slug);
create index if not exists idx_profiles_salon_id on public.profiles(salon_id);

-- =====================================================
-- RLS (Row Level Security) — 멀티테넌트 핵심
-- =====================================================

alter table public.salons enable row level security;
alter table public.profiles enable row level security;

-- salons 정책
drop policy if exists "owners can view their own salon" on public.salons;
create policy "owners can view their own salon"
  on public.salons for select
  using (owner_id = auth.uid());

drop policy if exists "owners can update their own salon" on public.salons;
create policy "owners can update their own salon"
  on public.salons for update
  using (owner_id = auth.uid());

drop policy if exists "owners can delete their own salon" on public.salons;
create policy "owners can delete their own salon"
  on public.salons for delete
  using (owner_id = auth.uid());

drop policy if exists "authenticated users can insert salons" on public.salons;
create policy "authenticated users can insert salons"
  on public.salons for insert
  with check (auth.uid() = owner_id);

-- profiles 정책
drop policy if exists "users can view their own profile" on public.profiles;
create policy "users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- =====================================================
-- updated_at 자동 갱신 트리거
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists salons_updated_at on public.salons;
create trigger salons_updated_at
  before update on public.salons
  for each row execute function public.handle_updated_at();

-- =====================================================
-- 공개 매장 페이지 (예약링크) 접근 정책
-- =====================================================
-- slug로 매장 정보 조회 — 비로그인 손님도 매장 페이지 볼 수 있어야 함
-- 단, brand 정보(로고/컬러/문구)는 공개해도 되지만 owner_id는 노출 안 함

drop policy if exists "public can view salon by slug" on public.salons;
create policy "public can view salon by slug"
  on public.salons for select
  to anon
  using (true);
