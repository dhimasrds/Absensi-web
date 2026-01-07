# Milestone 6: Admin Attendance APIs

## Overview
Implementasi API untuk admin mengelola dan melihat data attendance dengan filter, pagination, dan akses proof image.

## API Endpoints

### GET /api/attendance

List semua attendance records dengan filter dan pagination.

**Authentication:** Supabase Auth (Admin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| employeeId | uuid | - | Filter by employee |
| from | datetime | - | Filter from date |
| to | datetime | - | Filter to date |
| type | enum | - | CHECK_IN / CHECK_OUT |
| source | enum | - | WEB_ADMIN / ANDROID |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| sortDir | enum | desc | asc / desc |

**Example Request:**
```bash
curl "http://localhost:3000/api/attendance?from=2026-01-01&type=CHECK_IN&page=1&limit=10" \
  -H "Cookie: sb-xxx-auth-token=..."
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "employeeId": "uuid",
      "employee": {
        "code": "EMP001",
        "name": "John Doe",
        "department": "Engineering",
        "jobTitle": "Software Engineer"
      },
      "device": {
        "name": "Office Tablet 1",
        "model": "Samsung Tab A8"
      },
      "attendanceType": "CHECK_IN",
      "attendanceSource": "ANDROID",
      "capturedAt": "2026-01-07T08:00:00Z",
      "verificationMethod": "FACE",
      "verificationStatus": "VERIFIED",
      "matchScore": 0.95,
      "livenessScore": 0.98,
      "note": null,
      "hasProof": true,
      "createdAt": "2026-01-07T08:00:01Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

### GET /api/attendance/[id]

Get single attendance record dengan detail lengkap.

**Authentication:** Supabase Auth (Admin)

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "employee": {
      "id": "uuid",
      "code": "EMP001",
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "jobTitle": "Software Engineer"
    },
    "device": {
      "id": "uuid",
      "name": "Office Tablet 1",
      "model": "Samsung Tab A8",
      "osVersion": "Android 13"
    },
    "attendanceType": "CHECK_IN",
    "attendanceSource": "ANDROID",
    "clientCaptureId": "capture-001",
    "capturedAt": "2026-01-07T08:00:00Z",
    "verificationMethod": "FACE",
    "verificationStatus": "VERIFIED",
    "matchScore": 0.95,
    "livenessScore": 0.98,
    "note": null,
    "proofImagePath": "employee-uuid/2026-01-07/uuid.jpg",
    "proofImageMime": "image/jpeg",
    "createdAt": "2026-01-07T08:00:01Z"
  }
}
```

---

### GET /api/attendance/[id]/proof-url

Generate signed URL untuk melihat proof image.

**Authentication:** Supabase Auth (Admin)

**Response:**
```json
{
  "data": {
    "attendanceId": "uuid",
    "proofUrl": "https://xxx.supabase.co/storage/v1/object/sign/attendance-proofs/...",
    "mimeType": "image/jpeg",
    "expiresIn": 3600
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| NOT_FOUND | 404 | Attendance record tidak ditemukan |
| NOT_FOUND | 404 | Proof image tidak tersedia |

---

## Validators (`src/lib/validators/attendance.ts`)

```typescript
// Admin query
attendanceQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  source: z.enum(['WEB_ADMIN', 'ANDROID']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortDir: z.enum(['asc', 'desc']).default('desc')
})
```

## File Structure

```
src/
└── app/
    └── api/
        └── attendance/
            ├── route.ts              # GET list
            └── [id]/
                ├── route.ts          # GET single
                └── proof-url/
                    └── route.ts      # GET proof URL
```

## Database Query

### List Query dengan Join
```typescript
supabase
  .from('attendance_logs')
  .select(`
    *,
    employees!inner (
      employee_code,
      full_name,
      department,
      job_title
    ),
    devices (
      device_name,
      device_model
    )
  `, { count: 'exact' })
  .order('captured_at', { ascending: sortDir === 'asc' })
```

## Response Transformation

API melakukan transformasi dari snake_case database ke camelCase response:

| Database Field | Response Field |
|----------------|----------------|
| employee_code | employeeCode |
| full_name | fullName |
| attendance_type | attendanceType |
| captured_at | capturedAt |
| match_score | matchScore |
| proof_image_path | hasProof (boolean) |

## Signed URL Details

- **Bucket**: attendance-proofs
- **Expiry**: 1 jam (3600 detik)
- **Access**: Private bucket, requires signed URL

```typescript
supabase.storage
  .from('attendance-proofs')
  .createSignedUrl(path, 3600)
```

## Testing

### List Attendance
```bash
# All attendance
curl "http://localhost:3000/api/attendance" \
  -H "Cookie: sb-xxx-auth-token=..."

# With filters
curl "http://localhost:3000/api/attendance?employeeId=uuid&type=CHECK_IN&from=2026-01-01" \
  -H "Cookie: sb-xxx-auth-token=..."
```

### Get Single Attendance
```bash
curl "http://localhost:3000/api/attendance/uuid" \
  -H "Cookie: sb-xxx-auth-token=..."
```

### Get Proof URL
```bash
curl "http://localhost:3000/api/attendance/uuid/proof-url" \
  -H "Cookie: sb-xxx-auth-token=..."
```

### View Proof Image
```bash
# Use the signed URL from proof-url response
curl "https://xxx.supabase.co/storage/v1/object/sign/..." -o proof.jpg
```

## Use Cases

### 1. Daily Attendance Report
```
GET /api/attendance?from=2026-01-07T00:00:00Z&to=2026-01-07T23:59:59Z&sortDir=asc
```

### 2. Employee Attendance History
```
GET /api/attendance?employeeId=uuid&limit=50
```

### 3. Pending Verifications
```
GET /api/attendance?verificationStatus=PENDING
```

### 4. Export Data (pagination)
```
GET /api/attendance?page=1&limit=100
GET /api/attendance?page=2&limit=100
...
```
