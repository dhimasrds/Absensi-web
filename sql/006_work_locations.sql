-- ====================================================
-- Work Locations Schema
-- Attendance System Phase 1 - Location Feature
-- ====================================================

-- ====================================================
-- TABLES
-- ====================================================

-- work_locations: Office/work locations for geofencing
create table public.work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 500, -- Default 500 meters
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ====================================================
-- ADD WORK LOCATION TO EMPLOYEES
-- ====================================================

-- Add work_location_id column to employees
alter table public.employees 
  add column work_location_id uuid references public.work_locations(id) on delete set null;

-- ====================================================
-- INDEXES
-- ====================================================

-- Work locations indexes
create index idx_work_locations_is_active on public.work_locations(is_active);
create index idx_work_locations_name on public.work_locations(name);

-- Employee work location index
create index idx_employees_work_location on public.employees(work_location_id);

-- ====================================================
-- TRIGGERS
-- ====================================================

create trigger set_work_locations_updated_at
  before update on public.work_locations
  for each row execute function public.handle_updated_at();

-- ====================================================
-- RLS POLICIES
-- ====================================================

-- Enable RLS
alter table public.work_locations enable row level security;

-- Admin can read all work locations
create policy "Admin can read work_locations"
  on public.work_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin can insert work locations
create policy "Admin can insert work_locations"
  on public.work_locations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin can update work locations
create policy "Admin can update work_locations"
  on public.work_locations for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admin can delete work locations
create policy "Admin can delete work_locations"
  on public.work_locations for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );
