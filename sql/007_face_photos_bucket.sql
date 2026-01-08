-- ====================================================
-- Storage Bucket Setup for Face Photos
-- ====================================================

-- Create private bucket for face enrollment photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'face-photos',
  'face-photos',
  false, -- private bucket
  2097152, -- 2MB limit
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- ====================================================
-- STORAGE POLICIES FOR FACE PHOTOS
-- ====================================================

-- Policy: Service role can upload
create policy "Service role can upload face photos"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'face-photos');

-- Policy: Service role can read
create policy "Service role can read face photos"
  on storage.objects for select
  to service_role
  using (bucket_id = 'face-photos');

-- Policy: Allow signed URL access (for admins and mobile users)
create policy "Allow signed URL access to face photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'face-photos');

-- Policy: Admins can delete face photos
create policy "Admins can delete face photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'face-photos'
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );
