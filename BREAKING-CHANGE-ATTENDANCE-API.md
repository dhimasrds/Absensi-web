# 🔄 BREAKING CHANGES: Check-In/Check-Out Flow Update

**Date**: 2026-01-08  
**Impact**: 🔴 **HIGH** - Requires Android app code changes  
**Affected Endpoints**: 
- `POST /api/mobile/attendance/check-in`
- `POST /api/mobile/attendance/check-out`

---

## ⚠️ PERUBAHAN YANG PERLU DIKETAHUI

### Face Verification Sekarang WAJIB untuk Attendance

**SEBELUMNYA** (Old Flow):
- Check-in/check-out hanya upload foto
- `matchScore` dan `livenessScore` dikirim dari client
- Tidak ada verifikasi face di server

**SEKARANG** (New Flow):
- Check-in/check-out **WAJIB melakukan face verification**
- Extract face embedding (128 floats) dari kamera
- Server verify face matching (sama seperti login)
- `matchScore` dihitung oleh server

---

## 📊 PERUBAHAN PAYLOAD & RESPONSE

### POST /api/mobile/attendance/check-in
### POST /api/mobile/attendance/check-out

#### ❌ Request Payload BEFORE (DEPRECATED)

```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid",
  "capturedAt": "2026-01-08T08:30:00.000Z",
  "verificationMethod": "FACE",
  "matchScore": 0.95,
  "livenessScore": 0.98,
  "note": null,
  "proofImagePath": "employee-uuid/2026-01-08/uuid.jpg",
  "proofImageMime": "image/jpeg"
}
```

#### ✅ Request Payload NOW (REQUIRED)

```json
{
  "deviceId": "ANDROID-XXX-123",
  "clientCaptureId": "uuid-unique",
  "capturedAt": "2026-01-08T08:30:00.000Z",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [0.123, -0.456, ...]
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "verificationMethod": "FACE",
  "note": null,
  "proofImagePath": "employee-uuid/2026-01-08/uuid.jpg",
  "proofImageMime": "image/jpeg"
}
```

---

## 📥 RESPONSE EXAMPLES

### ✅ Success Response (201 Created)

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-08T08:30:00.000Z",
    "verificationStatus": "VERIFIED",
    "matchScore": 0.9542,
    "livenessScore": 0.9821,
    "hasProof": true
  },
  "meta": {
    "requestId": "req-uuid-xxx"
  }
}
```

### ✅ Idempotent Response (200 OK)

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-08T08:30:00.000Z",
    "verificationStatus": "VERIFIED",
    "matchScore": 0.9542,
    "livenessScore": 0.9821,
    "hasProof": true,
    "message": "Attendance already recorded",
    "idempotent": true
  },
  "meta": {
    "requestId": "req-uuid-xxx"
  }
}
```

### ❌ Error: FACE_NOT_RECOGNIZED (401)

```json
{
  "error": {
    "code": "FACE_NOT_RECOGNIZED",
    "message": "Face not recognized or below threshold"
  }
}
```

**Penyebab:**
- Face embedding tidak match dengan template employee
- Cosine similarity < 0.70
- Employee dari face berbeda dengan employee dari token

### ❌ Error: ALREADY_CHECKED_IN (409)

```json
{
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "Employee already has an open check-in session"
  }
}
```

**Penyebab:** Sudah check-in hari ini, belum check-out

### ❌ Error: NOT_CHECKED_IN (409)

```json
{
  "error": {
    "code": "NOT_CHECKED_IN",
    "message": "No open check-in session found"
  }
}
```

**Penyebab:** Belum check-in, tidak bisa check-out

### ❌ Error: DUPLICATE_CAPTURE (409)

```json
{
  "error": {
    "code": "DUPLICATE_CAPTURE",
    "message": "This capture has already been processed"
  }
}
```

**Penyebab:** clientCaptureId sudah pernah digunakan (anti-replay)

### ❌ Error: CAPTURE_STALE (400)

```json
{
  "error": {
    "code": "CAPTURE_STALE",
    "message": "Capture timestamp is too old"
  }
}
```

**Penyebab:** Timestamp > 120 detik dari server time

### ❌ Error: DEVICE_NOT_REGISTERED (403)

```json
{
  "error": {
    "code": "DEVICE_NOT_REGISTERED",
    "message": "Device is not registered or inactive"
  }
}
```

**Penyebab:** Device disabled by admin

### ❌ Error: UNAUTHORIZED (401)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Penyebab:** Access token invalid/expired

