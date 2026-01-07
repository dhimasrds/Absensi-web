# Milestone 5: Upload URL & Attendance APIs

## Overview
Implementasi API untuk upload proof image dan recording attendance (check-in/check-out) dengan idempotency support dan open session rules.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Get Upload  │────▶│  Supabase       │────▶│  Upload Image    │
│  URL         │     │  Storage        │     │  (Signed URL)    │
└──────────────┘     └─────────────────┘     └──────────────────┘
                              
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Check-in    │────▶│  Idempotency    │────▶│  attendance_logs │
│  Check-out   │     │  Check          │     │  (Insert)        │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

## Business Rules

### Check-in Rules
1. Tidak bisa check-in jika sudah ada check-in hari ini tanpa check-out
2. `clientCaptureId` harus unique (idempotency)

### Check-out Rules
1. Harus ada check-in sebelumnya di hari yang sama
2. Tidak bisa check-out jika belum check-in

### Idempotency
- Setiap request memiliki `clientCaptureId` unique
- Jika `clientCaptureId` sudah ada, return existing record
- Mencegah duplicate dari network retry

---

## API Endpoints

### POST /api/mobile/upload-url

Generate signed URL untuk upload proof image.

**Headers:**
```
Authorization: Bearer eyJ...
```

**Request Body:**
```json
{
  "deviceId": "uuid",
  "contentType": "image/jpeg"
}
```

**Validations:**
1. Device ID harus match dengan token
2. Content type harus image/jpeg atau image/png

**Response:**
```json
{
  "data": {
    "uploadUrl": "https://xxx.supabase.co/storage/v1/object/upload/sign/...",
    "filePath": "employee-uuid/2026-01-07/uuid.jpg",
    "expiresAt": "2026-01-07T08:05:00Z",
    "token": "upload-token"
  }
}
```

**File Path Structure:**
```
attendance-proofs/
└── {employee_id}/
    └── {date}/
        └── {uuid}.{ext}
```

---

### POST /api/mobile/attendance/check-in

Record check-in attendance.

**Headers:**
```
Authorization: Bearer eyJ...
```

**Request Body:**
```json
{
  "deviceId": "uuid",
  "clientCaptureId": "unique-capture-id-from-app",
  "capturedAt": "2026-01-07T08:00:00Z",
  "verificationMethod": "FACE",
  "matchScore": 0.95,
  "livenessScore": 0.98,
  "note": "Optional note",
  "proofImagePath": "employee-uuid/2026-01-07/uuid.jpg",
  "proofImageMime": "image/jpeg"
}
```

**Flow:**
```
1. Validate JWT & device match
2. Check idempotency (clientCaptureId)
   - If exists, return existing record
3. Check open session (last attendance today)
   - If last = CHECK_IN, return error (already checked in)
4. Insert attendance_log
5. Return success
```

**Success Response (New):**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-07T08:00:00Z",
    "verificationStatus": "VERIFIED",
    "message": "Check-in recorded successfully",
    "idempotent": false
  }
}
```

**Success Response (Idempotent):**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_IN",
    "capturedAt": "2026-01-07T08:00:00Z",
    "message": "Attendance already recorded",
    "idempotent": true
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| DEVICE_MISMATCH | 403 | Device ID tidak match dengan token |
| ALREADY_CHECKED_IN | 409 | Sudah check-in, belum check-out |

---

### POST /api/mobile/attendance/check-out

Record check-out attendance.

**Request Body:** Same as check-in

**Flow:**
```
1. Validate JWT & device match
2. Check idempotency (clientCaptureId)
3. Check open session
   - If no attendance today OR last = CHECK_OUT, return error
