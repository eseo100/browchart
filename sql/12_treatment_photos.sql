-- =====================================================
-- BrowChart Step 12: 시술 사진 (전/후/진행)
-- - treatment_photos 테이블
-- - Storage bucket 'treatment-photos' (private)
-- - 경로: {salon_id}/{customer_id}/{file}
-- =====================================================

-- 1. 사진 메타데이터 테이블
create table if not exists public.treatment_photos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  booking_id uuid references public.bookings(id) on delete set null,

  kind text not null default 'progress' check (
    kind in ('before', 'after', 'progress')
  ),
  storage_path text not null,
  notes text,
  taken_at timestamptz default now(),

  created_at timestamptz default now()
);

create index if not exists idx_treatment_photos_customer
  on public.treatment_photos(customer_id);
create index if not exists idx_treatment_photos_booking
  on public.treatment_photos(booking_id);
create index if not exists idx_treatment_photos_salon
  on public.treatment_photos(salon_id);

alter table public.treatment_photos enable row level security;

drop policy if exists "Owners can manage their treatment photos"
  on public.treatment_photos;
create policy "Owners can manage their treatment photos"
  on public.treatment_photos for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );

-- 2. Storage 버킷 생성 (private)
insert into storage.buckets (id, name, public)
values ('treatment-photos', 'treatment-photos', false)
on conflict (id) do nothing;

-- 3. Storage 정책 — 경로 첫 폴더가 매장 ID
drop policy if exists "Owners can upload to their salon folder" on storage.objects;
create policy "Owners can upload to their salon folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'treatment-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.salons where owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can view their salon photos" on storage.objects;
create policy "Owners can view their salon photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'treatment-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.salons where owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete their salon photos" on storage.objects;
create policy "Owners can delete their salon photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'treatment-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.salons where owner_id = auth.uid()
    )
  );
