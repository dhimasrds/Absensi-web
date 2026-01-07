# GUIDE PROMPT - PHASE 2: ANDROID APP

Kamu adalah AI engineer yang bertugas membangun sistem ABSENSI KARYAWAN Phase 2.
Target utama: ANDROID APP yang terintegrasi dengan Backend Phase 1.
WAJIB mengikuti urutan milestone dan spesifikasi di bawah. Jangan loncat.

> **Prerequisite**: Phase 1 (Web Admin + Backend API) sudah selesai dan berjalan.
> Base URL API: `https://lvtadyvwoalfnqvwzjzm.supabase.co` atau `http://localhost:3000`

====================================================
## 0) OUTPUT RULES (WAJIB)
====================================================

- Kerjakan berurutan berdasarkan MILESTONE 8..13.
- Setiap milestone harus menghasilkan:
  (1) Daftar file yang dibuat/diubah
  (2) Screenshot/recording hasil jika UI
  (3) Catatan keamanan/assumption
- Gunakan Kotlin + Jetpack Compose untuk UI.
- Gunakan Material Design 3 guidelines.
- Semua API call harus handle error dengan proper UX.
- Implementasi offline-first architecture.

====================================================
## 0.1) PREREQUISITES & ASSUMPTIONS
====================================================

### What's Already Done in Phase 1 (Backend)

Sebelum memulai Phase 2, pastikan Phase 1 sudah menyediakan:

| Component | Status | Description |
|-----------|--------|-------------|
| **Supabase Project** | ✅ Ready | Database PostgreSQL + Auth + Storage |
| **Web Admin** | ✅ Ready | Next.js app untuk admin management |
| **Employee Data** | ✅ Ready | CRUD employees via `/employees` page (with phone & job title) |
| **Device Registration** | ✅ Ready | CRUD devices via `/devices` page + **Auto-registration** |
| **Work Locations** | ✅ Ready | CRUD locations via `/locations` page |
| **Face Templates** | ✅ Ready | Face enrollment via admin |
| **Mobile APIs** | ✅ Ready | `/api/mobile/*` endpoints |
| **Storage Bucket** | ✅ Ready | `attendance-proofs` bucket |

### Recent Updates (Phase 1)

> **LATEST CHANGES** yang mempengaruhi Android development:

| Update | Date | Impact |
|--------|------|--------|
| **Auto Device Registration** | 2026-01-08 | Device otomatis terdaftar saat face login pertama. Manual registration optional. |
| **Phone & Job Title Fields** | 2026-01-08 | Employees table sekarang punya `phone_number` dan `job_title`. Hanya untuk Web Admin, tidak di-return ke mobile. |
| **Face Match Threshold** | 2026-01-08 | Lowered dari 0.80 → **0.70** untuk matching yang lebih lenient. |
| **Capture Max Skew** | Always | 120 detik (2 menit) - timestamp validation untuk anti-replay. |

### Admin Setup Before Mobile App Can Work

> **PENTING**: Sebelum employee bisa login via mobile app, admin HARUS:

```
1. CREATE EMPLOYEE
   - Buka Web Admin → /employees
   - Add new employee dengan data lengkap:
     • Employee ID (required)
     • Full Name (required)
     • Email (optional)
     • Phone Number (optional)
     • Job Title (optional)
     • Department (optional)
     • Work Location (optional)
   - Catat employee_id yang di-generate

2. REGISTER DEVICE (OPTIONAL - AUTO-REGISTER ENABLED)
   - Device akan OTOMATIS terdaftar saat pertama kali face login berhasil
   - Atau admin bisa manual register via Web Admin → /devices:
     • device_id: String unik dari Android (e.g., "ANDROID-XXX-123")
     • label: Nama device (e.g., "Samsung A52 - John")
     • Set status: ACTIVE
   
   > **NOTE**: Sejak update terbaru, device auto-register saat face login pertama.
   > Manual registration hanya untuk pre-authorize device sebelum employee login.

3. ENROLL FACE (WAJIB untuk face login)
   - Admin capture wajah employee via Web Admin → /employees → [employee] → Enroll Face
   - Face detection otomatis extract embedding 128-dim
   - Template disimpan ke table `face_templates`
   - Atau manual insert via SQL/API:
     INSERT INTO face_templates (employee_id, embedding, template_version, quality_score)
     VALUES ('uuid', '[0.1, 0.2, ...]', 1, 0.95);

4. ASSIGN WORK LOCATION (Optional)
   - Buka Web Admin → /employees → Edit
   - Pilih Work Location dari dropdown
   - Jika tidak di-assign, employee bisa absen dari mana saja
```

### Device ID Generation (Android)

Android app harus generate device ID yang **unik dan persistent**:

```kotlin
object DeviceIdGenerator {
    fun getDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences("device_prefs", Context.MODE_PRIVATE)
        var deviceId = prefs.getString("device_id", null)
        
        if (deviceId == null) {
            // Generate new device ID
            deviceId = "ANDROID-${UUID.randomUUID().toString().take(8).uppercase()}"
            prefs.edit().putString("device_id", deviceId).apply()
        }
        
        return deviceId
    }
}

// Usage
val deviceId = DeviceIdGenerator.getDeviceId(context)
// Result: "ANDROID-A1B2C3D4"
```

> **NOTE**: Device ID ini harus sama persis dengan yang di-register oleh admin di Web Admin.
> Jika tidak match, API akan return error `DEVICE_NOT_REGISTERED`.

### Face Enrollment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FACE ENROLLMENT (PHASE 1)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option A: Via Admin Tool (Recommended)                         │
│  ─────────────────────────────────────────                      │
│  1. Admin capture foto wajah employee                           │
│  2. Run face embedding extraction script                        │
│  3. Insert embedding ke database                                │
│                                                                 │
│  Option B: Via Mobile App Enrollment Screen (Future)            │
│  ─────────────────────────────────────────────────              │
│  1. Employee buka app → Enrollment mode                         │
│  2. Capture wajah dengan liveness                               │
│  3. POST /api/mobile/enroll-face (NOT IMPLEMENTED YET)          │
│                                                                 │
│  Untuk Phase 2 ini, gunakan Option A.                           │
│  Employee TIDAK bisa self-enroll face.                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

====================================================
## 1) SCOPE & GOAL
====================================================

Phase 2 wajib selesai:

### A. Android App Features
- Face detection & liveness check (anti-spoofing)
- Face login dengan embedding extraction (128-dimensional)
- Check-in dengan foto bukti + **Geofencing validation**
- Check-out dengan foto bukti + **Geofencing validation**
- Riwayat absensi personal
- Offline mode dengan auto-sync
- **GPS location validation against assigned work location**

### B. Integrasi dengan Phase 1 API
- Face login → `POST /api/mobile/auth/face-login`
- Token refresh → `POST /api/mobile/auth/refresh`
- Logout → `POST /api/mobile/auth/logout`
- Get profile (incl. work location) → `GET /api/mobile/me`
- Upload foto → `POST /api/mobile/upload-url`
- Check-in → `POST /api/mobile/attendance/check-in`
- Check-out → `POST /api/mobile/attendance/check-out`
- History → `GET /api/mobile/attendance/history`

