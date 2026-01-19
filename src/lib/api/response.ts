import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { ZodError, ZodIssue } from 'zod'

// Generate unique request ID
function generateRequestId(): string {
  return uuidv4()
}

// Success response
export function successResponse<T>(
  data: T,
  options?: {
    status?: number
    pagination?: {
      page: number
      limit: number
      total: number
    }
  }
) {
  const meta: Record<string, unknown> = {
    requestId: generateRequestId(),
  }

  if (options?.pagination) {
    meta.pagination = {
      ...options.pagination,
      totalPages: Math.ceil(options.pagination.total / options.pagination.limit),
    }
  }

  return NextResponse.json(
    { data, meta },
    { status: options?.status ?? 200 }
  )
}

// Error response
export function errorResponse(
  code: string,
  message: string,
  options?: {
    status?: number
    details?: Record<string, unknown>
  }
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(options?.details && { details: options.details }),
      },
    },
    { status: options?.status ?? 400 }
  )
}

// Zod validation error response
export function validationErrorResponse(error: ZodError) {
  const details = error.issues.reduce((acc: Record<string, string>, err: ZodIssue) => {
    const path = err.path.join('.')
    acc[path] = err.message
    return acc
  }, {} as Record<string, string>)

  return errorResponse('VALIDATION_ERROR', 'Request validation failed', {
    status: 400,
    details,
  })
}

// Common error responses
export const errors = {
  unauthorized: () =>
    errorResponse('UNAUTHORIZED', 'Authentication required', { status: 401 }),

  forbidden: (message = 'Access denied') =>
    errorResponse('FORBIDDEN', message, { status: 403 }),

  notFound: (resource = 'Resource') =>
    errorResponse('NOT_FOUND', `${resource} not found`, { status: 404 }),

  conflict: (code: string, message: string) =>
    errorResponse(code, message, { status: 409 }),

  internalError: (message = 'Internal server error') =>
    errorResponse('INTERNAL_ERROR', message, { status: 500 }),

  badRequest: (code: string, message: string, details?: Record<string, unknown>) =>
    errorResponse(code, message, { status: 400, details }),

  // Specific error codes
  deviceNotRegistered: () =>
    errorResponse('DEVICE_NOT_REGISTERED', 'Device is not registered or inactive', { status: 403 }),

  deviceMismatch: () =>
    errorResponse('DEVICE_MISMATCH', 'Device ID does not match the token', { status: 403 }),

  employeeMismatch: () =>
    errorResponse('EMPLOYEE_MISMATCH', 'Employee ID does not match the token', { status: 403 }),

  faceNotRecognized: () =>
    errorResponse('FACE_NOT_RECOGNIZED', 'Face not recognized or below threshold', { status: 401 }),

  faceNotRecognizedWithDetails: (details: {
    reason: string
    threshold: number
    bestScore?: number
    bestMatch?: { employeeId: string; fullName: string }
    message: string
  }) => {
    const errorCode = details.reason === 'BELOW_THRESHOLD' 
      ? 'FACE_BELOW_THRESHOLD' 
      : details.reason === 'NO_MATCH'
      ? 'FACE_NO_MATCH'
      : details.reason === 'EMPLOYEE_INACTIVE'
      ? 'EMPLOYEE_INACTIVE'
      : 'FACE_NOT_RECOGNIZED'
    
    return errorResponse(errorCode, details.message, { 
      status: 401, 
      details: {
        reason: details.reason,
        threshold: details.threshold,
        thresholdPercent: `${(details.threshold * 100).toFixed(1)}%`,
        ...(details.bestScore !== undefined && {
          bestScore: details.bestScore,
          bestScorePercent: `${(details.bestScore * 100).toFixed(1)}%`,
          gap: details.threshold - details.bestScore,
          gapPercent: `${((details.threshold - details.bestScore) * 100).toFixed(1)}%`
        }),
        ...(details.bestMatch && {
          nearestMatch: {
            employeeId: details.bestMatch.employeeId,
            fullName: details.bestMatch.fullName
          }
        })
      }
    })
  },

  duplicateCapture: () =>
    errorResponse('DUPLICATE_CAPTURE', 'This capture has already been processed', { status: 409 }),

  alreadyCheckedIn: () =>
    errorResponse('ALREADY_CHECKED_IN', 'Employee already has an open check-in session', { status: 409 }),

  notCheckedIn: () =>
    errorResponse('NOT_CHECKED_IN', 'No open check-in session found', { status: 409 }),

  captureStale: () =>
    errorResponse('CAPTURE_STALE', 'Capture timestamp is too old', { status: 400 }),

  invalidRefreshToken: () =>
    errorResponse('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', { status: 401 }),

  sessionExpired: () =>
    errorResponse('SESSION_EXPIRED', 'Session has expired', { status: 401 }),
}
