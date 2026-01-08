-- ====================================================
-- Add face_photo_path column to face_templates
-- For storing face enrollment photos
-- ====================================================

-- Add face_photo_path column to store reference photo
alter table public.face_templates 
add column if not exists face_photo_path text;

-- Add face_photo_mime column to store image mime type
alter table public.face_templates 
add column if not exists face_photo_mime text;

-- Add comment
comment on column public.face_templates.face_photo_path is 'Path to face photo in storage bucket (face-photos)';
comment on column public.face_templates.face_photo_mime is 'MIME type of face photo (image/jpeg, image/png, etc)';
