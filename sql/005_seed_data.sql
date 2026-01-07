-- ====================================================
-- Seed Data for Testing
-- Attendance System Phase 1
-- ====================================================

-- Note: Run this AFTER creating an admin user in Supabase Auth
-- Replace <AUTH_USER_UUID> with your actual admin user ID

-- ====================================================
-- SAMPLE EMPLOYEES
-- ====================================================

insert into public.employees (id, employee_id, full_name, email, department, is_active)
values 
  ('11111111-1111-1111-1111-111111111111', 'EMP001', 'John Doe', 'john.doe@company.com', 'Engineering', true),
  ('22222222-2222-2222-2222-222222222222', 'EMP002', 'Jane Smith', 'jane.smith@company.com', 'HR', true),
  ('33333333-3333-3333-3333-333333333333', 'EMP003', 'Bob Wilson', 'bob.wilson@company.com', 'Finance', true),
  ('44444444-4444-4444-4444-444444444444', 'EMP004', 'Alice Brown', 'alice.brown@company.com', 'Engineering', false)
on conflict (id) do nothing;

-- ====================================================
-- SAMPLE DEVICES
-- ====================================================

insert into public.devices (id, device_id, label, is_active)
values 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ANDROID-DEVICE-001', 'Front Desk Tablet', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ANDROID-DEVICE-002', 'Office Entrance', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ANDROID-DEVICE-003', 'Warehouse Gate', false)
on conflict (id) do nothing;

-- ====================================================
-- SAMPLE FACE TEMPLATES (128-dim dummy embeddings)
-- ====================================================

-- Note: These are dummy embeddings for testing
-- In production, real face embeddings would come from face recognition model

insert into public.face_templates (employee_id, template_version, embedding, is_active, quality_score)
values 
  (
    '11111111-1111-1111-1111-111111111111', 
    1, 
    '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]'::vector(128), 
    true, 
    0.95
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    1, 
    '[0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]'::vector(128), 
    true, 
    0.92
  ),
  (
    '33333333-3333-3333-3333-333333333333', 
    1, 
    '[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]'::vector(128), 
    true, 
    0.88
  )
on conflict (employee_id) do nothing;

-- ====================================================
-- SAMPLE ATTENDANCE LOGS
-- ====================================================

insert into public.attendance_logs (
  employee_id, type, timestamp, source, device_id, client_capture_id,
  captured_at, verification_method, verification_status, match_score
)
values 
  -- John Doe - Day 1
  ('11111111-1111-1111-1111-111111111111', 'CHECK_IN', '2026-01-06 08:00:00+07', 'ANDROID', 'ANDROID-DEVICE-001', 'cap-001', '2026-01-06 08:00:00+07', 'FACE', 'VERIFIED', 0.92),
  ('11111111-1111-1111-1111-111111111111', 'CHECK_OUT', '2026-01-06 17:30:00+07', 'ANDROID', 'ANDROID-DEVICE-001', 'cap-002', '2026-01-06 17:30:00+07', 'FACE', 'VERIFIED', 0.89),
  
  -- Jane Smith - Day 1
  ('22222222-2222-2222-2222-222222222222', 'CHECK_IN', '2026-01-06 08:15:00+07', 'ANDROID', 'ANDROID-DEVICE-002', 'cap-003', '2026-01-06 08:15:00+07', 'FACE', 'VERIFIED', 0.95),
  ('22222222-2222-2222-2222-222222222222', 'CHECK_OUT', '2026-01-06 17:00:00+07', 'ANDROID', 'ANDROID-DEVICE-002', 'cap-004', '2026-01-06 17:00:00+07', 'FACE', 'VERIFIED', 0.91),
  
  -- Bob Wilson - Day 1
  ('33333333-3333-3333-3333-333333333333', 'CHECK_IN', '2026-01-06 09:00:00+07', 'WEB_ADMIN', null, null, null, 'MANUAL_ADMIN', 'VERIFIED', null)
on conflict do nothing;

-- ====================================================
-- ADMIN PROFILE SETUP TEMPLATE
-- ====================================================
-- After creating admin user in Supabase Auth, run:
/*
insert into public.profiles (user_id, role)
values ('<YOUR_AUTH_USER_UUID>', 'admin')
on conflict (user_id) do update set role = excluded.role;
*/