### C. Security Requirements
- Secure token storage (EncryptedSharedPreferences)
- Certificate pinning untuk API calls
- Device binding validation
- Liveness detection untuk anti-spoofing
- Client capture ID untuk idempotency & anti-replay
- **GPS spoofing prevention (mock location detection)**

### D. Geofencing Requirements (FROM PHASE 1)
> Phase 1 sudah menyediakan fitur **Work Locations** untuk employee:
> - Admin dapat membuat lokasi kerja dengan koordinat (lat, lng) dan radius
> - Admin dapat assign employee ke work location tertentu
> - API `/api/mobile/me` mengembalikan `workLocation` untuk employee
> - Android app WAJIB validasi GPS sebelum check-in/check-out

**Work Location dari Phase 1:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Work location ID |
| `name` | String | Location name (e.g., "Head Office") |
| `address` | String? | Full address |
| `latitude` | Double | GPS latitude |
| `longitude` | Double | GPS longitude |
| `radiusMeters` | Int | Allowed radius in meters (default: 500m) |

**Validation Rule:**
- Calculate distance antara GPS user dengan koordinat `workLocation`
- Jika `distance <= radiusMeters` → ALLOW attendance
- Jika `distance > radiusMeters` → BLOCK attendance, show error
- Jika `workLocation` is `null` → ALLOW attendance (no location restriction)

====================================================
## 2) TECH STACK
====================================================

```
Android:
├── Language: Kotlin 1.9+
├── Min SDK: 26 (Android 8.0)
├── Target SDK: 34 (Android 14)
├── UI: Jetpack Compose + Material 3
├── Architecture: MVVM + Clean Architecture
├── DI: Hilt
├── Networking: Retrofit + OkHttp + Moshi
├── Local DB: Room (untuk offline queue)
├── Camera: CameraX
├── Face Detection: ML Kit Face Detection
├── Face Embedding: TensorFlow Lite (MobileFaceNet - 128 dim)
├── Image Loading: Coil
├── Background Sync: WorkManager
├── Security: EncryptedSharedPreferences
├── Location: Google Play Services Location (FusedLocationProvider)
└── Maps: Google Maps SDK (optional, for showing work location)
```

**Additional Gradle Dependencies for Location:**
```kotlin
// Location Services
implementation("com.google.android.gms:play-services-location:21.0.1")

// Optional: Maps for visualizing work location
implementation("com.google.maps.android:maps-compose:4.3.0")
```

**Required Permissions:**
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

====================================================
## 3) API CONTRACT (SESUAI PHASE 1)
====================================================

> **PENTING**: Semua request/response di bawah ini adalah format EXACT dari Phase 1.
> Android app WAJIB mengikuti format ini.

---

### 3.1 Authentication APIs

#### POST /api/mobile/auth/face-login

Face login dengan embedding 128-dimensional.

> **AUTO-DEVICE REGISTRATION**: 
> Jika deviceId belum terdaftar, sistem akan otomatis register device dengan label default.
> Tidak perlu manual device registration sebelumnya.

**Request Body:**
```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid-unique-per-capture",
  "capturedAt": "2026-01-08T10:00:00.000Z",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [0.123, -0.456, ...]  // Array of 128 floats
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "app": {
    "version": "1.0.0",
    "platform": "android"
  }
}
```

**Response Success (200):**
```json
{
  "data": {
    "employee": {
      "id": "uuid",
      "employeeId": "EMP-001",
      "fullName": "John Doe",
      "email": "john@company.com",
      "department": "IT"
    },
    "matchScore": 0.9542,
    "session": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG...",
      "expiresIn": 3600
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Error Responses:**
```json
// 403 - Device tidak aktif (jika device sudah terdaftar tapi disabled)
{
  "error": {
    "code": "DEVICE_NOT_REGISTERED",
    "message": "Device is not registered or inactive"
  }
}

// 400 - Capture terlalu lama (max 120 detik dari server time)
{
  "error": {
    "code": "CAPTURE_STALE",
    "message": "Capture timestamp is too old"
  }
}

// 409 - Duplicate capture (anti-replay)
{
  "error": {
    "code": "DUPLICATE_CAPTURE",
    "message": "This capture has already been processed"
  }
}

