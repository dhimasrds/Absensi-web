# 📮 Postman Collection - Absensi API

Koleksi Postman untuk testing API Absensi (Employee Attendance System).

## 📁 Files

| File | Deskripsi |
|------|-----------|
| `Absensi-API.postman_collection.json` | Collection lengkap semua API endpoints (35+ endpoints) |
| `Absensi-Production.postman_environment.json` | Environment untuk Production (Vercel) |
| `Absensi-Local.postman_environment.json` | Environment untuk Local Development |

## 🚀 Quick Start

### 1. Import ke Postman

1. Buka Postman
2. Klik **Import** (Ctrl+O / Cmd+O)
3. Drag & drop atau pilih file:
   - `Absensi-API.postman_collection.json`
   - `Absensi-Production.postman_environment.json` (atau Local)
4. Klik **Import**

### 2. Pilih Environment

Di pojok kanan atas Postman, pilih environment:
- **Absensi - Production** → untuk test ke Vercel
- **Absensi - Local Development** → untuk test localhost

### 3. Setup Admin Credentials

Edit environment variables:
- `ADMIN_EMAIL`: Email admin yang terdaftar di Supabase Auth
- `ADMIN_PASSWORD`: Password admin

Jalankan request **"Admin Login"** → Token otomatis tersimpan

---

## 📂 API Folders

### 🔐 Admin Auth
Authentication untuk Admin Web (Email/Password)
- **Admin Login** - Login dengan email/password
- **Admin Refresh Token** - Refresh access token
- **Admin Logout** - Logout dan invalidate session
- **Get Current Admin** - Get user info

### 📱 Mobile Auth
Authentication untuk Mobile App (Face Recognition)
- **Face Login** - Login dengan face embedding (128-dim)
- **Mobile Refresh Token** - Refresh mobile token
- **Mobile Logout** - Logout dari mobile app
- **Get My Profile** - Get employee profile

### ⏰ Mobile Attendance
Attendance endpoints untuk employee
- **Check In** - Absen masuk dengan lokasi GPS
- **Check Out** - Absen pulang dengan lokasi GPS
- **Get Attendance History** - Riwayat absensi
- **Get Upload URL** - Pre-signed URL untuk upload foto

### 👥 Employees
Employee management (Admin only)
- **List Employees** - List dengan pagination, search, filter
- **Get Employee by ID** - Detail employee
- **Create Employee** - Tambah employee baru
- **Update Employee** - Update data employee
- **Delete Employee** - Hapus employee
- **Enroll Face Template** - Daftarkan face embedding (128-dim)

### 📍 Work Locations
Work location management (Admin only)
- **List Work Locations** - List lokasi kerja
- **Get Work Location by ID** - Detail lokasi
- **Create Work Location** - Tambah lokasi baru
- **Update Work Location** - Update lokasi
- **Delete Work Location** - Hapus lokasi

### 📊 Attendance (Admin)
Attendance management for admin
- **List All Attendance** - List semua absensi dengan filter
- **Get Attendance by ID** - Detail absensi
- **Update Attendance** - Admin override
- **Delete Attendance** - Hapus record
- **Get Attendance Proof URL** - Signed URL untuk foto bukti

### 📱 Devices
Device management (Admin only)
- **List Devices** - List device yang terdaftar
- **Get Device by ID** - Detail device
- **Deactivate Device** - Nonaktifkan device
- **Delete Device** - Hapus device

---

## 🔑 Authentication Flow

