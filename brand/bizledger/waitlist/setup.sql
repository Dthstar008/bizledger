-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run on a fresh project OR on a table you already created earlier:
-- it creates the table if missing, then adds the newer columns if missing.
-- The public site can ONLY insert rows (cannot read, edit or delete).
-- You read the sign-ups yourself in Supabase: Table Editor -> waitlist.

create table if not exists public.waitlist (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  name          text not null check (char_length(name) between 1 and 120),
  phone         text not null check (phone ~ '^[0-9]{10,15}$'),
  email         text check (email is null or char_length(email) <= 200),
  business_type text not null check (char_length(business_type) <= 80),
  pain_point    text check (pain_point is null or char_length(pain_point) <= 500),
  constraint waitlist_phone_unique unique (phone)
);

-- Added later: business details. Nullable so existing rows stay valid.
alter table public.waitlist
  add column if not exists business_name        text,
  add column if not exists business_location    text,
  add column if not exists has_physical_location boolean,
  add column if not exists address              text;

alter table public.waitlist drop constraint if exists waitlist_business_name_len;
alter table public.waitlist add  constraint waitlist_business_name_len
  check (business_name is null or char_length(business_name) between 1 and 150);

alter table public.waitlist drop constraint if exists waitlist_business_location_len;
alter table public.waitlist add  constraint waitlist_business_location_len
  check (business_location is null or char_length(business_location) between 1 and 150);

alter table public.waitlist drop constraint if exists waitlist_address_len;
alter table public.waitlist add  constraint waitlist_address_len
  check (address is null or char_length(address) <= 300);

-- A physical location must come with an address; no location means no address.
alter table public.waitlist drop constraint if exists waitlist_address_matches_physical;
alter table public.waitlist add  constraint waitlist_address_matches_physical
  check (has_physical_location is distinct from true or address is not null);

alter table public.waitlist enable row level security;

drop policy if exists "anyone can join waitlist" on public.waitlist;
create policy "anyone can join waitlist"
  on public.waitlist for insert
  to anon
  with check (true);

-- No select/update/delete policy for anon on purpose: sign-ups stay private.
grant insert on public.waitlist to anon;
