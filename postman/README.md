# 📮 Postman Collection - Absensi API

Koleksi Postman untuk testing API Absensi (Employee Attendance System).

## 📁 Files

| File | Deskripsi |
|------|-----------|
| `Absensi-API.postman_collection.json` | Collection lengkap semua API endpoints |
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
- **Absensi API - Production** → untuk test ke Vercel
- **Absensi API - Local Development** → untuk test localhost

### 3. Setup Admin Token (untuk Admin API)

Admin API membutuhkan Supabase Auth token:

1. Login ke Web Admin: https://absensi-web-rouge.vercel.app/login
2. Buka Browser DevTools → Application → Cookies
3. Copy nilai dari `sb-lvtadyvwoalfnqvwzjzm-auth-token`
4. Di Postman, edit environment variable `ADMIN_TOKEN`

---

## 📱 Mobile API Flow

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. Face Login                                                  │
│     POST /api/mobile/auth/face-login                            │
│     Body: { deviceId, embedding, liveness }                     │
│           ↓                                                      │
│     Response: { accessToken, refreshToken, employee }           │
│                                                                  │
│  2. Use Access Token                                            │
│     Header: Authorization: Bearer {accessToken}                 │
│                                                                  │
│  3. Token Expired? Refresh                                      │
│     POST /api/mobile/auth/refresh                               │
│     Body: { refreshToken }                                      │
│           ↓                                                      │
│     Response: { new accessToken, new refreshToken }             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Check-in Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. Get Upload URL                                              │
│     POST /api/mobile/upload-url                                 │
│     Body: { type: "check-in", contentType: "image/jpeg" }       │
│           ↓                                                      │
│     Response: { signedUrl, path }                               │
│                                                                  │
│  2. Upload Photo ke Signed URL                                  │
│     PUT {signedUrl}                                             │
│     Body: binary image                                          │
│                                                                  │
│  3. Submit Check-in                                             │
│     POST /api/mobile/attendance/check-in                        │
│     Body: { clientCaptureId, location, photoPath, scores }      │
│           ↓                                                      │
│     Response: { attendance record }                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Environment Variables

### Auto-populated (dari response)

| Variable | Set By | Deskripsi |
|----------|--------|-----------|
| `ACCESS_TOKEN` | Face Login | JWT access token (15 min) |
| `REFRESH_TOKEN` | Face Login | JWT refresh token (7 days) |
| `EMPLOYEE_ID` | Face Login | ID employee yang login |
| `EMPLOYEE_NAME` | Face Login | Nama employee |
| `WORK_LOCATION_ID` | Get Locations | ID lokasi kerja |
| `WORK_LOCATION_LAT` | Get Profile | Latitude lokasi kerja |
| `WORK_LOCATION_LNG` | Get Profile | Longitude lokasi kerja |
| `PHOTO_PATH` | Get Upload URL | Path foto check-in |
| `UPLOAD_URL` | Get Upload URL | Signed URL untuk upload |

### Manual Setup

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `BASE_URL` | Production URL | API base URL |
| `DEVICE_ID` | `ANDROID-TEST-001` | Device ID terdaftar |
| `ADMIN_TOKEN` | - | Supabase auth token |
| `USER_LATITUDE` | `-6.2088` | Koordinat user (testing) |
| `USER_LONGITUDE` | `106.8456` | Koordinat user (testing) |
| `FACE_EMBEDDING` | Sample 128-dim | Face embedding untuk test |

---

## 📝 API Endpoints Summary

### 🔐 Mobile Auth
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/mobile/auth/face-login` | ❌ | Login dengan face embedding |
| POST | `/api/mobile/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/mobile/auth/logout` | ✅ | Logout & revoke token |

### 👤 Mobile Profile
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/mobile/me` | ✅ | Get profile & work location |

### 📷 Mobile Upload
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/mobile/upload-url` | ✅ | Get signed URL untuk upload foto |
| PUT | `{signedUrl}` | ❌ | Upload foto (direct ke Supabase Storage) |

### ✅ Mobile Attendance
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/mobile/attendance/check-in` | ✅ | Record check-in |
| POST | `/api/mobile/attendance/check-out` | ✅ | Record check-out |
| GET | `/api/mobile/attendance/history` | ✅ | Get attendance history |
| GET | `/api/mobile/attendance/today` | ✅ | Get today's attendance |

### 🏢 Admin - Employees
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/employees` | ✅ Admin | List all employees |
| GET | `/api/employees/:id` | ✅ Admin | Get employee by ID |
| POST | `/api/employees` | ✅ Admin | Create employee |
| PUT | `/api/employees/:id` | ✅ Admin | Update employee |
| DELETE | `/api/employees/:id` | ✅ Admin | Delete employee |
| POST | `/api/employees/:id/face/enroll` | ✅ Admin | Enroll face template |

### 📱 Admin - Devices
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/devices` | ✅ Admin | List all devices |
| POST | `/api/devices` | ✅ Admin | Register device |
| DELETE | `/api/devices/:id` | ✅ Admin | Delete device |

### 📍 Admin - Work Locations
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/locations` | ✅ Admin | List all locations |
| POST | `/api/locations` | ✅ Admin | Create location |
| PUT | `/api/locations/:id` | ✅ Admin | Update location |
| DELETE | `/api/locations/:id` | ✅ Admin | Delete location |

### 📊 Admin - Attendance
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/attendance` | ✅ Admin | List all attendance |
| GET | `/api/attendance/:id` | ✅ Admin | Get attendance by ID |

---

## 🧪 Testing Scenarios

### Scenario 1: Mobile User Check-in

1. **Face Login** → Get tokens
2. **Get My Profile** → Get work location
3. **Get Upload URL (Check-in)** → Get signed URL
4. **Upload Photo** → Upload gambar ke signed URL
5. **Check-in** → Submit attendance
6. **Get Today's Attendance** → Verify result

### Scenario 2: Mobile User Check-out

1. Pastikan sudah check-in (Scenario 1)
2. **Get Upload URL (Check-out)** → Get signed URL
3. **Upload Photo** → Upload gambar
4. **Check-out** → Submit attendance
5. **Get Attendance History** → Verify records

### Scenario 3: Admin Manage Employees

1. Set `ADMIN_TOKEN` dari browser
2. **Get All Employees** → List existing
3. **Create Employee** → Add new
4. **Enroll Face Template** → Add face embedding
5. **Update Employee** → Modify data
6. **Delete Employee** → Remove

---

## ⚠️ Common Issues

### 1. "Authentication required"
- Pastikan `ADMIN_TOKEN` atau `ACCESS_TOKEN` sudah di-set
- Token mungkin expired, refresh atau login ulang

### 2. "Device not registered"
- Register device terlebih dahulu via Admin API
- Pastikan `DEVICE_ID` sesuai dengan yang terdaftar

### 3. "Outside work location radius"
- Sesuaikan `USER_LATITUDE` dan `USER_LONGITUDE` 
- Pastikan dalam radius work location (default 500m)

### 4. "Face not matched"
- Gunakan face embedding yang sama dengan yang di-enroll
- Pastikan employee sudah di-enroll face template

### 5. "Already checked in today"
- Sudah check-in hari ini
- Gunakan check-out atau tunggu besok

---

## 📞 Support

- **Production URL**: https://absensi-web-rouge.vercel.app
- **GitHub**: https://github.com/dhimasrds/Absensi-web

---

**Last Updated**: January 7, 2026
