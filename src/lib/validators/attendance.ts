import { z } from 'zod'

// ====================================================
// Attendance Validators
// ====================================================

export const uploadUrlSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  contentType: z.enum(['image/jpeg', 'image/png']).default('image/jpeg'),
})

export const attendanceQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  source: z.enum(['WEB_ADMIN', 'ANDROID']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const mobileAttendanceSchema = z.object({
  employeeId: z.string().uuid().optional(), // Optional, but if provided must match token
  deviceId: z.string().min(1, 'Device ID is required'),
  clientCaptureId: z.string().min(1, 'Client capture ID is required'),
  capturedAt: z.string().datetime('Invalid captured timestamp'),
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z.array(z.number()).length(128, 'Embedding must be 128-dimensional'),
  }),
  liveness: z.object({
    provided: z.boolean(),
    score: z.number().min(0).max(1).optional(),
  }),
  verificationMethod: z.enum(['FACE', 'MANUAL_ADMIN']).default('FACE'),
  note: z.string().max(500).nullable().optional(),
  proofImagePath: z.string().optional(),
  proofImageMime: z.string().optional(),
  proofImageBase64: z.string().optional().nullable(), // Base64 data URL for actual upload
})

export const mobileHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
})

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>
export type MobileAttendanceInput = z.infer<typeof mobileAttendanceSchema>
export type MobileHistoryQueryInput = z.infer<typeof mobileHistoryQuerySchema>
