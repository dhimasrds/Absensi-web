import { z } from 'zod'

// ====================================================
// Device Validators
// ====================================================

export const createDeviceSchema = z.object({
  // Accept both formats for backward compatibility
  deviceId: z.string().min(1, 'Device ID is required').max(100).optional(),
  deviceUniqueId: z.string().min(1, 'Device ID is required').max(100).optional(),
  label: z.string().max(100).optional().nullable(),
  deviceName: z.string().max(100).optional().nullable(),
  // Ignore these fields from frontend (not in DB)
  deviceModel: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
  appVersion: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  active: z.boolean().optional(),
}).transform((data) => ({
  // Normalize to backend format
  deviceId: data.deviceUniqueId || data.deviceId || '',
  label: data.deviceName || data.label || null,
  isActive: data.active ?? data.isActive ?? true,
}))

export const updateDeviceSchema = z.object({
  deviceId: z.string().min(1).max(100).optional(),
  deviceUniqueId: z.string().min(1).max(100).optional(),
  label: z.string().max(100).optional().nullable(),
  deviceName: z.string().max(100).optional().nullable(),
  deviceModel: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
  appVersion: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  active: z.boolean().optional(),
}).transform((data) => ({
  // Normalize to backend format
  deviceId: data.deviceUniqueId || data.deviceId,
  label: data.deviceName || data.label,
  isActive: data.active ?? data.isActive,
}))

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
