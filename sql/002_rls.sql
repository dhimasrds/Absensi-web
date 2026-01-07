-- ====================================================
-- Milestone 1: Row Level Security (RLS) Policies
-- Attendance System Phase 1
-- ====================================================

-- ====================================================
-- HELPER FUNCTION: is_admin()
-- ====================================================

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 
    from public.profiles 
    where user_id = auth.uid() 
      and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ====================================================
-- ENABLE RLS ON ALL TABLES
-- ====================================================

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.devices enable row level security;
alter table public.face_templates enable row level security;
alter table public.mobile_sessions enable row level security;
alter table public.attendance_logs enable row level security;

-- ====================================================
-- PROFILES POLICIES
-- ====================================================

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (is_admin());

-- Admins can insert profiles
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (is_admin());

-- Admins can update profiles
create policy "Admins can update profiles"
  on public.profiles for update
  using (is_admin());

-- ====================================================
-- EMPLOYEES POLICIES
-- ====================================================

-- Admins have full access to employees
create policy "Admins can select employees"
  on public.employees for select
  using (is_admin());

create policy "Admins can insert employees"
  on public.employees for insert
  with check (is_admin());

create policy "Admins can update employees"
  on public.employees for update
  using (is_admin());

create policy "Admins can delete employees"
  on public.employees for delete
  using (is_admin());

-- ====================================================
-- DEVICES POLICIES
-- ====================================================

-- Admins have full access to devices
create policy "Admins can select devices"
  on public.devices for select
  using (is_admin());

create policy "Admins can insert devices"
  on public.devices for insert
  with check (is_admin());

create policy "Admins can update devices"
  on public.devices for update
  using (is_admin());

create policy "Admins can delete devices"
  on public.devices for delete
  using (is_admin());

-- ====================================================
-- FACE_TEMPLATES POLICIES
-- ====================================================

-- Admins have full access to face templates
create policy "Admins can select face_templates"
  on public.face_templates for select
  using (is_admin());

create policy "Admins can insert face_templates"
  on public.face_templates for insert
  with check (is_admin());

create policy "Admins can update face_templates"
  on public.face_templates for update
  using (is_admin());

create policy "Admins can delete face_templates"
  on public.face_templates for delete
  using (is_admin());

-- ====================================================
-- MOBILE_SESSIONS POLICIES
-- ====================================================

-- Admins can view all sessions
create policy "Admins can select mobile_sessions"
  on public.mobile_sessions for select
  using (is_admin());

-- Service role handles insert/update (server-side)
-- No direct user access for insert/update/delete

-- ====================================================
-- ATTENDANCE_LOGS POLICIES
-- ====================================================

-- Admins can select all attendance logs
create policy "Admins can select attendance_logs"
  on public.attendance_logs for select
  using (is_admin());

-- Insert is done via service role (server-side)
-- Mobile attendance insert goes through API with service role

-- ====================================================
-- GRANT PERMISSIONS
-- ====================================================

-- Grant usage on schema
grant usage on schema public to anon, authenticated;

-- Grant select/insert/update/delete on tables to authenticated users
-- (RLS will enforce actual permissions)
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, update, delete on public.face_templates to authenticated;
grant select on public.mobile_sessions to authenticated;
grant select on public.attendance_logs to authenticated;

-- Grant sequence usage
grant usage on all sequences in schema public to authenticated;
