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
## 1) SCOPE & GOAL
====================================================

Phase 2 wajib selesai:

### A. Android App Features
- Face detection & liveness check (anti-spoofing)
- Face login dengan embedding extraction (128-dimensional)
- Check-in dengan foto bukti
- Check-out dengan foto bukti  
- Riwayat absensi personal
- Offline mode dengan auto-sync

### B. Integrasi dengan Phase 1 API
- Face login → `POST /api/mobile/auth/face-login`
- Token refresh → `POST /api/mobile/auth/refresh`
- Logout → `POST /api/mobile/auth/logout`
- Get profile → `GET /api/mobile/me`
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
└── Security: EncryptedSharedPreferences
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

**Request Body:**
```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid-unique-per-capture",
  "capturedAt": "2026-01-07T08:30:00.000Z",
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
// 403 - Device tidak terdaftar
{
  "error": {
    "code": "DEVICE_NOT_REGISTERED",
    "message": "Device is not registered or inactive"
  }
}

// 400 - Capture terlalu lama
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
      "phoneNumber": "08123456789",
      "jobTitle": "Software Engineer",
      "department": "IT",
      "hasEnrolledFace": true,
      "activeFaceTemplates": 1
    },
    "device": {
      "id": "uuid",
      "deviceName": "Samsung Galaxy S21",
      "deviceModel": "SM-G991B",
      "osVersion": "Android 14"
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
| `DEVICE_NOT_REGISTERED` | 403 | Device tidak terdaftar |
| `DEVICE_MISMATCH` | 403 | Device ID tidak cocok dengan token |
| `FACE_NOT_RECOGNIZED` | 401 | Wajah tidak cocok |
| `ALREADY_CHECKED_IN` | 409 | Sudah check-in hari ini |
| `NOT_CHECKED_IN` | 409 | Belum check-in (untuk checkout) |
| `DUPLICATE_CAPTURE` | 409 | Capture sudah pernah diproses |
| `CAPTURE_STALE` | 400 | Timestamp capture terlalu lama |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid |
| `VALIDATION_ERROR` | 400 | Request body tidak valid |
| `INTERNAL_ERROR` | 500 | Server error |

---

### 3.4 Important Notes

1. **Face Embedding**: Gunakan **128-dimensional** embedding (MobileFaceNet)
2. **Client Capture ID**: Generate UUID baru untuk setiap capture, digunakan untuk:
   - Anti-replay attack
   - Idempotency (jika request gagal, bisa retry dengan ID yang sama)
3. **Captured At**: Timestamp saat capture dilakukan, max skew 120 detik dari server time
4. **Device ID**: String unik device, generate sekali dan simpan permanen
5. **Liveness Score**: Nilai 0-1, hasil dari liveness detection

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

**Goal**: Implementasi check-in dan check-out.

**Tasks**:
1. Create HomeScreen dengan status attendance hari ini
2. Create AttendanceScreen untuk capture foto
3. Get upload URL dari API
4. Upload foto ke Supabase Storage
5. Call checkin/checkout API dengan semua required fields
6. Handle idempotency (duplicate capture)
7. Show success/error feedback
8. Handle ALREADY_CHECKED_IN dan NOT_CHECKED_IN errors

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
│   │   └── Attendance.kt
│   └── repository/
│       └── AttendanceRepository.kt
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

**Check-in Flow**:
```
1. User tap "Check In" di Home
2. Navigate ke AttendanceScreen
3. Camera preview dengan face detection
4. Run liveness detection
5. Capture foto + extract embedding
6. Generate clientCaptureId (UUID)
7. Get upload URL dari API
8. Upload foto ke Supabase Storage
9. Call /check-in API dengan:
   - deviceId, clientCaptureId, capturedAt
   - matchScore, livenessScore
   - proofImagePath dari upload
10. Handle response:
    - Success → Show success, navigate to Home
    - Idempotent → Show "already recorded"
    - ALREADY_CHECKED_IN → Show error
11. Update Home dengan status "Checked In"
```

**Acceptance Criteria**:
- [ ] Home screen tampil status attendance hari ini
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
    val proofImagePath: String?,
    val proofImageMime: String?,
    val note: String?,
    val status: String,           // PENDING, SYNCING, SYNCED, FAILED
    val retryCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
```

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
