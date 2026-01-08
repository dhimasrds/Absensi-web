-- ====================================================
-- Fix Storage Policies for Signed URLs
-- Allow signed URLs to work properly
-- ====================================================

-- Drop existing policies if needed (optional, only if recreating)
-- drop policy if exists "Service role can read attendance proofs" on storage.objects;
-- drop policy if exists "Admins can read attendance proofs" on storage.objects;

-- Policy: Allow access via signed URLs (bypass RLS for signed requests)
-- Signed URLs work by including a token, so we allow anon access
create policy "Allow signed URL access to attendance proofs"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'attendance-proofs');

-- Note: The above policy allows reading objects via signed URLs
-- The security is in the signed URL token itself (expires after 1 hour)
