-- ====================================================
-- Milestone 1: Storage Bucket Setup
-- Attendance System Phase 1
-- ====================================================

-- Create private bucket for attendance proof photos
-- Note: This SQL creates the bucket entry. 
-- You may also need to create it via Supabase Dashboard if using hosted Supabase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-proofs',
  'attendance-proofs',
  false, -- private bucket
  5242880, -- 5MB limit
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- ====================================================
-- STORAGE POLICIES
-- ====================================================

-- Policy: Service role can upload (used by server for signed upload URLs)
create policy "Service role can upload attendance proofs"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'attendance-proofs');

-- Policy: Service role can read (used by server for signed download URLs)
create policy "Service role can read attendance proofs"
  on storage.objects for select
  to service_role
  using (bucket_id = 'attendance-proofs');

-- Policy: Admins can read attendance proofs
create policy "Admins can read attendance proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attendance-proofs' 
    and exists (
      select 1 from public.profiles 
      where user_id = auth.uid() 
        and role = 'admin'
    )
  );

-- Policy: Authenticated users can upload to their designated path
-- Path format: attendance/YYYY-MM-DD/{employee_id}/{filename}
create policy "Authenticated can upload own attendance proofs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attendance-proofs'
  );