// 401 - Face tidak dikenali
{
  "error": {
    "code": "FACE_NOT_RECOGNIZED",
    "message": "Face not recognized or below threshold"
  }
}
```

---

#### POST /api/mobile/auth/refresh

Refresh access token menggunakan refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response Success (200):**
```json
{
  "data": {
    "accessToken": "eyJhbG...",
    "expiresIn": 3600
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Error Response:**
```json
// 401 - Invalid refresh token
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is invalid or expired"
  }
}
```

---

#### POST /api/mobile/auth/logout

Revoke refresh token (logout).

**Request Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response Success (200):**
```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

#### GET /api/mobile/me

Get current authenticated employee info.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response Success (200):**
```json
{
  "data": {
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP-001",
      "fullName": "John Doe",
      "email": "john@company.com",
      "department": "IT",
      "hasEnrolledFace": true,
      "activeFaceTemplates": 1,
      "workLocation": {
        "id": "uuid",
        "name": "Head Office",
        "address": "123 Main Street",
        "latitude": -6.2088,
        "longitude": 106.8456,
        "radiusMeters": 500
      }
    },
    "device": {
      "id": "uuid",
      "deviceId": "ANDROID-XXX-123",
      "label": "Android Device - Auto Registered"
    },
    "session": {
      "employeeId": "uuid",
      "deviceId": "uuid",
      "sessionId": "uuid",
      "activeSessions": 1
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

> **NOTES**: 
> - `workLocation` bisa `null` jika employee tidak di-assign ke lokasi kerja
> - `device.label` akan otomatis dibuat jika device auto-registered
> - Phone number dan job title TIDAK di-return di /me endpoint (tidak dibutuhkan mobile app)

---

### 3.2 Attendance APIs

#### POST /api/mobile/upload-url

Get signed URL untuk upload foto bukti attendance.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "deviceId": "ANDROID-XXX-123",
  "contentType": "image/jpeg"
}
```

**Response Success (200):**
```json
{
  "data": {
    "uploadUrl": "https://xxx.supabase.co/storage/v1/object/upload/sign/...",
    "filePath": "employee-uuid/2026-01-07/uuid.jpg",
    "expiresAt": "2026-01-07T08:35:00.000Z",
    "token": "upload-token"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

#### UPLOAD FOTO KE SIGNED URL (PENTING!)

Setelah mendapat response dari `/upload-url`, gunakan `uploadUrl` untuk upload foto:

**Upload Implementation (Kotlin + OkHttp):**

```kotlin
class StorageUploader @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    /**
     * Upload foto ke Supabase Storage via signed URL
     * @param signedUrl URL dari response /upload-url
     * @param imageBytes Byte array dari foto (JPEG)
     * @param contentType MIME type (image/jpeg)
     * @return Result<Unit>
     */
    suspend fun uploadImage(
        signedUrl: String,
        imageBytes: ByteArray,
        contentType: String = "image/jpeg"
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val requestBody = imageBytes.toRequestBody(contentType.toMediaType())
            
            val request = Request.Builder()
                .url(signedUrl)
                .put(requestBody)  // Supabase signed URL uses PUT
                .addHeader("Content-Type", contentType)
                .build()
            
            val response = okHttpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Upload failed: ${response.code} ${response.message}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Compress and convert Bitmap to JPEG bytes
     */
    fun bitmapToJpegBytes(bitmap: Bitmap, quality: Int = 85): ByteArray {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
        return stream.toByteArray()
    }
}
```

**Usage Flow:**

```kotlin
// 1. Capture foto dari camera
val photoBitmap: Bitmap = captureFromCamera()

// 2. Convert to bytes
val photoBytes = storageUploader.bitmapToJpegBytes(photoBitmap, quality = 85)

// 3. Get signed URL dari API
val uploadUrlResponse = api.getUploadUrl(
    UploadUrlRequest(deviceId = deviceId, contentType = "image/jpeg")
)

// 4. Upload ke signed URL
val uploadResult = storageUploader.uploadImage(
    signedUrl = uploadUrlResponse.data.uploadUrl,
    imageBytes = photoBytes
)

// 5. Gunakan filePath untuk attendance request
if (uploadResult.isSuccess) {
    val attendanceRequest = AttendanceRequest(
        // ... other fields
        proofImagePath = uploadUrlResponse.data.filePath,  // Use filePath, NOT uploadUrl
        proofImageMime = "image/jpeg"
    )
    api.checkIn(attendanceRequest)
}
```

> **IMPORTANT**: 
> - `proofImagePath` di attendance request adalah `filePath` dari response, BUKAN `uploadUrl`
> - Signed URL expires dalam 5 menit, upload segera setelah dapat URL
> - Gunakan PUT method untuk upload, bukan POST

---

#### POST /api/mobile/attendance/check-in

Record check-in attendance.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid-unique-per-capture",
  "capturedAt": "2026-01-07T08:30:00.000Z",
  "verificationMethod": "FACE",
  "matchScore": 0.9542,
  "livenessScore": 0.9821,
  "note": "Optional note",
  "proofImagePath": "employee-uuid/2026-01-07/uuid.jpg",
  "proofImageMime": "image/jpeg"
}
```

**Response Success (201):**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-07T08:30:00.000Z",
    "verificationStatus": "VERIFIED"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Response Idempotent (200) - Already recorded:**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-07T08:30:00.000Z",
    "message": "Attendance already recorded",
    "idempotent": true
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Error Response:**
```json
// 409 - Already checked in today
{
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "Employee already has an open check-in session"
  }
}
```

---

#### POST /api/mobile/attendance/check-out

Record check-out attendance.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** (sama dengan check-in)
```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid-unique-per-capture",
  "capturedAt": "2026-01-07T17:30:00.000Z",
  "verificationMethod": "FACE",
  "matchScore": 0.9387,
  "livenessScore": 0.9654,
  "note": "Optional note",
  "proofImagePath": "employee-uuid/2026-01-07/uuid.jpg",
  "proofImageMime": "image/jpeg"
}
```

**Response Success (201):**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_OUT",
    "capturedAt": "2026-01-07T17:30:00.000Z",
    "verificationStatus": "VERIFIED"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Error Response:**
```json
// 409 - Not checked in yet
{
  "error": {
    "code": "NOT_CHECKED_IN",
    "message": "No open check-in session found"
  }
}
```

---

#### GET /api/mobile/attendance/history

Get attendance history for authenticated employee.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
```
?from=2026-01-01T00:00:00.000Z
&to=2026-01-31T23:59:59.999Z
&type=CHECK_IN (optional: CHECK_IN | CHECK_OUT)
&page=1
&limit=20
```

**Response Success (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "attendanceType": "CHECK_IN",
      "capturedAt": "2026-01-07T08:30:00.000Z",
      "verificationMethod": "FACE",
      "verificationStatus": "VERIFIED",
      "matchScore": 0.9542,
      "livenessScore": 0.9821,
      "note": null,
      "hasProof": true
    },
    {
      "id": "uuid",
      "attendanceType": "CHECK_OUT",
      "capturedAt": "2026-01-07T17:30:00.000Z",
      "verificationMethod": "FACE",
      "verificationStatus": "VERIFIED",
      "matchScore": 0.9387,
      "livenessScore": 0.9654,
      "note": null,
      "hasProof": true
    }
  ],
  "meta": {
    "requestId": "uuid",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 3.3 Common Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}  // Optional
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Token invalid/expired |
| `FORBIDDEN` | 403 | Access denied |
| `DEVICE_NOT_REGISTERED` | 403 | Device tidak aktif (disabled by admin) |
| `DEVICE_MISMATCH` | 403 | Device ID tidak cocok dengan token |
| `FACE_NOT_RECOGNIZED` | 401 | Wajah tidak cocok dengan threshold (0.70) |
| `ALREADY_CHECKED_IN` | 409 | Sudah check-in hari ini |
| `NOT_CHECKED_IN` | 409 | Belum check-in (untuk checkout) |
| `DUPLICATE_CAPTURE` | 409 | Capture sudah pernah diproses |
| `CAPTURE_STALE` | 400 | Timestamp capture > 120 detik dari server time |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid |
| `VALIDATION_ERROR` | 400 | Request body tidak valid |
| `INTERNAL_ERROR` | 500 | Server error |

> **NOTES**: 
> - Error `OUT_OF_RANGE` untuk geofencing di-handle di **CLIENT SIDE** (Android)
> - Server tidak melakukan validasi lokasi - validasi dilakukan di app sebelum request
> - `DEVICE_NOT_REGISTERED` hanya muncul jika device sudah terdaftar tapi di-disable
> - Device baru otomatis terdaftar saat face login pertama kali

---

### 3.4 Important Notes

1. **Face Embedding**: Gunakan **128-dimensional** embedding (MobileFaceNet)
2. **Face Match Threshold**: Server menggunakan threshold **0.70** (cosine similarity)
3. **Client Capture ID**: Generate UUID baru untuk setiap capture, digunakan untuk:
   - Anti-replay attack
   - Idempotency (jika request gagal, bisa retry dengan ID yang sama)
4. **Captured At**: Timestamp saat capture dilakukan, max skew **120 detik** dari server time
5. **Device ID**: String unik device, generate sekali dan simpan permanen
6. **Auto Device Registration**: Device otomatis terdaftar saat face login pertama kali berhasil
7. **Liveness Score**: Nilai 0-1, hasil dari liveness detection
8. **Work Location**: Dari `/api/mobile/me`, digunakan untuk geofencing validation di client
9. **Phone Number & Job Title**: Tersedia di Web Admin untuk employee management, TIDAK di-return ke mobile API

---

### 3.5 Work Location Data Flow (Phase 1 → Phase 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE 1 (WEB)                           │
├─────────────────────────────────────────────────────────────────┤
│  Admin creates work locations:                                  │
│  - /locations page → POST /api/work-locations                   │
│  - Sets: name, address, latitude, longitude, radius_meters      │
│                                                                 │
│  Admin assigns employee to location:                            │
│  - /employees page → work_location dropdown                     │
│  - Saves work_location_id to employees table                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API BRIDGE                              │
├─────────────────────────────────────────────────────────────────┤
│  GET /api/mobile/me                                             │
│  Returns employee data including workLocation:                  │
│  {                                                              │
│    "employee": {                                                │
│      "workLocation": {                                          │
│        "id": "uuid",                                            │
│        "name": "Head Office",                                   │
│        "latitude": -6.2088,                                     │
│        "longitude": 106.8456,                                   │
│        "radiusMeters": 500                                      │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PHASE 2 (ANDROID)                         │
├─────────────────────────────────────────────────────────────────┤
│  App validates location before attendance:                      │
│  1. Get user GPS coordinates                                    │
│  2. Get workLocation from cached /me response                   │
│  3. Calculate distance using Haversine formula                  │
│  4. If distance > radiusMeters → Block attendance               │
│  5. If distance <= radiusMeters → Allow attendance              │
└─────────────────────────────────────────────────────────────────┘
```

====================================================
## 4) MILESTONES
====================================================

### MILESTONE 8: Android Project Setup
────────────────────────────────────────

**Goal**: Setup project Android dengan arsitektur yang benar.

**Tasks**:
1. Create new Android project (Empty Compose Activity)
2. Setup Gradle dengan semua dependencies
3. Setup Hilt untuk dependency injection
4. Setup Retrofit + OkHttp + Moshi untuk networking
5. Setup Room database untuk offline storage
6. Setup base classes (BaseViewModel, Resource sealed class)
7. Setup navigation dengan Compose Navigation
8. Konfigurasi build variants (debug/release)
9. Setup network security config

**Deliverables**:
```
app/
├── build.gradle.kts
├── src/main/
│   ├── AndroidManifest.xml
│   ├── java/com/absensi/
│   │   ├── AbsensiApp.kt
│   │   ├── MainActivity.kt
│   │   ├── di/
│   │   │   ├── AppModule.kt
│   │   │   ├── NetworkModule.kt
│   │   │   └── DatabaseModule.kt
│   │   ├── data/
│   │   │   ├── remote/
│   │   │   │   ├── ApiService.kt
│   │   │   │   ├── AuthInterceptor.kt
│   │   │   │   └── dto/
│   │   │   ├── local/
│   │   │   │   ├── AppDatabase.kt
│   │   │   │   ├── dao/
│   │   │   │   └── entity/
│   │   │   └── repository/
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   └── repository/
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   ├── components/
│   │   │   └── navigation/
│   │   └── util/
│   │       ├── Resource.kt
│   │       └── Constants.kt
│   └── res/
│       └── xml/
│           └── network_security_config.xml
└── proguard-rules.pro
```

**Acceptance Criteria**:
- [ ] Project bisa di-build tanpa error
- [ ] Hilt injection berfungsi
- [ ] Retrofit configured dengan base URL
- [ ] Room database initialized
- [ ] Navigation graph setup

────────────────────────────────────────
### MILESTONE 9: Face Detection Module
────────────────────────────────────────

**Goal**: Implementasi face detection dan embedding extraction (128-dim).

**Tasks**:
1. Setup CameraX untuk camera preview
2. Integrate ML Kit Face Detection
3. Implement face bounding box overlay
4. Integrate TensorFlow Lite MobileFaceNet untuk embedding 128-dim
5. Implement liveness detection (eye blink, head movement)
6. Create FaceDetectionManager sebagai facade
7. Implement capture dengan UUID client_capture_id

**Deliverables**:
```
├── face/
│   ├── FaceDetectionManager.kt
│   ├── FaceEmbeddingExtractor.kt  // Output: 128 floats
│   ├── LivenessDetector.kt
│   ├── CameraManager.kt
│   └── model/
│       ├── FaceDetectionResult.kt
│       ├── FaceEmbedding.kt       // data class with List<Float> (128)
│       └── LivenessResult.kt
├── ui/
│   └── components/
│       ├── CameraPreview.kt
│       └── FaceOverlay.kt
└── assets/
    └── mobilefacenet.tflite
```

**Face Embedding Spec**:
```kotlin
data class FaceEmbedding(
    val embedding: List<Float>,  // Exactly 128 floats
    val type: String = "EMBEDDING_V1"
)

// Validation
require(embedding.size == 128) { "Embedding must be 128-dimensional" }
```

**Liveness Detection**:
```kotlin
data class LivenessChallenge(
    val type: ChallengeType,  // BLINK, TURN_LEFT, TURN_RIGHT, SMILE
    val instruction: String,
    val timeoutMs: Long = 5000
)

data class LivenessResult(
    val provided: Boolean,
    val score: Float?  // 0.0 - 1.0, null if not provided
)
```

**Acceptance Criteria**:
- [ ] Camera preview tampil dengan face bounding box
- [ ] Face embedding berhasil di-extract (128 floats)
- [ ] Liveness detection berfungsi (minimal blink detection)
- [ ] Generate UUID untuk setiap capture

────────────────────────────────────────
### MILESTONE 10: Authentication Flow
────────────────────────────────────────

**Goal**: Implementasi face login dan token management.

**Tasks**:
1. Create LoginScreen dengan camera preview
2. Implement face capture flow dengan liveness
3. Build request sesuai API contract (payload, liveness, app)
4. Call face-login API dengan embedding
5. Store tokens di EncryptedSharedPreferences
6. Implement auto token refresh dengan interceptor
7. Create AuthRepository dan AuthViewModel
8. Handle all error cases dari API

**Deliverables**:
```
├── data/
│   ├── remote/dto/
│   │   ├── FaceLoginRequest.kt
│   │   ├── FaceLoginResponse.kt
│   │   ├── RefreshTokenRequest.kt
│   │   ├── RefreshTokenResponse.kt
│   │   └── ApiResponse.kt
│   ├── local/
│   │   └── TokenManager.kt
│   └── repository/
│       └── AuthRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── Employee.kt
│   │   └── AuthSession.kt
│   └── repository/
│       └── AuthRepository.kt
└── ui/
    ├── login/
    │   ├── LoginScreen.kt
    │   ├── LoginViewModel.kt
    │   └── LoginUiState.kt
    └── components/
        └── LivenessGuide.kt
```

**FaceLoginRequest (sesuai API)**:
```kotlin
data class FaceLoginRequest(
    val deviceId: String,
    val clientCaptureId: String,  // UUID baru setiap capture
    val capturedAt: String,       // ISO 8601
    val payload: EmbeddingPayload,
    val liveness: LivenessInfo,
    val app: AppInfo
)

data class EmbeddingPayload(
    val type: String = "EMBEDDING_V1",
    val embedding: List<Float>  // 128 floats
)

data class LivenessInfo(
    val provided: Boolean,
    val score: Float?
)

data class AppInfo(
    val version: String,
    val platform: String = "android"
)
```

---

#### TOKEN MANAGEMENT (PENTING!)

**JWT Token Structure:**

Response dari `/face-login` berisi access token dan refresh token:

```json
{
  "session": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Access Token Claims (decoded):**
```json
{
  "sub": "employee-uuid",
  "employeeId": "EMP-001",
  "deviceId": "device-uuid",
  "sessionId": "session-uuid",
  "iat": 1704614400,
  "exp": 1704618000
}
```

| Claim | Description |
|-------|-------------|
| `sub` | Employee UUID |
| `employeeId` | Employee code (e.g., "EMP-001") |
| `deviceId` | Device UUID (from database) |
| `sessionId` | Session UUID for this login |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expires at (Unix timestamp) - 1 hour |

**TokenManager.kt (Complete Implementation):**
```kotlin
@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "secure_tokens",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_EXPIRES_AT = "expires_at"
    }
    
    fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Int) {
        val expiresAt = System.currentTimeMillis() + (expiresIn * 1000)
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putLong(KEY_EXPIRES_AT, expiresAt)
            .apply()
    }
    
    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    
    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)
    
    fun isTokenExpired(): Boolean {
        val expiresAt = prefs.getLong(KEY_EXPIRES_AT, 0)
        // Consider expired 5 minutes before actual expiry (buffer)
        return System.currentTimeMillis() > (expiresAt - 5 * 60 * 1000)
    }
    
    fun clearTokens() {
        prefs.edit().clear().apply()
    }
    
    fun hasValidSession(): Boolean {
        return getAccessToken() != null && !isTokenExpired()
    }
}
```

**AuthInterceptor.kt (Auto Refresh):**
```kotlin
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
    private val authApi: Lazy<AuthApi>  // Lazy to avoid circular dependency
) : Interceptor {
    
    private val mutex = Mutex()
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Skip auth for login/refresh endpoints
        if (originalRequest.url.encodedPath.contains("/auth/")) {
            return chain.proceed(originalRequest)
        }
        
        val accessToken = tokenManager.getAccessToken()
            ?: return chain.proceed(originalRequest)
        
        // Add token to request
        val authenticatedRequest = originalRequest.newBuilder()
            .addHeader("Authorization", "Bearer $accessToken")
            .build()
        
        val response = chain.proceed(authenticatedRequest)
        
        // If 401, try to refresh token
        if (response.code == 401) {
            response.close()
            
            // Use mutex to prevent multiple simultaneous refreshes
            return runBlocking {
                mutex.withLock {
                    val newToken = refreshToken()
                    if (newToken != null) {
                        // Retry with new token
                        val newRequest = originalRequest.newBuilder()
                            .addHeader("Authorization", "Bearer $newToken")
                            .build()
                        chain.proceed(newRequest)
                    } else {
                        // Refresh failed, return original 401
                        response
                    }
                }
            }
        }
        
        return response
    }
    
    private suspend fun refreshToken(): String? {
        val refreshToken = tokenManager.getRefreshToken() ?: return null
        
        return try {
            val response = authApi.get().refreshToken(
                RefreshTokenRequest(refreshToken)
            )
            tokenManager.saveTokens(
                response.data.accessToken,
                refreshToken,  // Keep same refresh token
                response.data.expiresIn
            )
            response.data.accessToken
        } catch (e: Exception) {
            tokenManager.clearTokens()
            null
        }
    }
}
```

---

**Login Flow**:
```
1. User buka app → Check stored token
2. Jika token valid → Navigate to Home
3. Jika token expired → Auto refresh
4. Jika no token / refresh failed → Show Login Screen
5. Login Screen:
   a. Tampilkan camera preview
   b. Detect face
   c. Run liveness challenges
   d. Extract embedding (128-dim)
   e. Generate clientCaptureId (UUID)
   f. Call /face-login API
   g. Store tokens
   h. Navigate to Home
