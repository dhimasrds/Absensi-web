# Mobile API Guide - Face Recognition

## Overview

Sistem absensi menggunakan **MobileFaceNet** untuk face recognition di mobile app.
Embedding yang dihasilkan adalah 128-dimensional float array.

> ⚠️ **PENTING**: Web enrollment menggunakan model berbeda (face-api.js).
> Untuk login dari mobile, **HARUS enroll dari mobile** juga.

---

## API Endpoints

### 1. Face Enrollment (Daftar Wajah)

**Endpoint:** `POST /api/mobile/face/enroll`

Digunakan untuk mendaftarkan wajah karyawan baru atau update wajah existing.

#### Request

```json
{
  "employeeCode": "EMP001",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [0.123, -0.456, 0.789, ...]
  },
  "facePhotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "deviceId": "ANDROID-XXXXX",
  "liveness": {
    "provided": true,
    "score": 0.95
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeCode` | string | Yes* | Kode karyawan (mis: EMP001) |
| `employeeId` | string | Yes* | UUID employee (alternatif dari employeeCode) |
| `payload.type` | string | Yes | Harus "EMBEDDING_V1" |
| `payload.embedding` | float[] | Yes | 128-dimensional embedding dari MobileFaceNet |
| `facePhotoBase64` | string | **Yes** | **Foto wajah dalam base64 (untuk preview di web admin)** |
| `deviceId` | string | Yes | Unique device identifier |
| `liveness.provided` | boolean | No | Apakah liveness check dilakukan |
| `liveness.score` | float | No | Skor liveness (0.0 - 1.0) |

*Salah satu dari `employeeCode` atau `employeeId` harus diisi.

#### Response - Success

```json
{
  "data": {
    "message": "Face template created successfully",
    "employee": {
      "id": "uuid-here",
      "employeeCode": "EMP001",
      "fullName": "John Doe"
    },
    "templateVersion": 2,
    "enrolledAt": "2026-01-19T10:30:00.000Z",
    "hasPhoto": true
  }
}
```

#### Response - Error

```json
{
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Employee not found"
  }
}
```

Error codes:
- `VALIDATION_ERROR` - Request body tidak valid
- `EMPLOYEE_NOT_FOUND` - Employee code tidak ditemukan
- `EMPLOYEE_INACTIVE` - Employee tidak aktif

---

### 2. Face Login (Login Wajah)

**Endpoint:** `POST /api/mobile/auth/face-login`

Digunakan untuk login dengan wajah.

#### Request

```json
{
  "deviceId": "ANDROID-XXXXX",
  "clientCaptureId": "capture-20260119-123456",
  "capturedAt": "2026-01-19T10:30:00.000Z",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [0.123, -0.456, 0.789, ...]
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "app": {
    "version": "1.0.0",
    "platform": "android"
  },
  "model": "Samsung Galaxy S21",
  "os": "Android 13"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deviceId` | string | Yes | Unique device identifier |
| `clientCaptureId` | string | Yes | Unique capture ID untuk idempotency |
| `capturedAt` | ISO8601 | Yes | Timestamp saat capture |
| `payload.type` | string | Yes | Harus "EMBEDDING_V1" |
| `payload.embedding` | float[] | Yes | 128-dimensional embedding |
| `liveness.provided` | boolean | Yes | Apakah liveness check dilakukan |
| `liveness.score` | float | Yes | Skor liveness (0.0 - 1.0) |
| `app.version` | string | Yes | Versi aplikasi |
| `app.platform` | string | Yes | "android" atau "ios" |
| `model` | string | No | Model device |
| `os` | string | No | OS version |

#### Response - Success

```json
{
  "data": {
    "employee": {
      "id": "uuid-here",
      "employeeId": "EMP001",
      "fullName": "John Doe"
    },
    "matchScore": 0.85,
    "session": {
      "accessToken": "eyJhbG...",
      "refreshToken": "abc123...",
      "expiresIn": 3600
    }
  }
}
```

#### Response - Error

```json
{
  "error": {
    "code": "FACE_NOT_MATCHED",
    "message": "No matching face found"
  }
}
```

Error codes:
- `VALIDATION_ERROR` - Request body tidak valid
- `FACE_NOT_MATCHED` - Wajah tidak cocok dengan database
- `LIVENESS_CHECK_FAILED` - Skor liveness di bawah threshold

---

### 3. List Employees (Untuk Enrollment)

**Endpoint:** `GET /api/mobile/employees`

Mendapatkan daftar karyawan aktif untuk dropdown di enrollment screen.

#### Response

```json
{
  "data": [
    {
      "id": "uuid-1",
      "employeeCode": "EMP001",
      "fullName": "John Doe",
      "isActive": true
    },
    {
      "id": "uuid-2",
      "employeeCode": "EMP002",
      "fullName": "Jane Smith",
      "isActive": true
    }
  ]
}
```

---

## Flow Diagram