### Admin Web (Email/Password)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Admin Login                                                 │
│     POST /api/auth/login                                        │
│     Body: { email, password }                                   │
│           ↓                                                     │
│     Response: { accessToken, refreshToken, user }               │
│                                                                 │
│  2. Use Access Token                                            │
│     Header: Authorization: Bearer {accessToken}                 │
│                                                                 │
│  3. Token Expired? Refresh                                      │
│     POST /api/auth/refresh                                      │
│     Body: { refreshToken }                                      │
│           ↓                                                     │
│     Response: { new accessToken, new refreshToken }             │
│                                                                 │
│  4. Logout                                                      │
│     POST /api/auth/logout                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile App (Face Recognition)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Face Login                                                  │
│     POST /api/mobile/auth/face-login                            │
│     Body: { embedding, deviceId, deviceInfo }                   │
│           ↓                                                     │
│     Response: { accessToken, refreshToken, employee }           │
│                                                                 │
│  2. Use Access Token (1 hour validity)                          │
│     Header: Authorization: Bearer {accessToken}                 │
│                                                                 │
│  3. Token Expired? Refresh                                      │
│     POST /api/mobile/auth/refresh                               │
│     Body: { refreshToken }                                      │
│           ↓                                                     │
│     Response: { new accessToken, new refreshToken }             │
│                                                                 │
│  4. Logout                                                      │
│     POST /api/mobile/auth/logout                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile Attendance Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Get Upload URL (untuk foto selfie)                          │
│     POST /api/mobile/upload-url                                 │
│     Body: { fileName, contentType, type: "check-in" }           │
│           ↓                                                     │
│     Response: { uploadUrl, filePath }                           │
│                                                                 │
│  2. Upload Photo ke Storage                                     │
│     PUT {uploadUrl}                                             │
│     Body: [binary image data]                                   │
│                                                                 │
│  3. Check In                                                    │
│     POST /api/mobile/attendance/check-in                        │
│     Body: { latitude, longitude, photoPath, deviceId }          │
│           ↓                                                     │
│     Validations:                                                │
│     - Must be within work location radius                       │
│     - Must not have checked in today                            │
│                                                                 │
│  4. Check Out (end of day)                                      │
│     POST /api/mobile/attendance/check-out                       │
│     Body: { latitude, longitude, photoPath, deviceId }          │
│           ↓                                                     │
│     Validations:                                                │
│     - Must have checked in today                                │
│     - Must not have checked out yet                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧑‍💼 Face Enrollment Flow (Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Create Employee                                             │
│     POST /api/employees                                         │
│     Body: { employeeId, fullName, email, department, ... }      │
│           ↓                                                     │
│     Response: { id, ... }                                       │
│                                                                 │
│  2. Enroll Face Template                                        │
│     POST /api/employees/{id}/face/enroll                        │
│     Body: {                                                     │
│       embedding: [128 float values],                            │
│       qualityScore: 0.95,                                       │
│       metadata: { source, detectionConfidence }                 │
│     }                                                           │
│           ↓                                                     │
│     Note: Embedding extracted from face-api.js or               │
│           mobile face recognition SDK                           │
│                                                                 │
│  3. Employee can now login with Face Login                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `http://localhost:3000` |
| `ADMIN_EMAIL` | Admin login email | `admin@example.com` |
| `ADMIN_PASSWORD` | Admin login password | `***` |
| `DEVICE_ID` | Test device ID | `test-device-001` |
| `FACE_EMBEDDING` | 128-dim face embedding | `[0.1, 0.2, ...]` |

### Auto-filled Variables

These are automatically set by test scripts after login:

| Variable | Source |
|----------|--------|
| `ADMIN_TOKEN` | Admin Login response |
| `ADMIN_REFRESH_TOKEN` | Admin Login response |
| `ACCESS_TOKEN` | Face Login response |
| `REFRESH_TOKEN` | Face Login response |
| `EMPLOYEE_ID` | Face Login response |
| `EMPLOYEE_CODE` | Face Login response |

---

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000` |
| Production | `https://absensi-web-rouge.vercel.app` |

---

## 📝 Notes

### Face Embedding Format
- Array of 128 float values
- Generated by face recognition model (face-api.js, TensorFlow Lite, etc.)
- Stored using pgvector in PostgreSQL

### Location Validation
- Check-in/out requires GPS coordinates
- Must be within configured radius of assigned work location
- Haversine formula used for distance calculation

### Photo Upload
1. Request pre-signed URL from `/api/mobile/upload-url`
2. Upload directly to Supabase Storage using signed URL
3. Use returned `filePath` in check-in/check-out request

### Token Expiration
- Admin Access Token: Based on Supabase Auth settings
- Mobile Access Token: 1 hour
- Refresh Token: 30 days
