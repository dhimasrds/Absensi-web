import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { updateWorkLocationSchema } from '@/lib/validators/workLocations'
import { ZodError } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/work-locations/[id] - Get single work location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = createAdminSupabaseClient()

    const { data: location, error } = await supabase
      .from('work_locations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !location) {
      return errors.notFound('Work location')
    }

    return successResponse(location)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('Work location fetch error:', error)
    return errors.internalError()
  }
}

// PUT /api/work-locations/[id] - Update work location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const body = await request.json()
    const input = updateWorkLocationSchema.parse(body)
    
    const supabase = createAdminSupabaseClient()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.address !== undefined) updateData.address = input.address
    if (input.latitude !== undefined) updateData.latitude = input.latitude
    if (input.longitude !== undefined) updateData.longitude = input.longitude
    if (input.radiusMeters !== undefined) updateData.radius_meters = input.radiusMeters
    if (input.isActive !== undefined) updateData.is_active = input.isActive

    if (Object.keys(updateData).length === 0) {
      return errors.badRequest('NO_FIELDS', 'No fields to update')
    }

    const { data: location, error } = await supabase
      .from('work_locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errors.notFound('Work location')
      }
      console.error('Work location update error:', error)
      return errors.internalError('Failed to update work location')
    }

    return successResponse(location)
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Work location update error:', error)
    return errors.internalError()
  }
}

// DELETE /api/work-locations/[id] - Delete work location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = createAdminSupabaseClient()

    // Check if any employees are assigned to this location
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('work_location_id', id)

    if (employeeCount && employeeCount > 0) {
      return errors.conflict(
        'LOCATION_IN_USE',
        `Cannot delete location. ${employeeCount} employee(s) are assigned to this location.`
      )
    }

    const { error } = await supabase
      .from('work_locations')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === 'PGRST116') {
        return errors.notFound('Work location')
      }
      console.error('Work location delete error:', error)
      return errors.internalError('Failed to delete work location')
    }

    return successResponse({ message: 'Work location deleted successfully' })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('Work location delete error:', error)
    return errors.internalError()
  }
}
