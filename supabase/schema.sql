create extension if not exists pgcrypto;

create table if not exists public.listings (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  price integer not null check (price > 0),
  bedrooms smallint not null check (bedrooms >= 0),
  bathrooms smallint not null check (bathrooms > 0),
  available_from date not null,
  available_to date not null,
  location text not null,
  neighborhood text not null,
  description text not null check (char_length(description) >= 20),
  images text[] not null default '{}'::text[],
  contact_type text not null check (contact_type in ('email', 'phone', 'link')),
  contact_value text not null,
  gender_preference text not null default 'No preference',
  status text not null default 'published' check (status in ('published', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_to >= available_from)
);

create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_user_id_idx on public.listings (user_id);

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
  );

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
  );

drop policy if exists "Authenticated users can delete their own listings" on public.listings;
create policy "Authenticated users can delete their own listings"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = user_id);