```

**Acceptance Criteria**:
- [ ] Login screen dengan camera + liveness guide
- [ ] Face login berhasil dengan API
- [ ] Token tersimpan encrypted
- [ ] Auto refresh token berfungsi
- [ ] Error handling untuk semua error codes
- [ ] Logout berfungsi

────────────────────────────────────────
### MILESTONE 11: Attendance Feature
────────────────────────────────────────

**Goal**: Implementasi check-in dan check-out dengan geofencing validation.

**Tasks**:
1. Create HomeScreen dengan status attendance hari ini
2. Create AttendanceScreen untuk capture foto
3. **[NEW] Implement Geofencing validation (lihat section bawah)**
4. Get upload URL dari API
5. Upload foto ke Supabase Storage
6. Call checkin/checkout API dengan semua required fields
7. Handle idempotency (duplicate capture)
8. Show success/error feedback
9. Handle ALREADY_CHECKED_IN dan NOT_CHECKED_IN errors
10. **[NEW] Handle OUT_OF_RANGE location error**

**Deliverables**:
```
├── data/
│   ├── remote/dto/
│   │   ├── UploadUrlRequest.kt
│   │   ├── UploadUrlResponse.kt
│   │   ├── AttendanceRequest.kt
│   │   └── AttendanceResponse.kt
│   └── repository/
│       └── AttendanceRepositoryImpl.kt
├── domain/
│   ├── model/
│   │   ├── Attendance.kt
│   │   └── WorkLocation.kt
│   └── repository/
│       └── AttendanceRepository.kt
├── util/
│   └── LocationUtils.kt          // [NEW] Geofencing helper
└── ui/
    ├── home/
    │   ├── HomeScreen.kt
    │   ├── HomeViewModel.kt
    │   └── HomeUiState.kt
    └── attendance/
        ├── AttendanceScreen.kt
        ├── AttendanceViewModel.kt
        └── AttendanceUiState.kt
