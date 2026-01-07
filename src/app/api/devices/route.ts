import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { createDeviceSchema, deviceQuerySchema } from '@/lib/validators/devices'
import { ZodError } from 'zod'

// GET /api/devices - List devices with pagination, search, filters
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const queryParams = {
      q: searchParams.get('q') || undefined,
      isActive: searchParams.get('isActive') || 'all',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortDir: searchParams.get('sortDir') || 'desc',
    }

    // Validate query params
    const query = deviceQuerySchema.parse(queryParams)

    const supabase = await createServerSupabaseClient()
    
    // Build query
    let dbQuery = supabase
      .from('devices')
      .select('*', { count: 'exact' })

    // Search filter
    if (query.q) {
      dbQuery = dbQuery.or(`device_id.ilike.%${query.q}%,label.ilike.%${query.q}%`)
    }

    // Active filter
    if (query.isActive !== 'all') {
      dbQuery = dbQuery.eq('is_active', query.isActive === 'true')
    }

    // Sorting
    dbQuery = dbQuery.order(query.sortBy, { ascending: query.sortDir === 'asc' })

    // Pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to fetch devices')
    }

    return successResponse(data, {
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
      },
    })
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

// POST /api/devices - Create new device
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    const body = await request.json()
    
    // Validate request body
    const input = createDeviceSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Check for duplicate device_id
    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', input.deviceId)
      .single()

    if (existing) {
      return errors.conflict('DEVICE_ID_EXISTS', 'Device ID already exists')
    }

    // Insert device
    const { data, error } = await supabase
      .from('devices')
      .insert({
        device_id: input.deviceId,
        label: input.label || null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to create device')
    }

    return successResponse(data, { status: 201 })
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
