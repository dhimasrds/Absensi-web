import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth } from '@/lib/auth/mobileGuard'
import { mobileHistoryQuerySchema } from '@/lib/validators/attendance'
import { ZodError } from 'zod'

// GET /api/mobile/attendance/history - Get attendance history for the authenticated employee
export async function GET(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)

    // Parse query params
    const { searchParams } = new URL(request.url)
    const queryParams = {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      type: searchParams.get('type') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    }

    // Validate query params
    const query = mobileHistoryQuerySchema.parse(queryParams)

    const supabase = createAdminSupabaseClient()

    // Build query
    let dbQuery = supabase
      .from('attendance_logs')
      .select('*', { count: 'exact' })
      .eq('employee_id', payload.employeeId)
      .order('captured_at', { ascending: false })

    // Apply filters
    if (query.from) {
      dbQuery = dbQuery.gte('captured_at', query.from)
    }
    if (query.to) {
      dbQuery = dbQuery.lte('captured_at', query.to)
    }
    if (query.type) {
      dbQuery = dbQuery.eq('attendance_type', query.type)
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: attendances, error, count } = await dbQuery

    if (error) {
      console.error('History fetch error:', error)
      return errors.internalError('Failed to fetch attendance history')
    }

    // Transform response
    const items = (attendances || []).map((att) => ({
      id: att.id,
      attendanceType: att.attendance_type,
      capturedAt: att.captured_at,
      verificationMethod: att.verification_method,
      verificationStatus: att.verification_status,
      matchScore: att.match_score,
      livenessScore: att.liveness_score,
      note: att.note,
      hasProof: !!att.proof_image_path,
    }))

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
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('History error:', error)
    return errors.internalError()
  }
}
