import { z } from 'zod'

// ====================================================
// Employee Validators
// ====================================================

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').max(50),
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email('Invalid email').optional().nullable(),
  phoneNumber: z.string().max(20).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  workLocationId: z.string().uuid('Invalid work location ID').optional().nullable(),
})

export const updateEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50).optional(),
  fullName: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email').optional().nullable(),
  phoneNumber: z.string().max(20).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  workLocationId: z.string().uuid('Invalid work location ID').optional().nullable(),
})

export const employeeQuerySchema = z.object({
  q: z.string().optional(), // search query
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['employee_id', 'full_name', 'created_at', 'updated_at']).optional().default('created_at'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>
