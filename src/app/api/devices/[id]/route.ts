import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { updateDeviceSchema } from '@/lib/validators/devices'
import { ZodError } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/devices/[id] - Get single device
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return errors.notFound('Device')
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

// PUT /api/devices/[id] - Update device
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const body = await request.json()
    
    // Validate request body
    const input = updateDeviceSchema.parse(body)

    if (Object.keys(input).length === 0) {
      return errors.badRequest('EMPTY_UPDATE', 'No fields to update')
    }

    const supabase = await createServerSupabaseClient()

    // Check if device exists
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return errors.notFound('Device')
    }

    // Check for duplicate device_id if updating
    if (input.deviceId) {
      const { data: duplicate } = await supabase
        .from('devices')
        .select('id')
        .eq('device_id', input.deviceId)
        .neq('id', id)
        .single()

      if (duplicate) {
        return errors.conflict('DEVICE_ID_EXISTS', 'Device ID already exists')
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (input.deviceId !== undefined) updateData.device_id = input.deviceId
    if (input.label !== undefined) updateData.label = input.label
    if (input.isActive !== undefined) updateData.is_active = input.isActive

    // Update device
    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to update device')
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

// DELETE /api/devices/[id] - Soft delete (set is_active = false)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Check if device exists
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return errors.notFound('Device')
    }

    // Soft delete by setting is_active = false
    const { data, error } = await supabase
      .from('devices')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to delete device')
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
