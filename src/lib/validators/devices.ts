import { z } from 'zod'

// ====================================================
// Device Validators
// ====================================================

export const createDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required').max(100),
  label: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

export const updateDeviceSchema = z.object({
  deviceId: z.string().min(1).max(100).optional(),
  label: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
})

export const deviceQuerySchema = z.object({
  q: z.string().optional(), // search query
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['device_id', 'label', 'created_at', 'updated_at']).optional().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>
export type DeviceQueryInput = z.infer<typeof deviceQuerySchema>