### ❌ Error: VALIDATION_ERROR (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "payload": "Invalid input: expected object, received undefined",
      "embedding": "Invalid input: expected array of 128 floats"
    }
  }
}
```

**Penyebab:** Request body tidak sesuai schema

---

## 🔧 REQUIRED CODE CHANGES

### 1. Update Data Model

```kotlin
// BEFORE ❌
data class AttendanceRequest(
    val deviceId: String,
    val clientCaptureId: String,
    val capturedAt: String,
    val verificationMethod: String = "FACE",
    val matchScore: Float?,        // ❌ REMOVE
    val livenessScore: Float?,     // ❌ REMOVE
    val note: String? = null,
    val proofImagePath: String?,
    val proofImageMime: String?
)

// AFTER ✅
data class AttendanceRequest(
    val deviceId: String,
    val clientCaptureId: String,
    val capturedAt: String,
    val payload: EmbeddingPayload,     // ✅ ADD
    val liveness: LivenessInfo,        // ✅ ADD
    val verificationMethod: String = "FACE",
    val note: String? = null,
    val proofImagePath: String?,
    val proofImageMime: String?
)

data class EmbeddingPayload(
    val type: String = "EMBEDDING_V1",
    val embedding: List<Float>  // Exactly 128 floats
)

data class LivenessInfo(
    val provided: Boolean,
    val score: Float?
)
```

---

### 2. Update AttendanceViewModel

```kotlin
// BEFORE ❌
fun captureAttendance(type: AttendanceType) {
    viewModelScope.launch {
        val photo = capturePhoto()
        val uploadResult = uploadPhoto(photo)
        
        val request = AttendanceRequest(
            deviceId = deviceId,
            clientCaptureId = UUID.randomUUID().toString(),
            capturedAt = Clock.System.now().toIsoString(),
            verificationMethod = "FACE",
            matchScore = null,  // ❌ No face verification
            livenessScore = null,
            proofImagePath = uploadResult.filePath,
            proofImageMime = "image/jpeg"
        )
        
        attendanceRepository.checkIn(request)
    }
}

// AFTER ✅
fun captureAttendance(type: AttendanceType) {
    viewModelScope.launch {
        // 1. ✅ Detect face dan extract embedding
        val faceResult = faceDetectionManager.detectAndExtract(bitmap)
        if (faceResult == null) {
            _uiState.value = AttendanceUiState.Error("Wajah tidak terdeteksi")
            return@launch
        }
        
        // 2. ✅ Run liveness detection
        val livenessResult = livenessDetector.check()
        
        // 3. Capture foto
        val photo = capturePhoto()
        
        // 4. Upload foto
        val uploadResult = uploadPhoto(photo)
        
        // 5. ✅ Call API dengan embedding
        val request = AttendanceRequest(
            deviceId = deviceId,
            clientCaptureId = UUID.randomUUID().toString(),
            capturedAt = Clock.System.now().toIsoString(),
            payload = EmbeddingPayload(
                type = "EMBEDDING_V1",
                embedding = faceResult.embedding  // ✅ 128 floats
            ),
            liveness = LivenessInfo(
                provided = livenessResult.provided,
                score = livenessResult.score
            ),
            verificationMethod = "FACE",
            proofImagePath = uploadResult.filePath,
            proofImageMime = "image/jpeg",
            note = note
        )
        
        attendanceRepository.checkIn(request)
    }
}
```

---

### 3. Update Offline Queue (Room)

```kotlin
// BEFORE ❌
@Entity(tableName = "pending_attendance")
data class PendingAttendanceEntity(
    @PrimaryKey val clientCaptureId: String,
    val type: String,
    val deviceId: String,
    val capturedAt: String,
    val matchScore: Float?,        // ❌ REMOVE
    val livenessScore: Float?,     // ❌ REMOVE
    val proofImagePath: String?,
    val localPhotoUri: String?,
    val note: String?,
    val status: String
)

// AFTER ✅
@Entity(tableName = "pending_attendance")
data class PendingAttendanceEntity(
    @PrimaryKey val clientCaptureId: String,
    val type: String,
    val deviceId: String,
    val capturedAt: String,
    val embeddingJson: String,      // ✅ ADD: JSON string of List<Float>
    val livenessProvided: Boolean,  // ✅ ADD
    val livenessScore: Float?,      // ✅ ADD
    val proofImagePath: String?,
    val localPhotoUri: String?,
    val note: String?,
    val status: String
)
```

**Room Migration:**
```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(database: SupportSQLiteDatabase) {
        database.execSQL("ALTER TABLE pending_attendance DROP COLUMN matchScore")
        database.execSQL("ALTER TABLE pending_attendance DROP COLUMN livenessScore")
        database.execSQL("ALTER TABLE pending_attendance ADD COLUMN embeddingJson TEXT NOT NULL DEFAULT '[]'")
        database.execSQL("ALTER TABLE pending_attendance ADD COLUMN livenessProvided INTEGER NOT NULL DEFAULT 0")
        database.execSQL("ALTER TABLE pending_attendance ADD COLUMN livenessScore REAL")
    }
}
```

---

### 4. Update Sync Worker

```kotlin
// AFTER ✅
val embedding = Json.decodeFromString<List<Float>>(pending.embeddingJson)

