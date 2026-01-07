import { z } from 'zod'

// ====================================================
// Work Location Validators
// ====================================================

export const createWorkLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().max(255).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(50).max(5000).default(500),
  isActive: z.boolean().optional().default(true),
})

export const updateWorkLocationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(255).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().int().min(50).max(5000).optional(),
  isActive: z.boolean().optional(),
})

export const workLocationQuerySchema = z.object({
  q: z.string().optional(), // search query
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'created_at', 'updated_at']).optional().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CreateWorkLocationInput = z.infer<typeof createWorkLocationSchema>
export type UpdateWorkLocationInput = z.infer<typeof updateWorkLocationSchema>
export type WorkLocationQueryInput = z.infer<typeof workLocationQuerySchema>
