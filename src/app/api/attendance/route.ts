import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { attendanceQuerySchema } from '@/lib/validators/attendance'
import { ZodError } from 'zod'

// GET /api/attendance - List all attendance records (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin
    const authResult = await requireAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const queryParams = {
      employeeId: searchParams.get('employeeId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      type: searchParams.get('type') || undefined,
      source: searchParams.get('source') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortDir: searchParams.get('sortDir') || undefined,
    }

    // Validate query params
    const query = attendanceQuerySchema.parse(queryParams)

    const supabase = createAdminSupabaseClient()

    // Build query with join to employees
    let dbQuery = supabase
      .from('attendance_logs')
      .select(`
        id,
        employee_id,
        device_id,
        type,
        source,
        client_capture_id,
        timestamp,
        captured_at,
        verification_method,
        verification_status,
        match_score,
        liveness_score,
        note,
        proof_image_path,
        proof_image_mime,
        created_at,
        employees!inner (
          employee_id,
          full_name,
          department,
          work_location_id,
          work_locations (
            id,
            name
          )
        )
      `, { count: 'exact' })
      .order('timestamp', { ascending: query.sortDir === 'asc' })

    // Apply filters
    if (query.employeeId) {
      dbQuery = dbQuery.eq('employee_id', query.employeeId)
    }
    if (query.from) {
      dbQuery = dbQuery.gte('timestamp', query.from)
    }
    if (query.to) {
      dbQuery = dbQuery.lte('timestamp', query.to)
    }
    if (query.type) {
      dbQuery = dbQuery.eq('type', query.type)
    }
    if (query.source) {
      dbQuery = dbQuery.eq('source', query.source)
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: attendances, error, count } = await dbQuery

    if (error) {
      console.error('Attendance fetch error:', error)
      return errors.internalError('Failed to fetch attendance records')
    }

    // Transform response
    const items = (attendances || []).map((att) => {
      // Type assertion for joins
      const employee = att.employees as unknown as {
        employee_id: string
        full_name: string
        department: string | null
        work_location_id: string | null
        work_locations: {
          id: string
          name: string
        } | null
      }

      return {
        id: att.id,
        employeeId: att.employee_id,
        employee: {
          code: employee.employee_id,
          name: employee.full_name,
          department: employee.department,
          workLocation: employee.work_locations ? {
            id: employee.work_locations.id,
            name: employee.work_locations.name,
          } : null,
        },
        device: att.device_id ? {
          id: att.device_id,
        } : null,
        attendanceType: att.type,
        attendanceSource: att.source,
        capturedAt: att.timestamp,
        verificationMethod: att.verification_method,
        verificationStatus: att.verification_status,
        matchScore: att.match_score,
        livenessScore: att.liveness_score,
        note: att.note,
        hasProof: !!att.proof_image_path,
        createdAt: att.created_at,
      }
    })

    return successResponse(items, {
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
    console.error('Attendance list error:', error)
    return errors.internalError()
  }
}
