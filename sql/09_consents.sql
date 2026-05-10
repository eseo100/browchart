-- =====================================================
-- BrowChart Step 9: 동의서 (전자서명)
-- =====================================================

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete cascade not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,

  template_key text,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  agreements jsonb not null default '[]'::jsonb,

  signature text not null,
  signed_name text not null,
  signed_at timestamptz default now(),

  created_at timestamptz default now()
);

create index if not exists idx_consents_salon on public.consents(salon_id);
create index if not exists idx_consents_booking on public.consents(booking_id);
create index if not exists idx_consents_customer on public.consents(customer_id);

alter table public.consents enable row level security;

drop policy if exists "owners can manage their consents" on public.consents;
create policy "owners can manage their consents"
  on public.consents for all
  using (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  )
  with check (
    salon_id in (select id from public.salons where owner_id = auth.uid())
  );
