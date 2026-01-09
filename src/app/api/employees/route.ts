import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { createEmployeeSchema, employeeQuerySchema } from '@/lib/validators/employees'
import { ZodError } from 'zod'

// GET /api/employees - List employees with pagination, search, filters
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
    const query = employeeQuerySchema.parse(queryParams)

    const supabase = await createServerSupabaseClient()
    
    // Build query with work_location and face_templates join
    let dbQuery = supabase
      .from('employees')
      .select('*, work_location:work_locations(id, name), face_templates(id, face_photo_path)', { count: 'exact' })

    // Search filter
    if (query.q) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query.q}%,employee_id.ilike.%${query.q}%,email.ilike.%${query.q}%`)
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
      return errors.internalError('Failed to fetch employees')
    }

    // Transform response to match frontend expectations
    const transformedData = data?.map((emp) => {
      const workLocation = emp.work_location as { id: string; name: string } | null
      // face_templates can be array, single object, or null depending on Supabase response
      const faceTemplates = emp.face_templates
      // Check if face template exists (could be array or single object)
      const hasFace = faceTemplates !== null && 
        (Array.isArray(faceTemplates) ? faceTemplates.length > 0 : typeof faceTemplates === 'object')
      
      // Check if face photo exists
      let hasFacePhoto = false
      if (faceTemplates) {
        if (Array.isArray(faceTemplates)) {
          hasFacePhoto = faceTemplates.some((ft: any) => ft.face_photo_path)
        } else if (typeof faceTemplates === 'object') {
          hasFacePhoto = !!(faceTemplates as any).face_photo_path
        }
      }
      
      return {
        id: emp.id,
        employeeCode: emp.employee_id,
        fullName: emp.full_name,
        email: emp.email,
        phoneNumber: emp.phone_number,
        jobTitle: emp.job_title,
        department: emp.department,
        workLocationId: emp.work_location_id,
        workLocationName: workLocation?.name || null,
        active: emp.is_active,
        hasFaceEnrolled: hasFace,
        hasFacePhoto, // NEW: indicates if face photo exists
        createdAt: emp.created_at,
        updatedAt: emp.updated_at,
      }
    }) || []

    return successResponse(transformedData, {
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

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    const body = await request.json()
    
    // Validate request body
    const input = createEmployeeSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Check for duplicate employee_id
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', input.employeeId)
      .single()

    if (existing) {
      return errors.conflict('EMPLOYEE_ID_EXISTS', 'Employee ID already exists')
    }

    // Check for duplicate email if provided
    if (input.email) {
      const { data: existingEmail } = await supabase
        .from('employees')
        .select('id')
        .eq('email', input.email)
        .single()

      if (existingEmail) {
        return errors.conflict('EMAIL_EXISTS', 'Email already exists')
      }
    }

    // Insert employee
    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_id: input.employeeId,
        full_name: input.fullName,
        email: input.email || null,
        phone_number: input.phoneNumber || null,
        job_title: input.jobTitle || null,
        department: input.department || null,
        is_active: input.isActive ?? true,
        work_location_id: input.workLocationId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errors.internalError('Failed to create employee')
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
