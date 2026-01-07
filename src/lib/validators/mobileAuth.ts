import { z } from 'zod'

// ====================================================
// Mobile Auth Validators
// ====================================================

export const faceLoginSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  clientCaptureId: z.string().min(1, 'Client capture ID is required'),
  capturedAt: z.string().datetime('Invalid captured timestamp'),
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z.array(z.number()).length(128, 'Embedding must have exactly 128 dimensions'),
  }),
  liveness: z.object({
    provided: z.boolean(),
    score: z.number().min(0).max(1).nullable(),
  }),
  app: z.object({
    version: z.string(),
    platform: z.enum(['android', 'ios']),
  }),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export type FaceLoginInput = z.infer<typeof faceLoginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
