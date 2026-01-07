# Milestone 1: Database Setup

## Overview
Setup database schema, Row Level Security (RLS), RPC functions, dan storage bucket di Supabase.

## Prerequisites
- Supabase project aktif
- pgvector extension enabled

## Database Schema

### Enums
```sql
-- Tipe attendance
CREATE TYPE attendance_type AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- Sumber attendance
CREATE TYPE attendance_source AS ENUM ('WEB_ADMIN', 'ANDROID');

-- Metode verifikasi
CREATE TYPE verification_method AS ENUM ('FACE', 'MANUAL_ADMIN');

-- Status verifikasi
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
```

### Tables

#### 1. `profiles`
Menyimpan profil user admin yang terhubung dengan Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| role | TEXT | User role ('admin') |
| created_at | TIMESTAMPTZ | Timestamp |

#### 2. `employees`
Master data karyawan.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_code | VARCHAR(50) | Kode unik karyawan |
| full_name | VARCHAR(255) | Nama lengkap |
| email | VARCHAR(255) | Email (opsional) |
| phone_number | VARCHAR(20) | No. telepon |
| job_title | VARCHAR(100) | Jabatan |
| department | VARCHAR(100) | Departemen |
| active | BOOLEAN | Status aktif |
| created_at | TIMESTAMPTZ | Timestamp |
| updated_at | TIMESTAMPTZ | Timestamp |

#### 3. `devices`
Daftar device Android yang terdaftar.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| device_unique_id | VARCHAR(255) | ID unik device |
| device_name | VARCHAR(255) | Nama device |
| device_model | VARCHAR(100) | Model device |
| os_version | VARCHAR(50) | Versi OS |
| app_version | VARCHAR(20) | Versi aplikasi |
| active | BOOLEAN | Status aktif |
| last_seen_at | TIMESTAMPTZ | Terakhir aktif |
| created_at | TIMESTAMPTZ | Timestamp |

#### 4. `face_templates`
Template wajah karyawan untuk face recognition.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| embedding | VECTOR(128) | Face embedding 128-dim |
| version | INTEGER | Versi template |
| is_active | BOOLEAN | Status aktif |
| created_at | TIMESTAMPTZ | Timestamp |

#### 5. `mobile_sessions`
Session untuk autentikasi mobile.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| device_id | UUID | FK to devices |
| refresh_token_hash | TEXT | Hashed refresh token |
| expires_at | TIMESTAMPTZ | Waktu expired |
| revoked_at | TIMESTAMPTZ | Waktu revoke |
| created_at | TIMESTAMPTZ | Timestamp |

#### 6. `attendance_logs`
Log absensi karyawan.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to employees |
| device_id | UUID | FK to devices (nullable) |
| session_id | UUID | FK to mobile_sessions |
| attendance_type | attendance_type | CHECK_IN / CHECK_OUT |
| attendance_source | attendance_source | WEB_ADMIN / ANDROID |
| client_capture_id | VARCHAR(100) | ID capture untuk idempotency |
| captured_at | TIMESTAMPTZ | Waktu capture di client |
| verification_method | verification_method | FACE / MANUAL_ADMIN |
| verification_status | verification_status | PENDING / VERIFIED / FAILED |
| match_score | DECIMAL(5,4) | Skor kecocokan wajah |
| liveness_score | DECIMAL(5,4) | Skor liveness detection |
| note | TEXT | Catatan |
| proof_image_path | TEXT | Path gambar bukti |
| proof_image_mime | VARCHAR(50) | MIME type gambar |
| created_at | TIMESTAMPTZ | Timestamp |

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_employees_code ON employees(employee_code);
CREATE INDEX idx_employees_active ON employees(active);
CREATE INDEX idx_devices_unique_id ON devices(device_unique_id);
CREATE INDEX idx_face_templates_employee ON face_templates(employee_id);
CREATE INDEX idx_attendance_employee_date ON attendance_logs(employee_id, captured_at);
CREATE INDEX idx_attendance_client_capture ON attendance_logs(client_capture_id);
CREATE INDEX idx_mobile_sessions_employee ON mobile_sessions(employee_id);
```

## Row Level Security (RLS)

### Helper Function
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Policies
Semua tabel menggunakan policy yang sama:
- **SELECT**: Admin only (`is_admin()`)
- **INSERT**: Admin only
- **UPDATE**: Admin only
- **DELETE**: Admin only

## RPC Function: face_identify_v1

Fungsi untuk mengidentifikasi wajah berdasarkan face embedding.

### Input Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| query_embedding | VECTOR(128) | Face embedding yang dicari |
| match_threshold | FLOAT | Minimum similarity (default: 0.7) |
| max_results | INT | Max hasil (default: 1) |

### Output
| Column | Type | Description |
|--------|------|-------------|
| employee_id | UUID | ID karyawan |
| employee_code | VARCHAR | Kode karyawan |
| full_name | VARCHAR | Nama karyawan |
| similarity | FLOAT | Skor kecocokan (0-1) |

### Algorithm
Menggunakan **cosine similarity** untuk membandingkan embedding:
```sql
1 - (query_embedding <=> ft.embedding) AS similarity
```

## Storage Bucket

### Bucket: `attendance-proofs`
- **Access**: Private
- **Max file size**: 5MB
- **Allowed MIME types**: image/jpeg, image/png
- **Structure**: `{employee_id}/{date}/{filename}`

## File Migrations

| File | Description |
|------|-------------|
| `sql/001_schema.sql` | Tables, enums, indexes, triggers |
| `sql/002_rls.sql` | RLS policies |
| `sql/003_rpc_face_identify.sql` | Face identification RPC |
| `sql/004_storage_bucket.sql` | Storage bucket setup |
| `sql/005_seed_data.sql` | Sample data |

## How to Apply

1. Buka Supabase Dashboard → SQL Editor
2. Jalankan file secara berurutan:
   ```
   001_schema.sql
   002_rls.sql
   003_rpc_face_identify.sql
   004_storage_bucket.sql
   005_seed_data.sql (optional)
   ```

## Verification

Verifikasi setup berhasil:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RPC
SELECT proname FROM pg_proc WHERE proname = 'face_identify_v1';

-- Check bucket
SELECT * FROM storage.buckets WHERE name = 'attendance-proofs';
```
