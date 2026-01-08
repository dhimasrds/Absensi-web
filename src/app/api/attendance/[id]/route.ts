import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/attendance/[id] - Get single attendance record (Admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin
    const authResult = await requireAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return errors.badRequest('INVALID_ID', 'Invalid attendance ID format')
    }

    const supabase = createAdminSupabaseClient()

    // Get attendance with relations
    const { data: attendance, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        employees!inner (
          id,
          employee_id,
          full_name,
          email,
          department
        )
      `)
      .eq('id', id)
      .single()

    if (error || !attendance) {
      return errors.notFound('Attendance record')
    }

    // Type assertion for joins
    const employee = attendance.employees as unknown as {
      id: string
      employee_id: string
      full_name: string
      email: string | null
      department: string | null
    }

    return successResponse({
      id: attendance.id,
      employee: {
        id: employee.id,
        code: employee.employee_id,
        name: employee.full_name,
        email: employee.email,
        department: employee.department,
      },
      device: attendance.device_id ? {
        id: attendance.device_id,
      } : null,
      attendanceType: attendance.type,
      attendanceSource: attendance.source,
      clientCaptureId: attendance.client_capture_id,
      capturedAt: attendance.timestamp,
      verificationMethod: attendance.verification_method,
      verificationStatus: attendance.verification_status,
      matchScore: attendance.match_score,
      livenessScore: attendance.liveness_score,
      note: attendance.note,
      proofImagePath: attendance.proof_image_path,
      proofImageMime: attendance.proof_image_mime,
      createdAt: attendance.created_at,
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    return errors.internalError()
  }
}