val request = AttendanceRequest(
    deviceId = pending.deviceId,
    clientCaptureId = pending.clientCaptureId,
    capturedAt = pending.capturedAt,
    payload = EmbeddingPayload(
        type = "EMBEDDING_V1",
        embedding = embedding
    ),
    liveness = LivenessInfo(
        provided = pending.livenessProvided,
        score = pending.livenessScore
    ),
    verificationMethod = "FACE",
    proofImagePath = proofImagePath,
    proofImageMime = pending.proofImageMime
)
```

---

### 5. Error Handling

```kotlin
override suspend fun checkIn(request: AttendanceRequest): Result<Attendance> {
    return try {
        val response = api.checkIn(request)
        Result.success(response.data)
    } catch (e: HttpException) {
        when (e.code()) {
            401 -> {
                val error = e.parseError()
                if (error?.code == "FACE_NOT_RECOGNIZED") {
                    Result.failure(FaceNotRecognizedException(
                        "Wajah tidak dikenali. Pastikan wajah terlihat jelas."
                    ))
                } else {
                    Result.failure(UnauthorizedException())
                }
            }
            409 -> {
                val error = e.parseError()
                when (error?.code) {
                    "ALREADY_CHECKED_IN" -> Result.failure(AlreadyCheckedInException())
                    "NOT_CHECKED_IN" -> Result.failure(NotCheckedInException())
                    "DUPLICATE_CAPTURE" -> Result.failure(DuplicateCaptureException())
                    else -> Result.failure(e)
                }
            }
            400 -> {
                val error = e.parseError()
                if (error?.code == "CAPTURE_STALE") {
                    Result.failure(CaptureStaleException())
                } else {
                    Result.failure(ValidationException(error?.message ?: ""))
                }
            }
            else -> Result.failure(e)
        }
    }
}

// Custom Exceptions
class FaceNotRecognizedException(message: String) : Exception(message)
class AlreadyCheckedInException(message: String = "Sudah check-in hari ini") : Exception(message)
class NotCheckedInException(message: String = "Belum check-in") : Exception(message)
class DuplicateCaptureException(message: String = "Capture sudah diproses") : Exception(message)
class CaptureStaleException(message: String = "Timestamp tidak valid") : Exception(message)
class ValidationException(message: String) : Exception(message)
```

---

## 📋 ERROR CODES SUMMARY

| Error Code | HTTP | UI Action |
|------------|------|-----------|
| `FACE_NOT_RECOGNIZED` | 401 | Snackbar: "Wajah tidak dikenali" |
| `ALREADY_CHECKED_IN` | 409 | Dialog: "Sudah check-in hari ini" |
| `NOT_CHECKED_IN` | 409 | Dialog: "Belum check-in" |
| `DUPLICATE_CAPTURE` | 409 | Generate new captureId, retry |
| `CAPTURE_STALE` | 400 | Dialog: "Sinkronkan waktu device" |
| `DEVICE_NOT_REGISTERED` | 403 | Dialog: "Device nonaktif, hubungi HR" |
| `UNAUTHORIZED` | 401 | Logout, redirect to login |
| `VALIDATION_ERROR` | 400 | Log error, generic message |

---

## ✅ CHECKLIST

- [ ] Update `AttendanceRequest` model dengan `payload` & `liveness`
- [ ] Hapus field `matchScore` dan `livenessScore`
- [ ] Integrate face detection ke attendance screen
- [ ] Extract 128-dim embedding saat capture
- [ ] Update offline queue dengan `embeddingJson`
- [ ] Create Room migration v1 → v2
- [ ] Update sync worker untuk parse embedding
- [ ] Handle error `FACE_NOT_RECOGNIZED`
- [ ] Test check-in dengan face verification
- [ ] Test check-out dengan face verification
- [ ] Test offline → online sync
- [ ] Test idempotency dengan retry

---

## 📞 SUPPORT

- **Backend API**: https://absensi-web-rouge.vercel.app
- **Face Threshold**: 0.70 (cosine similarity)
- **Embedding**: 128 floats (MobileFaceNet)
- **Max Timestamp Skew**: 120 seconds
- **Full Documentation**: [`GUIDE-PROMPT-PHASE2.md`](GUIDE-PROMPT-PHASE2.md)

---

**Generated**: 2026-01-08  
**Status**: 🔴 **Action Required**