### User Baru

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin Web     │     │   Mobile App    │     │    Backend      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ 1. Create Employee    │                       │
         │ ──────────────────────────────────────────────>
         │                       │                       │
         │<──────────────────────────────────────────────│
         │   Return: EMP002      │                       │
         │                       │                       │
         │ 2. Give code to user  │                       │
         │ ─────────────────────>│                       │
         │                       │                       │
         │                       │ 3. Face Enrollment    │
         │                       │ ─────────────────────>│
         │                       │   POST /api/mobile/   │
         │                       │   face/enroll         │
         │                       │                       │
         │                       │<─────────────────────│
         │                       │   Success             │
         │                       │                       │
         │                       │ 4. Face Login         │
         │                       │ ─────────────────────>│
         │                       │   POST /api/mobile/   │
         │                       │   auth/face-login     │
         │                       │                       │
         │                       │<─────────────────────│
         │                       │   Access Token        │
         │                       │                       │
```

### User Existing (Re-enroll)

Jika user sudah pernah enroll dari web, tapi mau login dari mobile:

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │    Backend      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ 1. Face Enrollment    │
         │ ─────────────────────>│ (Overwrites old template)
         │                       │
         │<─────────────────────│
         │   "Face template      │
         │    updated"           │
         │                       │
         │ 2. Face Login         │
         │ ─────────────────────>│
         │                       │
         │<─────────────────────│
         │   Access Token        │
         │                       │
```

---

## Kotlin/Android Example

### Face Enrollment

```kotlin
data class EnrollRequest(
    val employeeCode: String,
    val payload: EnrollPayload,
    val facePhotoBase64: String,  // Required for web preview
    val deviceId: String,
    val liveness: LivenessData? = null
)

data class EnrollPayload(
    val type: String = "EMBEDDING_V1",
    val embedding: FloatArray
)

data class LivenessData(
    val provided: Boolean,
    val score: Float
)

data class EnrollResponse(
    val data: EnrollData
)

data class EnrollData(
    val message: String,
    val employee: EmployeeInfo,
    val templateVersion: Int,
    val enrolledAt: String,
    val hasPhoto: Boolean
)

/**
 * Enroll face with photo for web admin preview
 * 
 * @param employeeCode Employee code (e.g., "EMP001")
 * @param embedding 128-dimensional embedding from MobileFaceNet
 * @param facePhotoBitmap Face photo bitmap for web preview
 * @param deviceId Unique device identifier
 * @param livenessScore Optional liveness score
 */
suspend fun enrollFace(
    employeeCode: String,
    embedding: FloatArray,
    facePhotoBitmap: Bitmap,
    deviceId: String,
    livenessScore: Float? = null
): Result<EnrollResponse> {
    // Convert bitmap to base64
    val outputStream = ByteArrayOutputStream()
    facePhotoBitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
    val base64Photo = "data:image/jpeg;base64," + 
        Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
    
    val request = EnrollRequest(
        employeeCode = employeeCode,
        payload = EnrollPayload(embedding = embedding),
        facePhotoBase64 = base64Photo,
        deviceId = deviceId,
        liveness = livenessScore?.let { 
            LivenessData(provided = true, score = it) 
        }
    )
    
    return apiService.enrollFace(request)
}
```

### Face Login

```kotlin
data class FaceLoginRequest(
    val deviceId: String,
    val clientCaptureId: String,
    val capturedAt: String,
    val payload: Payload,
    val liveness: Liveness,
    val app: AppInfo,
    val model: String?,
    val os: String?
)

data class Payload(
    val type: String = "EMBEDDING_V1",
    val embedding: FloatArray
)

data class Liveness(
    val provided: Boolean,
    val score: Float
)

suspend fun faceLogin(
    embedding: FloatArray,
    livenessScore: Float,
    deviceId: String
): Result<LoginResponse> {
    val request = FaceLoginRequest(
        deviceId = deviceId,
        clientCaptureId = "capture-${System.currentTimeMillis()}",
        capturedAt = Instant.now().toString(),
        payload = Payload(embedding = embedding),
        liveness = Liveness(provided = true, score = livenessScore),
        app = AppInfo(version = BuildConfig.VERSION_NAME, platform = "android"),
        model = Build.MODEL,
        os = "Android ${Build.VERSION.RELEASE}"
    )
    
    return apiService.faceLogin(request)
}
```

---

## Settings

Threshold dapat diatur dari web admin di `/settings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `face_match_threshold` | 0.60 | Minimum similarity untuk match |
| `face_liveness_threshold` | 0.80 | Minimum liveness score |

---

## Troubleshooting

### "No matching face found"

1. Pastikan sudah enroll dari **mobile app** (bukan web)
2. Cek apakah employee aktif
3. Coba enroll ulang dengan pencahayaan lebih baik

### Match score rendah

1. Enroll dengan wajah menghadap depan, pencahayaan baik
2. Saat login, pastikan posisi wajah mirip dengan saat enroll
3. Minta admin menurunkan `face_match_threshold` jika perlu

### Liveness check failed

1. Pastikan wajah asli (bukan foto/video)
2. Pencahayaan cukup
3. Wajah tidak tertutup

---

## Base URL

- Production: `https://absensi-web-rouge.vercel.app`
- Local Dev: `http://localhost:3000`
