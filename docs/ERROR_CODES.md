# API Error Codes Reference

Complete list of error codes used across all API endpoints in the Absensi system.

## Table of Contents
- [Authentication Errors](#authentication-errors)
- [Face Recognition Errors](#face-recognition-errors)
- [Attendance Errors](#attendance-errors)
- [Employee Management Errors](#employee-management-errors)
- [Work Location Errors](#work-location-errors)
- [Settings Errors](#settings-errors)
- [Validation Errors](#validation-errors)
- [General Errors](#general-errors)
- [Error Response Format](#error-response-format)
- [Mobile App Error Handling Guidelines](#mobile-app-error-handling-guidelines)

---

## Authentication Errors

### `UNAUTHORIZED`
- **HTTP Status**: 401
- **Message**: "Missing or invalid authorization token"
- **Endpoints**: All protected endpoints
- **Cause**: No token provided or token is invalid
- **Action**: Redirect to login

### `TOKEN_EXPIRED`
- **HTTP Status**: 401
- **Message**: "Token has expired"
- **Endpoints**: All protected endpoints with JWT validation
- **Cause**: Access token has expired
- **Action**: Use refresh token to get new access token

### `INVALID_CREDENTIALS`
- **HTTP Status**: 401
- **Message**: "Invalid email or password"
- **Endpoints**: `/api/mobile/auth/login`
- **Cause**: Wrong email/password combination
- **Action**: Show error, allow retry

### `SESSION_NOT_FOUND`
- **HTTP Status**: 404
- **Message**: "Session not found or expired"
- **Endpoints**: 
  - `/api/mobile/auth/logout`
  - `/api/mobile/auth/refresh`
- **Cause**: Session doesn't exist or has expired
- **Action**: Treat as logged out, redirect to login

### `DEVICE_MISMATCH`
- **HTTP Status**: 403
- **Message**: "Device ID does not match the session"
- **Endpoints**: All protected mobile endpoints
- **Cause**: Token is being used from different device
- **Action**: Force logout, require re-login

### `REFRESH_TOKEN_EXPIRED`
- **HTTP Status**: 401
- **Message**: "Refresh token has expired"
- **Endpoints**: `/api/mobile/auth/refresh`
- **Cause**: Refresh token has expired
- **Action**: Force logout, redirect to login

### `EMPLOYEE_NOT_FOUND` (Auth Context)
- **HTTP Status**: 404
- **Message**: "Employee not found or inactive"
- **Endpoints**: `/api/mobile/auth/*`
- **Cause**: Employee record doesn't exist or is inactive
- **Action**: Show error, contact administrator

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authorization token"
  }
}
```

---

## Face Recognition Errors

### `FACE_BELOW_THRESHOLD`
- **HTTP Status**: 401
- **Message**: "Face match score (X%) is below threshold (Y%). Gap: Z%. Try better lighting or re-enroll your face."
- **Endpoints**: 
  - `/api/mobile/auth/face-login`
  - `/api/mobile/attendance/check-in`
  - `/api/mobile/attendance/check-out`
- **Cause**: Face recognition confidence score is below required threshold
- **Action**: Show detailed message, suggest better lighting or re-enrollment
- **Additional Data**:
  - `matchScore`: Actual match score (0.0 - 1.0)
  - `threshold`: Required threshold (0.0 - 1.0)
  - `gap`: Difference between score and threshold
  - `nearestMatch`: Info about closest match found

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "FACE_BELOW_THRESHOLD",
    "message": "Face match score (55%) is below threshold (60%). Gap: 5%. Try better lighting or re-enroll your face.",
    "details": {
      "matchScore": 0.55,
      "threshold": 0.60,
      "gap": 0.05,
      "nearestMatch": {
        "employeeCode": "EMP001",
        "score": 0.55
      }
    }
  }
}
```

### `FACE_NO_MATCH`
- **HTTP Status**: 401
- **Message**: "No registered face found. Please enroll your face first."
- **Endpoints**: Same as `FACE_BELOW_THRESHOLD`
- **Cause**: No face template found in database
- **Action**: Redirect to face enrollment

### `FACE_NOT_RECOGNIZED`
- **HTTP Status**: 401
- **Message**: "Face not recognized or below threshold"
- **Endpoints**: Same as `FACE_BELOW_THRESHOLD`
- **Cause**: Generic face recognition failure
- **Action**: Show error, allow retry

### `EMPLOYEE_INACTIVE` (Face Context)
- **HTTP Status**: 401
- **Message**: "Employee {code} is inactive. Please contact administrator."
- **Endpoints**: Face-based authentication endpoints
- **Cause**: Employee account is deactivated
- **Action**: Show message, contact admin

### `EMPLOYEE_NOT_FOUND` (Face Context)
- **HTTP Status**: 404
- **Message**: "Employee with code {code} not found"
- **Endpoints**: `/api/mobile/face/enroll`
- **Cause**: Employee code doesn't exist
- **Action**: Verify employee code, contact admin

---

## Attendance Errors

### `ALREADY_CHECKED_IN`
- **HTTP Status**: 409
- **Message**: "Employee already has an open check-in session"
- **Endpoints**: `/api/mobile/attendance/check-in`
- **Cause**: Trying to check-in when already checked in
- **Action**: Show existing check-in time, offer check-out option
- **Additional Data**:
  - `existingCheckIn`: Details of existing check-in record

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_CHECKED_IN",
    "message": "Employee already has an open check-in session",
    "details": {
      "existingCheckIn": {
        "id": "abc-123",
        "capturedAt": "2026-01-21T08:30:00Z",
        "location": "Main Office"
      }
    }
  }
}
```

### `NOT_CHECKED_IN`
- **HTTP Status**: 409
- **Message**: "No open check-in session found"
- **Endpoints**: `/api/mobile/attendance/check-out`
- **Cause**: Trying to check-out without checking in first
- **Action**: Show message, redirect to check-in

### `ATTENDANCE_NOT_FOUND`
- **HTTP Status**: 404
- **Message**: "Attendance record not found"
- **Endpoints**: 
  - `/api/attendance/[id]`
  - `/api/mobile/attendance/[id]`
- **Cause**: Attendance record with given ID doesn't exist
- **Action**: Show error, refresh list

### `INVALID_TRANSITION`
- **HTTP Status**: 409
- **Message**: "Cannot transition from {current} to {target}"
- **Endpoints**: `/api/attendance/[id]` (PATCH)
- **Cause**: Invalid status transition attempt
- **Action**: Show error, refresh data

---

## Employee Management Errors

### `EMPLOYEE_NOT_FOUND`
- **HTTP Status**: 404
- **Message**: "Employee not found"
- **Endpoints**: 
  - `/api/employees/[id]` (GET, PATCH, DELETE)
  - `/api/employees/[id]/face/enroll`
  - `/api/employees/[id]/face/photo`
- **Cause**: Employee with given ID doesn't exist
- **Action**: Show error, refresh employee list

### `EMPLOYEE_ID_EXISTS`
- **HTTP Status**: 409
- **Message**: "Employee with this ID already exists"
- **Endpoints**: `/api/employees` (POST)
- **Cause**: Duplicate employee_id
- **Action**: Show error, use different employee code

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "EMPLOYEE_ID_EXISTS",
    "message": "Employee with this ID already exists",
    "details": {
      "field": "employee_id",
      "value": "EMP001"
    }
  }
}
```

### `EMPLOYEE_EMAIL_EXISTS`
- **HTTP Status**: 409
- **Message**: "Employee with this email already exists"
- **Endpoints**: `/api/employees` (POST, PATCH)
- **Cause**: Duplicate email address
- **Action**: Show error, use different email

---

## Work Location Errors

### `WORK_LOCATION_NOT_FOUND`
- **HTTP Status**: 404
- **Message**: "Work location not found"
- **Endpoints**: `/api/work-locations/[id]` (GET, PATCH, DELETE)
- **Cause**: Location with given ID doesn't exist
- **Action**: Show error, refresh location list

### `LOCATION_NAME_EXISTS`
- **HTTP Status**: 409
- **Message**: "Location with this name already exists"
- **Endpoints**: `/api/work-locations` (POST)
- **Cause**: Duplicate location name
- **Action**: Show error, use different name

---

## Settings Errors

### `SETTING_NOT_FOUND`
- **HTTP Status**: 404
- **Message**: "Setting with key '{key}' not found"
- **Endpoints**: `/api/settings/[key]` (GET, PATCH)
- **Cause**: Setting key doesn't exist
- **Action**: Initialize settings or use valid key

### `SETTINGS_INIT_FAILED`
- **HTTP Status**: 500
- **Message**: "Failed to initialize settings"
- **Endpoints**: `/api/settings/init` (POST)
- **Cause**: Database error during settings initialization
- **Action**: Check logs, retry

---

## Validation Errors

### `VALIDATION_ERROR`
- **HTTP Status**: 400
- **Message**: "Request validation failed: {details}"
- **Endpoints**: All endpoints with input validation
- **Cause**: Request body doesn't match expected schema
- **Action**: Fix request data, show validation errors
- **Additional Data**:
  - `issues`: Array of validation errors with field and message

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "issues": [
        {
          "field": "employeeCode",
          "message": "Employee code is required"
        },
        {
          "field": "email",
          "message": "Invalid email format"
        }
      ]
    }
  }
}
```

---

## General Errors

### `INTERNAL_ERROR`
- **HTTP Status**: 500
- **Message**: "An unexpected error occurred"
- **Endpoints**: All endpoints (catch-all)
- **Cause**: Unhandled exception or system error
- **Action**: Show generic error, report to support

### `DATABASE_ERROR`
- **HTTP Status**: 500
- **Message**: "Database operation failed"
- **Endpoints**: All endpoints with database operations
- **Cause**: Database connection or query error
- **Action**: Show error, retry later

---

## Error Response Format

All API errors follow this consistent format:

```typescript
{
  success: false,
  error: {
    code: string,           // Error code (e.g., "UNAUTHORIZED")
    message: string,        // Human-readable message
    details?: {             // Optional additional context
      [key: string]: any
    }
  }
}
```

### Success Response Format

For comparison, successful responses use:

```typescript
{
  success: true,
  data: {
    // Response data
  },
  meta?: {
    // Optional metadata (pagination, etc.)
  }
}
```

---

## Mobile App Error Handling Guidelines

### High Priority Errors (Critical UX)

These errors significantly impact user experience and must be handled with care:

#### `FACE_BELOW_THRESHOLD`
```typescript
if (error.code === 'FACE_BELOW_THRESHOLD') {
  const { matchScore, threshold, gap } = error.details
  
  showAlert({
    title: 'Face Recognition Failed',
    message: `Match score: ${matchScore * 100}%\nRequired: ${threshold * 100}%\nGap: ${gap * 100}%`,
    suggestions: [
      '• Improve lighting conditions',
      '• Position face directly in front of camera',
      '• Remove glasses or accessories',
      '• Consider re-enrolling your face'
    ],
    actions: [
      { label: 'Retry', action: () => retryFaceCapture() },
      { label: 'Re-enroll', action: () => navigateToEnrollment() }
    ]
  })
}
```

#### `UNAUTHORIZED` / `TOKEN_EXPIRED`
```typescript
if (error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED') {
  // Clear local storage
  await clearAuthData()
  
  // Redirect to login
  navigation.replace('Login')
  
  showToast('Session expired. Please login again.')
}
```

#### `ALREADY_CHECKED_IN`
```typescript
if (error.code === 'ALREADY_CHECKED_IN') {
  const { existingCheckIn } = error.details
  
  showAlert({
    title: 'Already Checked In',
    message: `You checked in at ${formatTime(existingCheckIn.capturedAt)}`,
    actions: [
      { label: 'Check Out', action: () => navigateToCheckOut() },
      { label: 'View History', action: () => navigateToHistory() }
    ]
  })
}
```

#### `NOT_CHECKED_IN`
```typescript
if (error.code === 'NOT_CHECKED_IN') {
  showAlert({
    title: 'Not Checked In',
    message: 'You need to check in before you can check out.',
    actions: [
      { label: 'Check In Now', action: () => navigateToCheckIn() }
    ]
  })
}
```

### Medium Priority Errors

#### `DEVICE_MISMATCH`
```typescript
if (error.code === 'DEVICE_MISMATCH') {
  await clearAuthData()
  
  showAlert({
    title: 'Device Mismatch',
    message: 'Your account is being used on another device. Please login again.',
    actions: [
      { label: 'Login', action: () => navigation.replace('Login') }
    ]
  })
}
```

#### `EMPLOYEE_INACTIVE`
```typescript
if (error.code === 'EMPLOYEE_INACTIVE') {
  showAlert({
    title: 'Account Inactive',
    message: 'Your account has been deactivated. Please contact your administrator.',
    actions: [
      { label: 'Contact Admin', action: () => openAdminContact() }
    ]
  })
}
```

#### `FACE_NO_MATCH`
```typescript
if (error.code === 'FACE_NO_MATCH') {
  showAlert({
    title: 'Face Not Registered',
    message: 'No face template found. Please enroll your face first.',
    actions: [
      { label: 'Enroll Now', action: () => navigateToEnrollment() }
    ]
  })
}
```

### Low Priority Errors

#### `VALIDATION_ERROR`
```typescript
if (error.code === 'VALIDATION_ERROR') {
  const { issues } = error.details
  
  // Show field-specific errors
  issues.forEach(issue => {
    setFieldError(issue.field, issue.message)
  })
}
```

#### `INTERNAL_ERROR`
```typescript
if (error.code === 'INTERNAL_ERROR') {
  showToast('Something went wrong. Please try again later.')
  
  // Log to error tracking service
  logError(error)
}
```

### Global Error Handler

```typescript
function handleApiError(error: ApiError) {
  // High priority - immediate action required
  if (['UNAUTHORIZED', 'TOKEN_EXPIRED', 'DEVICE_MISMATCH'].includes(error.code)) {
    return handleAuthError(error)
  }
  
  if (error.code === 'FACE_BELOW_THRESHOLD') {
    return handleFaceRecognitionError(error)
  }
  
  if (['ALREADY_CHECKED_IN', 'NOT_CHECKED_IN'].includes(error.code)) {
    return handleAttendanceError(error)
  }
  
  // Medium priority - informational
  if (['EMPLOYEE_INACTIVE', 'FACE_NO_MATCH'].includes(error.code)) {
    return showAlert({ message: error.message })
  }
  
  // Low priority - generic handling
  showToast(error.message)
}
```

---

## Error Code Statistics

| Category | Count | Percentage |
|----------|-------|------------|
| Authentication | 7 | 27% |
| Face Recognition | 5 | 19% |
| Attendance | 4 | 15% |
| Employee Management | 3 | 12% |
| Work Location | 2 | 8% |
| Settings | 2 | 8% |
| Validation | 1 | 4% |
| General | 2 | 8% |
| **TOTAL** | **26** | **100%** |

---

## Most Common Errors (by frequency)

1. **FACE_BELOW_THRESHOLD** - Used in 3 endpoints (face-login, check-in, check-out)
2. **UNAUTHORIZED** - Used in all protected endpoints
3. **EMPLOYEE_NOT_FOUND** - Used in 4+ endpoints across different contexts
4. **ALREADY_CHECKED_IN** - Common user error during check-in
5. **NOT_CHECKED_IN** - Common user error during check-out

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation with 26 error codes |

---

## Need Help?

- Check endpoint documentation in `/docs/MOBILE_API_GUIDE.md`
- Review authentication flow in `/docs/AUTHENTICATION.md`
- For backend errors, check server logs
- For mobile implementation, refer to error handling examples above

