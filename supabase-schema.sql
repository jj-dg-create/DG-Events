-- ============================================================
-- DG EVENT CHECK-IN SYSTEM — SUPABASE SCHEMA
-- Run this entire file in Supabase → SQL Editor
-- ============================================================

-- ── PROFILES (extends Supabase auth.users) ────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text check (role in ('admin', 'staff')) not null default 'staff',
  full_name text,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'staff', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── EVENTS ────────────────────────────────────────────────
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  event_date date,
  location text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ── BADGE TYPES ───────────────────────────────────────────
create table if not exists public.badge_types (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  display_name text not null,        -- e.g. "VIP Row 1"
  color text not null,               -- hex, e.g. "#F59E0B"
  text_color text not null default '#000000', -- for contrast on flash screen
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── ATTENDEES ─────────────────────────────────────────────
create table if not exists public.attendees (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  badge_type_id uuid references public.badge_types(id),
  checked_in boolean default false,
  checked_in_at timestamptz,
  notes text,
  is_walkup boolean default false,
  created_at timestamptz default now()
);

-- Index for fast name search per event
create index if not exists attendees_event_id_idx on public.attendees(event_id);
create index if not exists attendees_name_idx on public.attendees(lower(first_name), lower(last_name));

-- ── ROW LEVEL SECURITY ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.badge_types enable row level security;
alter table public.attendees enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Profiles: users can read own profile, admins can read all
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or is_admin());

create policy "profiles_update_admin" on public.profiles
  for update using (is_admin());

-- Events: all authenticated users can read; only admins can write
create policy "events_select" on public.events
  for select using (auth.role() = 'authenticated');

create policy "events_insert" on public.events
  for insert with check (is_admin());

create policy "events_update" on public.events
  for update using (is_admin());

create policy "events_delete" on public.events
  for delete using (is_admin());

-- Badge types: all authenticated can read; only admins write
create policy "badge_types_select" on public.badge_types
  for select using (auth.role() = 'authenticated');

create policy "badge_types_write" on public.badge_types
  for all using (is_admin());

-- Attendees: all authenticated can read; admins can do everything;
-- staff can update check-in status only
create policy "attendees_select" on public.attendees
  for select using (auth.role() = 'authenticated');

create policy "attendees_insert" on public.attendees
  for insert with check (auth.role() = 'authenticated');  -- staff can add walk-ups

create policy "attendees_update" on public.attendees
  for update using (auth.role() = 'authenticated');  -- staff updates check-in; admin updates all

create policy "attendees_delete" on public.attendees
  for delete using (is_admin());

-- ── SETTINGS (manager PIN, etc.) ─────────────────────────────────────
create table if not exists public.settings (
  key   text primary key,
  value text not null
);

alter table public.settings enable row level security;

-- All authenticated users can read settings (needed for PIN check on iPad)
create policy "settings_select" on public.settings
  for select using (auth.role() = 'authenticated');

-- Only admins can write settings
create policy "settings_write" on public.settings
  for all using (is_admin());

-- Default manager PIN
insert into public.settings (key, value)
values ('manager_pin', '1234')
on conflict (key) do nothing;

-- ── SEED: DEFAULT BADGE TYPES FUNCTION ───────────────────
-- Call this after creating an event to add the standard DG badge types
create or replace function public.seed_default_badge_types(p_event_id uuid)
returns void as $$
begin
  insert into public.badge_types (event_id, display_name, color, text_color, sort_order)
  values
    (p_event_id, 'VIP Row 1',      '#F59E0B', '#000000', 1),
    (p_event_id, 'VIP Rows 2–5',   '#16A34A', '#FFFFFF', 2),
    (p_event_id, 'General Admission', '#1C1C1E', '#FFFFFF', 3);
end;
$$ language plpgsql security definer;

-- ── DONE ──────────────────────────────────────────────────
-- After running this file:
-- 1. Go to Supabase → Authentication → Users → Invite a user
-- 2. Then go to Table Editor → profiles → find that user → set role to 'admin'
-- 3. All other users you create will default to 'staff' role
