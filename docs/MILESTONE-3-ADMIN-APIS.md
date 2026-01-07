# Milestone 3: Admin APIs

## Overview
Implementasi REST API untuk CRUD employees dan devices dengan validasi Zod, pagination, dan response format standar.

## API Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

## Response Helper (`src/lib/api/response.ts`)

```typescript
// Success response
successResponse(data, { status: 200, pagination: { ... } })

// Error response
errorResponse(code, message, { status: 400, details: { ... } })

// Validation error
validationErrorResponse(zodError)

// Common errors
errors.unauthorized()      // 401
errors.forbidden()         // 403
errors.notFound()          // 404
errors.conflict()          // 409
errors.internalError()     // 500
errors.badRequest()        // 400
```

## Validators (`src/lib/validators/`)

### Employee Validators
```typescript
// Create employee
createEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(50),
  fullName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
})

// Update employee
updateEmployeeSchema = createEmployeeSchema.partial()

// Query params
employeeQuerySchema = z.object({
  search: z.string().optional(),
  active: z.boolean().optional(),
  department: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})
```

### Device Validators
```typescript
// Create device
createDeviceSchema = z.object({
  deviceUniqueId: z.string().min(1).max(255),
  deviceName: z.string().min(1).max(255),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
})

// Update device
updateDeviceSchema = createDeviceSchema.partial().extend({
  active: z.boolean().optional(),
})
```

### Face Enrollment Validator
```typescript
faceEnrollSchema = z.object({
  embedding: z.array(z.number()).length(128),
  version: z.number().int().positive().optional(),
})
```

---

## Employee APIs

### GET /api/employees
List employees dengan pagination dan search.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | - | Search by name/code/email |
| active | boolean | - | Filter by status |
| department | string | - | Filter by department |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "employeeCode": "EMP001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+62812345678",
      "jobTitle": "Software Engineer",
      "department": "Engineering",
      "active": true,
      "createdAt": "2026-01-07T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
  }
}
```

### POST /api/employees
Create new employee.

**Request Body:**
```json
{
  "employeeCode": "EMP005",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "department": "HR"
}
```

**Response:** `201 Created`

### GET /api/employees/[id]
Get single employee by ID.

**Response:** `200 OK` with employee data

### PUT /api/employees/[id]
Update employee.

**Request Body:** Partial employee data
**Response:** `200 OK` with updated employee

### DELETE /api/employees/[id]
Soft delete employee (set active=false).

**Response:** `200 OK`

---

### POST /api/employees/[id]/face/enroll
Enroll face template for employee.

**Request Body:**
```json
{
  "embedding": [0.123, 0.456, ...], // 128 numbers
  "version": 1
}
```

**Flow:**
1. Validate embedding length (128)
2. Deactivate existing templates
3. Insert new template
4. Return success

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "employeeId": "uuid",
    "version": 1,
    "isActive": true
  }
}
```

---

## Device APIs

### GET /api/devices
List devices dengan pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | - | Search by name/id |
| active | boolean | - | Filter by status |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

### POST /api/devices
Register new device.

**Request Body:**
```json
{
  "deviceUniqueId": "ANDROID-ABC123",
  "deviceName": "Office Tablet 1",
  "deviceModel": "Samsung Galaxy Tab A8",
  "osVersion": "Android 13"
}
```

### GET /api/devices/[id]
Get single device.

### PUT /api/devices/[id]
Update device.

### DELETE /api/devices/[id]
Soft delete device.

---

## File Structure

```
src/
├── lib/
│   ├── api/
│   │   └── response.ts       # Response helpers
│   └── validators/
│       ├── employees.ts      # Employee schemas
│       ├── devices.ts        # Device schemas
│       └── face.ts           # Face enrollment schema
└── app/
    └── api/
        ├── employees/
        │   ├── route.ts              # GET, POST
        │   └── [id]/
        │       ├── route.ts          # GET, PUT, DELETE
        │       └── face/
        │           └── enroll/
        │               └── route.ts  # POST face enrollment
        └── devices/
            ├── route.ts              # GET, POST
            └── [id]/
                └── route.ts          # GET, PUT, DELETE
```

## Authentication

Semua endpoint memerlukan admin authentication:

```typescript
const authResult = await requireAdmin()
if (authResult instanceof Response) {
  return authResult // 401 or 403
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not admin role |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request body |
| DUPLICATE_EMPLOYEE_CODE | 409 | Employee code exists |
| DUPLICATE_DEVICE_ID | 409 | Device ID exists |
| INTERNAL_ERROR | 500 | Server error |

## Testing

### Create Employee
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{"employeeCode":"EMP005","fullName":"Test User"}'
```

### List Employees with Search
```bash
curl "http://localhost:3000/api/employees?search=john&page=1&limit=10" \
  -H "Cookie: sb-xxx-auth-token=..."
```

### Enroll Face
```bash
curl -X POST http://localhost:3000/api/employees/uuid/face/enroll \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{"embedding":[0.1,0.2,...128 numbers...]}'
```
