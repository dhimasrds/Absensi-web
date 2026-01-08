# Face Photo Feature Implementation

## Overview
Implementasi fitur untuk menyimpan foto wajah saat face enrollment dan menampilkannya di mobile app sebagai foto profil.

## Database Changes

### 1. Add Face Photo Columns
**File:** `/sql/006_add_face_photo_path.sql`

Menambahkan 2 kolom baru ke tabel `face_templates`:
- `face_photo_path` (text) - Path file foto di storage
- `face_photo_mime` (text) - MIME type foto (image/jpeg, image/png, dll)

### 2. Create Face Photos Storage Bucket
**File:** `/sql/007_face_photos_bucket.sql`

- Membuat bucket `face-photos` dengan limit 2MB per file
- Storage policies:
  - Service role dapat upload/read
  - Authenticated users dapat akses via signed URL
  - Admin dapat delete file

## Backend Changes

### 1. Face Validator
**File:** `/src/lib/validators/face.ts`

Menambahkan field `facePhotoBase64` (optional) ke `enrollFaceSchema` untuk menerima foto dalam format base64 data URL.

```typescript
export const enrollFaceSchema = z.object({
  templateVersion: z.number().int().min(1).default(1),
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z.array(z.number()).length(128),
  }),
  qualityScore: z.number().min(0).max(1).optional().nullable(),
  facePhotoBase64: z.string().optional().nullable(), // NEW
})
```

### 2. Face Enrollment API
**File:** `/src/app/api/employees/[id]/face/enroll/route.ts`

**Flow:**
1. Menerima base64 photo dari request
2. Extract MIME type dan buffer dari data URL
3. Upload ke bucket `face-photos` dengan path: `{employeeId}/{timestamp}.{ext}`
4. Simpan path dan mime type ke database
5. Generate signed URL (1 hour expiry)
6. Return signed URL dalam response

**Response format:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "...",
    "templateVersion": 1,
    "isActive": true,
    "createdAt": "...",
    "facePhotoUrl": "https://...signed-url..." // NEW
  }
}
```

### 3. Mobile Me API
**File:** `/src/app/api/mobile/me/route.ts`

**Changes:**
1. SELECT query sekarang include `face_photo_path` dan `face_photo_mime`
2. Generate signed URL dari active face template yang punya foto (24 hours expiry)
3. Tambahkan `facePhotoUrl` ke response

**Response format:**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "...",
      "employeeCode": "...",
      "fullName": "...",
      "email": "...",
      "department": "...",
      "hasEnrolledFace": true,
      "activeFaceTemplates": 1,
      "facePhotoUrl": "https://...signed-url...", // NEW - untuk profile picture
      "workLocation": { ... }
    },
    "device": { ... },
    "session": { ... },
    "attendance": { ... }
  }
}
```

## Frontend Changes

### Face Enrollment Dialog
**File:** `/src/components/employees/FaceEnrollmentDialog.tsx`

**Changes:**
1. Mengirim `facePhotoBase64` dalam enrollment request
2. State baru `enrolledPhotoUrl` untuk menyimpan URL foto yang berhasil di-upload
3. Success step sekarang menampilkan preview foto yang berhasil disimpan
4. Reset `enrolledPhotoUrl` saat retry atau dialog ditutup

**Preview Display:**
- Muncul di success step setelah enrollment berhasil
- Ukuran 200x200px dengan border hijau
- Object-fit: cover
- Label: "Foto profil berhasil disimpan"

## Storage Structure

### face-photos Bucket
```
face-photos/
├── {employee-uuid-1}/
│   ├── 1234567890.jpg
│   ├── 1234567891.png
│   └── ...
├── {employee-uuid-2}/
│   └── 1234567892.jpg
└── ...
```

**Naming Convention:**
- Path: `{employeeId}/{timestamp}.{extension}`
- Timestamp: Unix timestamp in milliseconds
- Extension: Based on MIME type (jpg, png, webp)

**File Constraints:**
- Max size: 2MB
- Allowed types: image/jpeg, image/png, image/webp, image/gif
- Access: Private (signed URL only)

## Deployment Steps

### 1. Run Database Migrations
```sql
-- Run in Supabase SQL Editor
\i sql/006_add_face_photo_path.sql
\i sql/007_face_photos_bucket.sql
```

### 2. Verify Storage Bucket
- Login ke Supabase Dashboard
- Go to Storage section
- Verify `face-photos` bucket exists
- Check policies are applied correctly

### 3. Test Flow
1. **Admin Side:**
   - Buat employee baru atau edit yang sudah ada
   - Klik tombol "Enroll Face"
   - Upload foto wajah
   - Verify detection berhasil
   - Klik "Enroll Face"
   - Verify success message dan preview foto muncul

2. **Storage:**
   - Check di Supabase Storage → face-photos bucket
   - Verify file berhasil di-upload dengan path yang benar

3. **Database:**
   ```sql
   SELECT face_photo_path, face_photo_mime 
   FROM face_templates 
   WHERE employee_id = '{test-employee-id}'
   ```
   - Verify columns terisi dengan path dan mime type yang benar

4. **Mobile API:**
   ```bash
   # Test dengan curl atau Postman
   curl -H "Authorization: Bearer {device-token}" \
        https://your-domain.com/api/mobile/me
   ```
   - Verify response include `employee.facePhotoUrl`
   - Verify URL dapat diakses dan menampilkan foto

5. **Mobile App:**
   - Login dengan employee yang sudah enroll
   - Verify foto profil tampil
   - Check signed URL expiry (24 hours)

## Security Considerations

1. **Storage Access:**
   - Bucket adalah private
   - Akses hanya via signed URL
   - Signed URL expire dalam 24 jam (mobile) atau 1 jam (admin)

2. **Upload Validation:**
   - File type validation (image only)
   - Size limit 2MB
   - Employee ownership validation (hanya bisa upload untuk employee yang valid)

3. **RLS Policies:**
   - Service role: Full access
   - Authenticated: Read via signed URL only
   - Anonymous: No access

## Troubleshooting

### Foto tidak tampil di mobile
1. Check signed URL masih valid (belum expire)
2. Verify `face_photo_path` terisi di database
3. Check storage bucket policy untuk signed URL access
4. Verify CORS settings di Supabase Storage

### Enrollment gagal upload foto
1. Check file size < 2MB
2. Verify MIME type supported
3. Check service role key di environment variables
4. Verify bucket `face-photos` exists

### Preview tidak muncul di admin
1. Check response dari enroll API include `facePhotoUrl`
2. Verify signed URL generated correctly
3. Check browser console untuk error
4. Verify crossOrigin="anonymous" di img tag

## Future Improvements

1. **Image Optimization:**
   - Resize image before upload (max 800x800)
   - Compress JPEG quality to 85%
   - Convert to WebP for better compression

2. **Caching:**
   - Cache signed URL di frontend
   - Regenerate before expiry
   - Use service worker for offline access

3. **Multiple Photos:**
   - Allow multiple face templates per employee
   - Keep photo history
   - Show photo gallery in admin

4. **Face Photo Management:**
   - Admin UI to view/delete old photos
   - Automatic cleanup of orphaned files
   - Storage usage monitoring
