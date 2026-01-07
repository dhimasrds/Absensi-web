-- ====================================================
-- Milestone 1: RPC Face Identify Function
-- Attendance System Phase 1
-- ====================================================

-- ====================================================
-- FACE IDENTIFY RPC
-- Uses cosine similarity: score = 1 - cosine_distance
-- Returns employees with score >= threshold, ordered by score desc
-- ====================================================

create or replace function public.face_identify_v1(
  query_embedding vector(128),
  match_threshold float default 0.80,
  match_count int default 1
)
returns table (
  employee_id uuid,
  score float
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    ft.employee_id,
    (1 - (ft.embedding <=> query_embedding))::float as score
  from public.face_templates ft
  inner join public.employees e on e.id = ft.employee_id
  where ft.is_active = true
    and e.is_active = true
    and (1 - (ft.embedding <=> query_embedding)) >= match_threshold
  order by score desc
  limit match_count;
end;
$$;

-- Grant execute to service role and authenticated users
grant execute on function public.face_identify_v1(vector(128), float, int) to authenticated;
grant execute on function public.face_identify_v1(vector(128), float, int) to service_role;

-- ====================================================
-- HELPER: Get employee by ID with active check
-- ====================================================

create or replace function public.get_active_employee(p_employee_id uuid)
returns table (
  id uuid,
  employee_id text,
  full_name text,
  email text,
  department text
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    e.id,
    e.employee_id,
    e.full_name,
    e.email,
    e.department
  from public.employees e
  where e.id = p_employee_id
    and e.is_active = true;
end;
$$;

grant execute on function public.get_active_employee(uuid) to authenticated;
grant execute on function public.get_active_employee(uuid) to service_role;

-- ====================================================
-- HELPER: Check if device is active
-- ====================================================

create or replace function public.is_device_active(p_device_id text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 
    from public.devices 
    where device_id = p_device_id 
      and is_active = true
  );
end;
$$;

grant execute on function public.is_device_active(text) to authenticated;
grant execute on function public.is_device_active(text) to service_role;

-- ====================================================
-- HELPER: Get device UUID by device_id string
-- ====================================================

create or replace function public.get_device_uuid(p_device_id text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_uuid uuid;
begin
  select id into v_uuid
  from public.devices
  where device_id = p_device_id
    and is_active = true;
  return v_uuid;
end;
$$;

grant execute on function public.get_device_uuid(text) to authenticated;
grant execute on function public.get_device_uuid(text) to service_role;

-- ====================================================
-- HELPER: Check for open attendance session (CHECK_IN without CHECK_OUT)
-- ====================================================

create or replace function public.has_open_attendance_session(p_employee_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_last_type attendance_type;
begin
  select type into v_last_type
  from public.attendance_logs
  where employee_id = p_employee_id
  order by timestamp desc
  limit 1;
  
  -- If no records or last was CHECK_OUT, no open session
  if v_last_type is null or v_last_type = 'CHECK_OUT' then
    return false;
  end if;
  
  -- Last was CHECK_IN, so open session exists
  return true;
end;
$$;

grant execute on function public.has_open_attendance_session(uuid) to authenticated;
grant execute on function public.has_open_attendance_session(uuid) to service_role;
