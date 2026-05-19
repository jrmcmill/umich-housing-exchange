create extension if not exists pgcrypto;

create table if not exists public.listings (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  price integer not null check (price > 0),
  bedrooms smallint not null check (bedrooms >= 0),
  bathrooms smallint not null check (bathrooms > 0),
  roommates_during_lease smallint not null default 0 check (roommates_during_lease >= 0),
  available_from date not null,
  available_to date not null,
  location text not null,
  neighborhood text not null,
  description text not null check (char_length(description) >= 20 and char_length(description) <= 5000),
  images text[] not null default '{}'::text[],
  contact_email text not null,
  contact_phone text,
  contact_type text not null check (contact_type in ('email', 'phone', 'link')),
  contact_value text not null,
  gender_preference text not null default 'No preference',
  amenities text[] not null default '{}'::text[],
  amenities_other text not null default '',
  utilities_included_scope text not null default 'none' check (utilities_included_scope in ('all', 'some', 'none')),
  utilities_included text[] not null default '{}'::text[],
  utilities_excluded text[] not null default '{}'::text[],
  utilities_excluded_monthly_price integer check (utilities_excluded_monthly_price >= 0),
  shared_bedroom boolean not null default false,
  shared_bathroom boolean not null default false,
  status text not null default 'published' check (status in ('published', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_to >= available_from)
);

alter table public.listings add column if not exists roommates_during_lease smallint not null default 0;
alter table public.listings add column if not exists amenities text[] not null default '{}'::text[];
alter table public.listings add column if not exists amenities_other text not null default '';
alter table public.listings add column if not exists contact_email text not null default '';
alter table public.listings add column if not exists contact_phone text;
alter table public.listings add column if not exists contact_type text not null default 'email';
alter table public.listings add column if not exists contact_value text not null default '';
alter table public.listings add column if not exists utilities_included_scope text not null default 'none';
alter table public.listings add column if not exists utilities_included text[] not null default '{}'::text[];
alter table public.listings add column if not exists utilities_excluded text[] not null default '{}'::text[];
alter table public.listings add column if not exists utilities_excluded_monthly_price integer;
alter table public.listings add column if not exists shared_bedroom boolean not null default false;
alter table public.listings add column if not exists shared_bathroom boolean not null default false;

create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_user_id_idx on public.listings (user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.listings to service_role;

alter table public.listings enable row level security;

drop policy if exists "Public can read published listings" on public.listings;
create policy "Public can read published listings"
  on public.listings
  for select
  using (status = 'published');

drop policy if exists "Authenticated users can read their own listings" on public.listings;
create policy "Authenticated users can read their own listings"
  on public.listings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can create their own listings" on public.listings;
create policy "Authenticated users can create their own listings"
  on public.listings
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and coalesce(lower(auth.jwt() ->> 'email'), '') like '%@umich.edu'
    and coalesce(lower(contact_email), '') = coalesce(lower(auth.jwt() ->> 'email'), '')
  );

create or replace function enforce_one_listing_per_user()
returns trigger as $$
begin
  if coalesce(lower(auth.jwt() ->> 'email'), '') = 'jrmcmill@umich.edu' then
    return new;
  end if;

  if exists (
    select 1
    from public.listings
    where user_id = new.user_id
  ) then
    raise exception 'Each user may only have one active listing at a time.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_one_listing_per_user_trigger on public.listings;
create trigger enforce_one_listing_per_user_trigger
  before insert on public.listings
  for each row
  execute function enforce_one_listing_per_user();

drop policy if exists "Authenticated users can update their own listings" on public.listings;
create policy "Authenticated users can update their own listings"
  on public.listings
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and coalesce(lower(auth.jwt() ->> 'email'), '') like '%@umich.edu'
  )
  with check (
    auth.uid() = user_id
    and coalesce(lower(auth.jwt() ->> 'email'), '') like '%@umich.edu'
    and coalesce(lower(contact_email), '') = coalesce(lower(auth.jwt() ->> 'email'), '')
  );

drop policy if exists "Authenticated users can delete their own listings" on public.listings;
create policy "Authenticated users can delete their own listings"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_listings_updated_at on public.listings;
create trigger update_listings_updated_at
  before update on public.listings
  for each row
  execute function update_updated_at_column();