```

**AttendanceRequest (sesuai API)**:
```kotlin
data class AttendanceRequest(
    val deviceId: String,
    val clientCaptureId: String,    // UUID baru setiap capture
    val capturedAt: String,         // ISO 8601
    val verificationMethod: String = "FACE",
    val matchScore: Float?,         // 0.0 - 1.0
    val livenessScore: Float?,      // 0.0 - 1.0
    val note: String? = null,
    val proofImagePath: String?,    // dari upload-url response
    val proofImageMime: String? = "image/jpeg"
)
```

---

#### GEOFENCING VALIDATION (INTEGRATED WITH PHASE 1)

> **INFO**: Phase 1 sudah menyediakan fitur Work Locations management:
> - Web Admin: `/locations` page untuk CRUD work locations
> - API: `GET/POST /api/work-locations` untuk admin
> - Database: Table `work_locations` dengan lat/lng/radius
> - Employee: Kolom `work_location_id` untuk assignment
> - Mobile API: `/api/mobile/me` mengembalikan `workLocation` object

Employee harus berada dalam radius lokasi kerja untuk bisa check-in/check-out.

**WorkLocation Model dari /me API:**
```kotlin
data class WorkLocation(
    val id: String,
    val name: String,
    val address: String?,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int   // Default: 500 meters from Phase 1
)
```

**LocationUtils.kt:**
```kotlin
import android.location.Location

object LocationUtils {
    /**
     * Calculate distance between two coordinates in meters
     * Uses Android's built-in distanceBetween (Haversine formula)
     */
    fun calculateDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Float {
        val results = FloatArray(1)
        Location.distanceBetween(lat1, lon1, lat2, lon2, results)
        return results[0]
    }
    
    /**
     * Check if user is within work location radius
     * @return Pair(isWithinRange, distanceMeters)
     */
    fun validateLocation(
        userLat: Double, userLon: Double,
        workLocation: WorkLocation?
    ): Pair<Boolean, Float?> {
        if (workLocation == null) {
            // No work location assigned by admin, allow attendance anywhere
            return Pair(true, null)
        }
        
        val distance = calculateDistance(
            userLat, userLon,
            workLocation.latitude, workLocation.longitude
        )
        
        val isWithinRange = distance <= workLocation.radiusMeters
        return Pair(isWithinRange, distance)
    }
    