4. Insert attendance_log
5. Calculate work duration
6. Return success with duration
```

**Success Response:**
```json
{
  "data": {
    "id": "uuid",
    "attendanceType": "CHECK_OUT",
    "capturedAt": "2026-01-07T17:00:00Z",
    "verificationStatus": "VERIFIED",
    "checkInId": "uuid",
    "checkInAt": "2026-01-07T08:00:00Z",
    "workDuration": {
      "hours": 9,
      "minutes": 0,
      "totalMinutes": 540
    },
    "message": "Check-out recorded successfully",
    "idempotent": false
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| NOT_CHECKED_IN | 409 | Belum check-in hari ini |

---

### GET /api/mobile/attendance/history

Get attendance history for authenticated employee.

**Headers:**
```
Authorization: Bearer eyJ...
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| from | datetime | - | Filter from date |
| to | datetime | - | Filter to date |
| type | enum | - | CHECK_IN / CHECK_OUT |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "attendanceType": "CHECK_IN",
      "capturedAt": "2026-01-07T08:00:00Z",
      "verificationMethod": "FACE",
      "verificationStatus": "VERIFIED",
      "matchScore": 0.95,
      "livenessScore": 0.98,
      "note": null,
      "hasProof": true
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## Validators (`src/lib/validators/attendance.ts`)

```typescript
// Upload URL
uploadUrlSchema = z.object({
  deviceId: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png']).default('image/jpeg')
})

// Mobile attendance (check-in/out)
mobileAttendanceSchema = z.object({
  employeeId: z.string().uuid().optional(),
  deviceId: z.string().min(1),
  clientCaptureId: z.string().min(1),
  capturedAt: z.string().datetime(),
  verificationMethod: z.enum(['FACE', 'MANUAL_ADMIN']).default('FACE'),
  matchScore: z.number().min(0).max(1).optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  note: z.string().max(500).optional(),
  proofImagePath: z.string().optional(),
  proofImageMime: z.string().optional()
})

// History query
mobileHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})
```

## File Structure

```
src/
├── lib/
│   └── validators/
│       └── attendance.ts
└── app/
    └── api/
        └── mobile/
            ├── upload-url/
            │   └── route.ts
            └── attendance/
                ├── check-in/
                │   └── route.ts
                ├── check-out/
                │   └── route.ts
                └── history/
                    └── route.ts
```

## Attendance Data Fields

| Field | Source | Description |
|-------|--------|-------------|
| employee_id | JWT | Dari token payload |
| device_id | JWT | Dari token payload |
| session_id | JWT | Dari token payload |
| attendance_type | API | CHECK_IN / CHECK_OUT |
| attendance_source | System | ANDROID (fixed) |
| client_capture_id | Client | Unique ID dari app |
| captured_at | Client | Waktu capture |
| verification_method | Client | FACE / MANUAL_ADMIN |
| verification_status | System | VERIFIED jika score ≥ 0.7 |
| match_score | Client | Face match score |
| liveness_score | Client | Liveness score |
| proof_image_path | Client | Path di storage |

## Testing

### Get Upload URL
```bash
curl -X POST http://localhost:3000/api/mobile/upload-url \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "uuid", "contentType": "image/jpeg"}'
```

### Check-in
```bash
curl -X POST http://localhost:3000/api/mobile/attendance/check-in \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "uuid",
    "clientCaptureId": "capture-001",
    "capturedAt": "2026-01-07T08:00:00Z",
    "matchScore": 0.95
  }'
```

### Check-out
```bash
curl -X POST http://localhost:3000/api/mobile/attendance/check-out \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "uuid",
    "clientCaptureId": "capture-002",
    "capturedAt": "2026-01-07T17:00:00Z",
    "matchScore": 0.95
  }'
```

### Get History
```bash
curl "http://localhost:3000/api/mobile/attendance/history?from=2026-01-01&limit=10" \
  -H "Authorization: Bearer eyJ..."
```

## Race Condition Handling

Menggunakan database unique constraint pada `client_capture_id`:
```sql
CREATE UNIQUE INDEX idx_attendance_client_capture 
ON attendance_logs(client_capture_id);
```

Jika terjadi constraint violation (race condition), API akan:
1. Catch error code 23505
2. Fetch existing record
3. Return existing record (idempotent)
