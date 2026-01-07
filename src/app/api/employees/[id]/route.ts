import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { updateEmployeeSchema } from '@/lib/validators/employees'
import { ZodError } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/employees/[id] - Get single employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return errors.notFound('Employee')
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('Unexpected error:', error)
    return errors.internalError()
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const body = await request.json()
    
    // Validate request body
    const input = updateEmployeeSchema.parse(body)

    if (Object.keys(input).length === 0) {
      return errors.badRequest('EMPTY_UPDATE', 'No fields to update')
    }

    const supabase = await createServerSupabaseClient()

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return errors.notFound('Employee')
    }

    // Check for duplicate employee_id if updating
    if (input.employeeId) {
      const { data: duplicate } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_id', input.employeeId)
        .neq('id', id)
        .single()

      if (duplicate) {
        return errors.conflict('EMPLOYEE_ID_EXISTS', 'Employee ID already exists')
      }
    }

    // Check for duplicate email if updating
    if (input.email) {
      const { data: duplicateEmail } = await supabase
        .from('employees')
        .select('id')
        .eq('email', input.email)
        .neq('id', id)
        .single()

      if (duplicateEmail) {
        return errors.conflict('EMAIL_EXISTS', 'Email already exists')
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.employeeId !== undefined) updateData.employee_id = input.employeeId
    if (input.fullName !== undefined) updateData.full_name = input.fullName
    if (input.email !== undefined) updateData.email = input.email
    if (input.phoneNumber !== undefined) updateData.phone_number = input.phoneNumber
    if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle
    if (input.department !== undefined) updateData.department = input.department
    if (input.isActive !== undefined) updateData.is_active = input.isActive
    if (input.workLocationId !== undefined) updateData.work_location_id = input.workLocationId

    // Update employee
    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to update employee')
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Unexpected error:', error)
    return errors.internalError()
  }
}

// DELETE /api/employees/[id] - Soft delete (set is_active = false)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check if employee exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return errors.notFound('Employee')
    }

    // Soft delete by setting is_active = false
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to delete employee')
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('Unexpected error:', error)
    return errors.internalError()
  }
}
