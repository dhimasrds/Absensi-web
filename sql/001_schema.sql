-- ====================================================
-- Milestone 1: Database Schema
-- Attendance System Phase 1
-- ====================================================

-- Enable pgvector extension for face embeddings
create extension if not exists vector;

-- ====================================================
-- ENUMS
-- ====================================================

-- Attendance type enum
create type attendance_type as enum ('CHECK_IN', 'CHECK_OUT');

-- Attendance source enum
create type attendance_source as enum ('WEB_ADMIN', 'ANDROID');

-- Verification method enum
create type verification_method as enum ('FACE', 'MANUAL_ADMIN');

-- Verification status enum
create type verification_status as enum ('VERIFIED', 'PENDING', 'REJECTED');

-- ====================================================
-- TABLES
-- ====================================================

-- 1) profiles: Admin users linked to auth.users
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) employees: Company employees
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_id text unique not null,
  full_name text not null,
  email text unique,
  phone_number text,
  job_title text,
  department text,
  work_location_id uuid references public.work_locations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) devices: Whitelisted Android devices
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) face_templates: Face embeddings for employees
create table public.face_templates (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid unique not null references public.employees(id) on delete cascade,
  template_version int not null default 1,
  embedding vector(128) not null, -- 128-dimensional face embedding
  is_active boolean not null default true,
  quality_score float,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) mobile_sessions: Active mobile sessions for employees
create table public.mobile_sessions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  refresh_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6) attendance_logs: Attendance records
create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type attendance_type not null,
  timestamp timestamptz not null,
  source attendance_source not null,
  device_id text, -- device_id string from request (not FK)
  client_capture_id text,
  captured_at timestamptz,
  verification_method verification_method not null default 'FACE',
  verification_status verification_status not null default 'VERIFIED',
  match_score float,
  liveness_score float,
  note text,
  proof_image_path text,
  proof_image_mime text,
  created_at timestamptz not null default now()
);

-- ====================================================
-- INDEXES
-- ====================================================

-- Employees indexes
create index idx_employees_employee_id on public.employees(employee_id);
create index idx_employees_is_active on public.employees(is_active);
create index idx_employees_full_name on public.employees(full_name);

-- Devices indexes
create index idx_devices_device_id on public.devices(device_id);
create index idx_devices_is_active on public.devices(is_active);

-- Face templates indexes
create index idx_face_templates_employee_id on public.face_templates(employee_id);
create index idx_face_templates_is_active on public.face_templates(is_active);

-- Mobile sessions indexes
create index idx_mobile_sessions_employee_id on public.mobile_sessions(employee_id);
create index idx_mobile_sessions_device_id on public.mobile_sessions(device_id);
create index idx_mobile_sessions_expires_at on public.mobile_sessions(expires_at);

-- Attendance logs indexes
create index idx_attendance_employee_ts on public.attendance_logs(employee_id, timestamp desc);
create index idx_attendance_type on public.attendance_logs(type);
create index idx_attendance_source on public.attendance_logs(source);
create index idx_attendance_timestamp on public.attendance_logs(timestamp desc);

-- Unique constraint for idempotency: (device_id, client_capture_id)
create unique index idx_attendance_idempotency 
  on public.attendance_logs(device_id, client_capture_id) 
  where device_id is not null and client_capture_id is not null;

-- ====================================================
-- TRIGGERS: Auto-update updated_at
-- ====================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_employees_updated_at
  before update on public.employees
  for each row execute function public.handle_updated_at();

create trigger set_devices_updated_at
  before update on public.devices
  for each row execute function public.handle_updated_at();

create trigger set_face_templates_updated_at
  before update on public.face_templates
  for each row execute function public.handle_updated_at();