    /**
     * Detect if mock location is enabled (GPS spoofing prevention)
     */
    fun isMockLocationEnabled(location: Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }
    }
}
```

**UI Handling - AttendanceScreen:**
```kotlin
// In AttendanceViewModel
fun checkGeofencing(userLat: Double, userLon: Double): GeofenceResult {
    val workLocation = profileState.value.employee?.workLocation
    val (isValid, distance) = LocationUtils.validateLocation(
        userLat, userLon, workLocation
    )
    
    return if (isValid) {
        GeofenceResult.WithinRange
    } else {
        GeofenceResult.OutOfRange(
            distance = distance!!,
            locationName = workLocation!!.name,
            radiusMeters = workLocation.radiusMeters
        )
    }
}

// Show Snackbar when out of range
sealed class GeofenceResult {
    object WithinRange : GeofenceResult()
    data class OutOfRange(
        val distance: Float,
        val locationName: String,
        val radiusMeters: Int
    ) : GeofenceResult()
}
```

**Snackbar Message:**
```kotlin
// When out of range, show this snackbar:
val message = "Anda berada di luar area kerja '${result.locationName}' " +
    "(${result.distance.toInt()}m dari lokasi, maksimal ${result.radiusMeters}m)"

Snackbar.make(view, message, Snackbar.LENGTH_LONG)
    .setAction("OK") { }
    .show()
```

**Geofencing Flow:**
```
1. User tap "Check In" / "Check Out"
2. Request location permission (if not granted)
3. Get current GPS coordinates
4. Get workLocation from /me API (cached in profile)
5. Validate: distance <= workLocation.radiusMeters
6. If VALID:
   - Continue to camera/face capture
7. If INVALID:
   - Show Snackbar: "Anda berada di luar area kerja..."
   - DO NOT proceed to attendance
   - User must move to work location first
```

**Location Permission:**
```kotlin
// Required permissions in AndroidManifest.xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

// Request at runtime before attendance
```

---

**Check-in Flow (Updated with Geofencing)**:
```
1. User tap "Check In" di Home
2. **[GEOFENCE] Request location permission if needed**
3. **[GEOFENCE] Get current GPS coordinates**
4. **[GEOFENCE] Check if within work location radius**
5. **[GEOFENCE] If OUT of range → Show Snackbar, STOP**
6. Navigate ke AttendanceScreen
7. Camera preview dengan face detection
8. Run liveness detection
9. Capture foto + extract embedding
10. Generate clientCaptureId (UUID)
11. Get upload URL dari API
12. Upload foto ke Supabase Storage
13. Call /check-in API dengan:
   - deviceId, clientCaptureId, capturedAt
   - matchScore, livenessScore
   - proofImagePath dari upload
14. Handle response:
    - Success → Show success, navigate to Home
    - Idempotent → Show "already recorded"
    - ALREADY_CHECKED_IN → Show error
15. Update Home dengan status "Checked In"
```

**Acceptance Criteria**:
- [ ] Home screen tampil status attendance hari ini
- [ ] **[NEW] Geofencing check sebelum attendance**
- [ ] **[NEW] Snackbar saat di luar area kerja**
- [ ] **[NEW] Location permission request**
- [ ] Check-in flow end-to-end
- [ ] Check-out flow end-to-end
- [ ] Foto terupload ke Supabase Storage
- [ ] Handle idempotent response
- [ ] Handle ALREADY_CHECKED_IN error
- [ ] Handle NOT_CHECKED_IN error
- [ ] Success feedback dengan animasi

────────────────────────────────────────
### MILESTONE 12: History & Profile
────────────────────────────────────────

**Goal**: Tampilkan riwayat absensi dan profile user.

**Tasks**:
1. Create HistoryScreen dengan list attendance
2. Implement pagination (page, limit)
3. Add date filter (from, to)
4. Add type filter (CHECK_IN, CHECK_OUT)
5. Create ProfileScreen dengan info employee
6. Call /me API untuk profile
7. Add pull-to-refresh
8. Show attendance detail

**Deliverables**:
```
├── data/
│   ├── remote/dto/
│   │   ├── HistoryResponse.kt
│   │   └── ProfileResponse.kt
│   └── repository/
│       └── HistoryRepositoryImpl.kt
├── domain/
│   └── model/
│       └── AttendanceHistory.kt
└── ui/
    ├── history/
    │   ├── HistoryScreen.kt
    │   ├── HistoryViewModel.kt
    │   └── components/
    │       ├── HistoryItem.kt
    │       ├── DateFilterSheet.kt
    │       └── AttendanceDetailSheet.kt
    └── profile/
        ├── ProfileScreen.kt
        └── ProfileViewModel.kt
```

**History Query Params**:
```kotlin
data class HistoryQuery(
    val from: String? = null,    // ISO 8601
    val to: String? = null,      // ISO 8601
    val type: String? = null,    // "CHECK_IN" or "CHECK_OUT"
    val page: Int = 1,
    val limit: Int = 20
)
```

**Acceptance Criteria**:
- [ ] History list dengan pagination
- [ ] Filter tanggal berfungsi
- [ ] Filter type berfungsi
- [ ] Pull-to-refresh
- [ ] Profile screen dengan data dari /me
- [ ] Detail attendance item

────────────────────────────────────────
### MILESTONE 13: Offline Mode & Polish
────────────────────────────────────────

**Goal**: Implementasi offline mode dan polish UI.

**Tasks**:
1. Create offline queue untuk attendance
2. Store pending attendance di Room dengan clientCaptureId
3. Implement WorkManager untuk background sync
4. Sync saat koneksi tersedia
5. Add network status indicator
6. Polish UI dengan animasi
7. Add proper error messages
8. Implement proper back handling
9. Create release build configuration
10. Add ProGuard rules

**Deliverables**:
```
├── data/
│   ├── local/
│   │   ├── entity/
│   │   │   └── PendingAttendanceEntity.kt
│   │   └── dao/
│   │       └── PendingAttendanceDao.kt
│   └── sync/
│       ├── SyncManager.kt
│       └── AttendanceSyncWorker.kt
├── ui/
│   └── components/
│       ├── NetworkStatusBar.kt
│       ├── LoadingAnimation.kt
│       └── ErrorDialog.kt
└── util/
    └── NetworkMonitor.kt
