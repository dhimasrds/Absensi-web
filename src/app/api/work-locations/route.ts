import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { createWorkLocationSchema, workLocationQuerySchema } from '@/lib/validators/workLocations'
import { ZodError } from 'zod'

// GET /api/work-locations - List all work locations
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const queryParams = {
      q: searchParams.get('q') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortDir: searchParams.get('sortDir') || undefined,
    }
    
    const query = workLocationQuerySchema.parse(queryParams)
    const supabase = createAdminSupabaseClient()

    // Build query
    let dbQuery = supabase
      .from('work_locations')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (query.q) {
      dbQuery = dbQuery.or(`name.ilike.%${query.q}%,address.ilike.%${query.q}%`)
    }

    // Apply active filter
    if (query.isActive !== 'all') {
      dbQuery = dbQuery.eq('is_active', query.isActive === 'true')
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sortBy, { ascending: query.sortDir === 'asc' })

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: locations, error, count } = await dbQuery

    if (error) {
      console.error('Work locations fetch error:', error)
      return errors.internalError('Failed to fetch work locations')
    }

    return successResponse(locations, {
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
    console.error('Work locations list error:', error)
    return errors.internalError()
  }
}

// POST /api/work-locations - Create new work location
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const input = createWorkLocationSchema.parse(body)
    
    const supabase = createAdminSupabaseClient()

    const { data: location, error } = await supabase
      .from('work_locations')
      .insert({
        name: input.name,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_meters: input.radiusMeters,
        is_active: input.isActive,
      })
      .select()
      .single()

    if (error) {
      console.error('Work location create error:', error)
      return errors.internalError('Failed to create work location')
    }

    return successResponse(location, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Work location create error:', error)
    return errors.internalError()
  }
}
