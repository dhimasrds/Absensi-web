# Milestone 4: Mobile Authentication

## Overview
Implementasi autentikasi untuk aplikasi mobile Android menggunakan face recognition dan JWT token management.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Android App │────▶│  Face Login API │────▶│  face_identify   │
│  (Capture)   │     │  /face-login    │     │  (RPC)           │
└──────────────┘     └─────────────────┘     └──────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  JWT Tokens     │
                     │  - Access (15m) │
                     │  - Refresh (7d) │
                     └─────────────────┘
```

## JWT Token Design

### Access Token
- **Algorithm**: HS256
- **Expiry**: 15 minutes
- **Usage**: Authorization header

**Payload:**
```json
{
  "employeeId": "uuid",
  "deviceId": "uuid",
  "sessionId": "uuid",
  "type": "access",
  "iat": 1704067200,
  "exp": 1704068100
}
```

### Refresh Token
- **Format**: Random UUID + timestamp
- **Expiry**: 7 days
- **Storage**: Hashed (bcrypt) in database
- **Usage**: Body of refresh request

## Components

### 1. JWT Utilities (`src/lib/auth/mobileJwt.ts`)

```typescript
// Generate token pair
generateTokenPair(payload: {
  employeeId: string
  deviceId: string
  sessionId: string
}): Promise<{
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}>

// Verify access token
verifyAccessToken(token: string): Promise<MobileJwtPayload>

// Hash refresh token for storage
hashRefreshToken(token: string): Promise<string>

// Verify refresh token against hash
verifyRefreshTokenHash(token: string, hash: string): Promise<boolean>
```

### 2. Mobile Guard (`src/lib/auth/mobileGuard.ts`)

```typescript
// Validate JWT from Authorization header
requireMobileAuth(request: NextRequest): Promise<MobileJwtPayload>

// Validate device ID match
validateDeviceMatch(tokenDeviceId: string, requestDeviceId: string): void

// Validate employee ID match (optional)
validateEmployeeMatch(tokenEmployeeId: string, requestEmployeeId?: string): void
```

### 3. Face Identification (`src/lib/face/identify.ts`)

```typescript
// Identify face using embedding
identifyFace(embedding: number[], threshold?: number): Promise<{
  employeeId: string
  employeeCode: string
  fullName: string
  similarity: number
} | null>

// Check if device is active
checkDeviceActive(deviceUniqueId: string): Promise<Device | null>
```

---

## API Endpoints

### POST /api/mobile/auth/face-login

Login menggunakan face recognition.

**Request Body:**
```json
{
  "deviceUniqueId": "ANDROID-ABC123",
  "embedding": [0.123, 0.456, ...], // 128 numbers
  "capturedAt": "2026-01-07T08:00:00Z"
}
```

**Validations:**
1. Device registered & active
2. Capture tidak lebih dari 60 detik yang lalu (anti-replay)
3. Face embedding match dengan threshold ≥ 0.7

**Flow:**
```
1. Validate request body (Zod)
2. Check device exists & active
3. Check capture timestamp (≤ 60s ago)
4. Call face_identify_v1 RPC
5. Create mobile_session
6. Generate JWT tokens
7. Return tokens + employee info
```

**Success Response:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "uuid-token-xxx",
    "accessTokenExpiresAt": "2026-01-07T08:15:00Z",
    "refreshTokenExpiresAt": "2026-01-14T08:00:00Z",
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP001",
      "fullName": "John Doe"
    },
    "device": {
      "id": "uuid",
      "deviceName": "Office Tablet 1"
    }
  }
}
```

**Error Responses:**
| Code | Status | Description |
|------|--------|-------------|
| DEVICE_NOT_REGISTERED | 403 | Device tidak terdaftar |
| CAPTURE_STALE | 400 | Capture > 60 detik |
| FACE_NOT_RECOGNIZED | 401 | Wajah tidak dikenali |

---

### POST /api/mobile/auth/refresh

Refresh access token menggunakan refresh token.

**Request Body:**
```json
{
  "refreshToken": "uuid-token-xxx"
}
```

**Validations:**
1. Session exists & not revoked
2. Session not expired
3. Refresh token hash matches

**Flow:**
```
1. Find all non-revoked sessions
2. Compare refresh token hash
3. Check expiry
4. Generate new access token only
5. Return new access token
```

**Success Response:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-01-07T08:30:00Z"
  }
}
```

---

### POST /api/mobile/auth/logout

Revoke refresh token (logout).

**Request Body:**
```json
{
  "refreshToken": "uuid-token-xxx"
}
```

**Flow:**
```
1. Find session by token hash
2. Set revoked_at timestamp
3. Return success (idempotent)
```

**Response:**
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### GET /api/mobile/me

Get current authenticated employee info.

**Headers:**
```
Authorization: Bearer eyJ...
```

**Response:**
```json
{
  "data": {
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP001",
      "fullName": "John Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "hasEnrolledFace": true,
      "activeFaceTemplates": 1
    },
    "device": {
      "id": "uuid",
      "deviceName": "Office Tablet 1",
      "deviceModel": "Samsung Tab A8"
    },
    "session": {
      "employeeId": "uuid",
      "deviceId": "uuid",
      "sessionId": "uuid",
      "activeSessions": 1
    }
  }
}
```

---

## Validators (`src/lib/validators/mobileAuth.ts`)

```typescript
// Face login
faceLoginSchema = z.object({
  deviceUniqueId: z.string().min(1),
  embedding: z.array(z.number()).length(128),
  capturedAt: z.string().datetime()
})

// Refresh token
refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
})

// Logout
logoutSchema = z.object({
  refreshToken: z.string().min(1)
})
```

## File Structure

```
src/
├── lib/
│   ├── auth/
│   │   ├── mobileJwt.ts      # JWT utilities
│   │   └── mobileGuard.ts    # Auth guard
│   ├── face/
│   │   └── identify.ts       # Face identification
│   └── validators/
│       └── mobileAuth.ts     # Validation schemas
└── app/
    └── api/
        └── mobile/
            ├── auth/
            │   ├── face-login/
            │   │   └── route.ts
            │   ├── refresh/
            │   │   └── route.ts
            │   └── logout/
            │       └── route.ts
            └── me/
                └── route.ts
```

## Security Features

### Anti-Replay Protection
- `capturedAt` harus dalam 60 detik terakhir
- Mencegah replay attack dengan capture lama

### Device Binding
- Token terikat ke device ID
- Device harus aktif untuk login

### Token Security
- Access token short-lived (15 menit)
- Refresh token hashed di database
- Session dapat di-revoke

## Environment Variables

```env
APP_JWT_SECRET=your-secret-key-min-32-chars
```

## Testing

### Face Login
```bash
curl -X POST http://localhost:3000/api/mobile/auth/face-login \
  -H "Content-Type: application/json" \
  -d '{
    "deviceUniqueId": "ANDROID-DEVICE-001",
    "embedding": [0.1, 0.2, ...128 numbers...],
    "capturedAt": "2026-01-07T08:00:00Z"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/mobile/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "uuid-token-xxx"}'
```

### Get Me
```bash
curl http://localhost:3000/api/mobile/me \
  -H "Authorization: Bearer eyJ..."
```

### Logout
```bash
curl -X POST http://localhost:3000/api/mobile/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "uuid-token-xxx"}'
```