```

**PendingAttendanceEntity**:
```kotlin
@Entity(tableName = "pending_attendance")
data class PendingAttendanceEntity(
    @PrimaryKey
    val clientCaptureId: String,  // UUID, juga sebagai idempotency key
    val type: String,             // CHECK_IN or CHECK_OUT
    val deviceId: String,
    val capturedAt: String,
    val matchScore: Float?,
    val livenessScore: Float?,
    val proofImagePath: String?,  // Path di Supabase Storage (setelah upload)
    val proofImageMime: String?,
    val localPhotoUri: String?,   // Local file URI (sebelum upload)
    val note: String?,
    val status: String,           // PENDING, UPLOADING, SYNCING, SYNCED, FAILED
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
```

---

#### OFFLINE PHOTO STORAGE (PENTING!)

Saat offline, foto harus disimpan lokal terlebih dahulu:

**LocalPhotoStorage.kt:**
```kotlin
@Singleton
class LocalPhotoStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val photosDir = File(context.filesDir, "pending_photos")
    
    init {
        if (!photosDir.exists()) {
            photosDir.mkdirs()
        }
    }
    
    /**
     * Save photo locally for offline attendance
     * @param clientCaptureId UUID untuk nama file
     * @param bitmap Foto dari camera
     * @return URI file lokal
     */
    suspend fun savePhoto(
        clientCaptureId: String,
        bitmap: Bitmap,
        quality: Int = 85
    ): Uri = withContext(Dispatchers.IO) {
        val file = File(photosDir, "$clientCaptureId.jpg")
        
        FileOutputStream(file).use { outputStream ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        }
        
        Uri.fromFile(file)
    }
    
    /**
     * Get photo bytes for upload
     */
    suspend fun getPhotoBytes(clientCaptureId: String): ByteArray? = 
        withContext(Dispatchers.IO) {
            val file = File(photosDir, "$clientCaptureId.jpg")
            if (file.exists()) {
                file.readBytes()
            } else {
                null
            }
        }
    
    /**
     * Delete photo after successful sync
     */
    suspend fun deletePhoto(clientCaptureId: String) = withContext(Dispatchers.IO) {
        val file = File(photosDir, "$clientCaptureId.jpg")
        if (file.exists()) {
            file.delete()
        }
    }
    
    /**
     * Clean up old photos (older than 7 days)
     */
    suspend fun cleanupOldPhotos() = withContext(Dispatchers.IO) {
        val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)
        photosDir.listFiles()?.forEach { file ->
            if (file.lastModified() < sevenDaysAgo) {
                file.delete()
            }
        }
    }
}
```

**Offline Attendance Flow (Complete):**

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE ATTENDANCE FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. USER CAPTURES ATTENDANCE                                    │
│     ├── Generate clientCaptureId (UUID)                         │
│     ├── Capture foto + face embedding                           │
│     ├── Save foto lokal: /files/pending_photos/{uuid}.jpg       │
│     └── Save ke Room: PendingAttendanceEntity                   │
│         • status = "PENDING"                                    │
│         • localPhotoUri = file:///.../{uuid}.jpg                │
│         • proofImagePath = null (belum upload)                  │
│                                                                 │
│  2. SHOW PENDING INDICATOR                                      │
│     └── "1 attendance belum tersinkron"                         │
│                                                                 │
│  3. WORKMANAGER PERIODIC SYNC (setiap 15 menit)                 │
│     └── Check: isNetworkAvailable?                              │
│                                                                 │
│  4. WHEN ONLINE - SYNC PROCESS                                  │
│     ├── Get all PENDING attendance from Room                    │
│     ├── For each pending:                                       │
│     │   ├── Update status = "UPLOADING"                         │
│     │   ├── Get signed URL from /upload-url                     │
│     │   ├── Upload foto ke signed URL                           │
│     │   ├── Update proofImagePath = response.filePath           │
│     │   ├── Update status = "SYNCING"                           │
│     │   ├── Call /check-in or /check-out API                    │
│     │   ├── Handle response:                                    │
│     │   │   ├── 201 Success → status = "SYNCED"                 │
│     │   │   ├── 200 Idempotent → status = "SYNCED" (OK!)        │
│     │   │   └── Error → status = "FAILED", retryCount++         │
│     │   └── Delete local photo if SYNCED                        │
│     └── Show notification: "X attendance synced"                │
│                                                                 │
│  5. RETRY FAILED (max 3x)                                       │
│     ├── If retryCount >= 3, mark as permanently FAILED          │
│     └── User can manually retry from History screen             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**AttendanceSyncWorker.kt:**
```kotlin
@HiltWorker
class AttendanceSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val pendingAttendanceDao: PendingAttendanceDao,
    private val localPhotoStorage: LocalPhotoStorage,
    private val storageUploader: StorageUploader,
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : CoroutineWorker(context, params) {
    
    override suspend fun doWork(): Result {
        val pendingList = pendingAttendanceDao.getAllPending()
        
        if (pendingList.isEmpty()) {
            return Result.success()
        }
        
        var syncedCount = 0
        
        for (pending in pendingList) {
            try {
                // Skip if max retries exceeded
                if (pending.retryCount >= 3) continue
                
                // Step 1: Upload photo if not uploaded yet
                var proofImagePath = pending.proofImagePath
                if (proofImagePath == null && pending.localPhotoUri != null) {
                    pendingAttendanceDao.updateStatus(pending.clientCaptureId, "UPLOADING")
                    
                    val photoBytes = localPhotoStorage.getPhotoBytes(pending.clientCaptureId)
                    if (photoBytes != null) {
                        val uploadUrlResponse = apiService.getUploadUrl(
                            UploadUrlRequest(pending.deviceId, "image/jpeg")
                        )
                        
                        storageUploader.uploadImage(
                            uploadUrlResponse.data.uploadUrl,
                            photoBytes
                        ).getOrThrow()
                        
                        proofImagePath = uploadUrlResponse.data.filePath
                        pendingAttendanceDao.updateProofImagePath(
                            pending.clientCaptureId, 
                            proofImagePath
                        )
                    }
                }
                
                // Step 2: Call attendance API
                pendingAttendanceDao.updateStatus(pending.clientCaptureId, "SYNCING")
                
                val request = AttendanceRequest(
                    deviceId = pending.deviceId,
                    clientCaptureId = pending.clientCaptureId,
                    capturedAt = pending.capturedAt,
                    verificationMethod = "FACE",
                    matchScore = pending.matchScore,
                    livenessScore = pending.livenessScore,
                    note = pending.note,
                    proofImagePath = proofImagePath,
                    proofImageMime = pending.proofImageMime
                )
                
                val response = if (pending.type == "CHECK_IN") {
                    apiService.checkIn(request)
                } else {
                    apiService.checkOut(request)
                }
                
                // Step 3: Mark as synced and cleanup
                pendingAttendanceDao.updateStatus(pending.clientCaptureId, "SYNCED")
                localPhotoStorage.deletePhoto(pending.clientCaptureId)
                syncedCount++
                
            } catch (e: Exception) {
                // Mark as failed, increment retry count
                pendingAttendanceDao.markFailed(
                    pending.clientCaptureId,
                    e.message ?: "Unknown error"
                )
            }
        }
        
        // Show notification if any synced
        if (syncedCount > 0) {
            showSyncNotification(syncedCount)
        }
        
        return Result.success()
    }
    
    private fun showSyncNotification(count: Int) {
        // ... notification implementation
    }
}
```

---

**Offline Flow**:
```
1. User check-in saat offline
2. Generate clientCaptureId (UUID)
3. Simpan ke Room dengan status PENDING
4. Tampilkan "Pending Sync" indicator
5. WorkManager periodic check koneksi
6. Saat online:
   a. Get semua PENDING attendance
   b. Upload foto (jika belum)
   c. Call API dengan clientCaptureId yang sama
   d. Handle idempotent response (sudah synced)
   e. Update status jadi SYNCED
7. Show notification "X attendance synced"
```

**Acceptance Criteria**:
- [ ] Attendance bisa dilakukan offline
- [ ] Pending attendance tersimpan dengan clientCaptureId
- [ ] Auto sync saat online
- [ ] Idempotency berfungsi (retry aman)
- [ ] Network status indicator
- [ ] UI animations smooth
- [ ] Release APK bisa di-build
- [ ] ProGuard tidak break app

====================================================
## 5) PROJECT STRUCTURE (Final)
====================================================

```
AbsensiApp/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── assets/
│           │   └── mobilefacenet.tflite
│           ├── java/com/absensi/
│           │   ├── AbsensiApp.kt
│           │   ├── MainActivity.kt
│           │   ├── di/
│           │   │   ├── AppModule.kt
│           │   │   ├── NetworkModule.kt
│           │   │   └── DatabaseModule.kt
│           │   ├── data/
│           │   │   ├── remote/
│           │   │   │   ├── ApiService.kt
│           │   │   │   ├── AuthInterceptor.kt
│           │   │   │   └── dto/
│           │   │   │       ├── FaceLoginRequest.kt
│           │   │   │       ├── FaceLoginResponse.kt
│           │   │   │       ├── RefreshTokenRequest.kt
│           │   │   │       ├── AttendanceRequest.kt
│           │   │   │       ├── AttendanceResponse.kt
│           │   │   │       ├── UploadUrlRequest.kt
│           │   │   │       ├── HistoryResponse.kt
│           │   │   │       ├── ProfileResponse.kt
│           │   │   │       └── ApiResponse.kt
│           │   │   ├── local/
│           │   │   │   ├── AppDatabase.kt
│           │   │   │   ├── TokenManager.kt
│           │   │   │   ├── dao/
│           │   │   │   │   └── PendingAttendanceDao.kt
│           │   │   │   └── entity/
│           │   │   │       └── PendingAttendanceEntity.kt
│           │   │   ├── repository/
│           │   │   │   ├── AuthRepositoryImpl.kt
│           │   │   │   ├── AttendanceRepositoryImpl.kt
│           │   │   │   └── HistoryRepositoryImpl.kt
│           │   │   └── sync/
│           │   │       ├── SyncManager.kt
│           │   │       └── AttendanceSyncWorker.kt
│           │   ├── domain/
│           │   │   ├── model/
│           │   │   │   ├── Employee.kt
│           │   │   │   ├── AuthSession.kt
│           │   │   │   ├── Attendance.kt
│           │   │   │   └── AttendanceHistory.kt
│           │   │   └── repository/
│           │   │       ├── AuthRepository.kt
│           │   │       ├── AttendanceRepository.kt
│           │   │       └── HistoryRepository.kt
│           │   ├── face/
│           │   │   ├── FaceDetectionManager.kt
│           │   │   ├── FaceEmbeddingExtractor.kt
│           │   │   ├── LivenessDetector.kt
│           │   │   ├── CameraManager.kt
│           │   │   └── model/
│           │   │       ├── FaceDetectionResult.kt
│           │   │       ├── FaceEmbedding.kt
│           │   │       └── LivenessResult.kt
│           │   ├── ui/
│           │   │   ├── theme/
│           │   │   │   ├── Color.kt
│           │   │   │   ├── Theme.kt
│           │   │   │   └── Type.kt
│           │   │   ├── navigation/
│           │   │   │   ├── NavGraph.kt
│           │   │   │   └── Screen.kt
│           │   │   ├── components/
│           │   │   │   ├── CameraPreview.kt
│           │   │   │   ├── FaceOverlay.kt
│           │   │   │   ├── LivenessGuide.kt
│           │   │   │   ├── LoadingButton.kt
│           │   │   │   ├── NetworkStatusBar.kt
│           │   │   │   └── ErrorDialog.kt
│           │   │   ├── login/
│           │   │   │   ├── LoginScreen.kt
│           │   │   │   ├── LoginViewModel.kt
│           │   │   │   └── LoginUiState.kt
│           │   │   ├── home/
│           │   │   │   ├── HomeScreen.kt
│           │   │   │   ├── HomeViewModel.kt
│           │   │   │   └── HomeUiState.kt
│           │   │   ├── attendance/
│           │   │   │   ├── AttendanceScreen.kt
│           │   │   │   ├── AttendanceViewModel.kt
│           │   │   │   └── AttendanceUiState.kt
│           │   │   ├── history/
│           │   │   │   ├── HistoryScreen.kt
│           │   │   │   ├── HistoryViewModel.kt
│           │   │   │   └── components/
│           │   │   │       ├── HistoryItem.kt
│           │   │   │       └── DateFilterSheet.kt
│           │   │   └── profile/
│           │   │       ├── ProfileScreen.kt
│           │   │       └── ProfileViewModel.kt
│           │   └── util/
│           │       ├── Resource.kt
│           │       ├── Constants.kt
│           │       ├── Extensions.kt
│           │       └── NetworkMonitor.kt
│           └── res/
│               ├── drawable/
│               ├── values/
│               │   ├── strings.xml
│               │   ├── colors.xml
│               │   └── themes.xml
│               └── xml/
│                   └── network_security_config.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

====================================================
## 6) SECURITY CHECKLIST
====================================================

- [ ] Token disimpan di EncryptedSharedPreferences
- [ ] Certificate pinning untuk API calls
- [ ] ProGuard obfuscation enabled
- [ ] No sensitive data di logs (release build)
- [ ] Device ID di-generate sekali dan disimpan permanen
- [ ] Face embedding tidak disimpan permanen di device
- [ ] Liveness detection untuk anti-spoofing
- [ ] Network security config (no cleartext in release)
- [ ] clientCaptureId unique per capture (UUID)

====================================================
## 7) DEFINITION OF DONE - PHASE 2
====================================================

Phase 2 dianggap selesai jika:

1. [ ] Face login berfungsi dengan backend Phase 1
2. [ ] Embedding 128-dimensional sesuai spec
3. [ ] clientCaptureId unique setiap capture
4. [ ] Check-in dengan foto berhasil
5. [ ] Check-out dengan foto berhasil
6. [ ] Idempotency berfungsi (retry aman)
7. [ ] History attendance dengan pagination
8. [ ] Profile dari /me API tampil
9. [ ] Offline mode: attendance tersimpan lokal
10. [ ] Auto sync saat online
11. [ ] Token refresh otomatis
12. [ ] Liveness detection mencegah foto statis
13. [ ] APK release bisa di-build dan diinstall

====================================================
## 8) REFERENSI PHASE 1
====================================================

### Backend Files
- API Routes: `src/app/api/mobile/`
- Validators: `src/lib/validators/`
- Types: `src/lib/types/database.ts`
- Auth: `src/lib/auth/mobileJwt.ts`, `src/lib/auth/mobileGuard.ts`

### Database Schema
- `sql/001_schema.sql` - Tables
- `sql/003_rpc_face_identify.sql` - Face matching RPC

### API Base URLs
- Production: `https://lvtadyvwoalfnqvwzjzm.supabase.co`
- Local Dev: `http://localhost:3000`

### Supabase Storage
- Bucket: `attendance-proofs`
- Path pattern: `{employee_uuid}/{date}/{uuid}.jpg`

### Face Embedding Spec
- **Dimension**: 128 floats (WAJIB)
- **Model**: MobileFaceNet (TensorFlow Lite)
- **Type**: `EMBEDDING_V1`
- **Threshold**: 0.7 (dari `FACE_MATCH_THRESHOLD`)

### Test Data (Development)
- Employee: John Doe (EMP-001)
- Device ID: `ANDROID-DEV-001`
- Email: john.doe@company.com
