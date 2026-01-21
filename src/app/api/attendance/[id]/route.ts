import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Schema for updating attendance
const updateAttendanceSchema = z.object({
  verificationStatus: z.enum(['VERIFIED', 'PENDING', 'REJECTED']).optional(),
  note: z.string().max(500).optional(),
})

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

// PATCH /api/attendance/[id] - Update attendance verification status (Admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json()
    
    // Validate request body
    const parseResult = updateAttendanceSchema.safeParse(body)
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error)
    }

    const input = parseResult.data

    const supabase = createAdminSupabaseClient()

    // Check if attendance exists
    const { data: existing, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('id, verification_status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return errors.notFound('Attendance record')
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (input.verificationStatus !== undefined) {
      updateData.verification_status = input.verificationStatus
    }

    if (input.note !== undefined) {
      updateData.note = input.note
    }

    // Update attendance
    const { data: updated, error: updateError } = await supabase
      .from('attendance_logs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employees!inner (
          id,
          employee_id,
          full_name,
          department
        )
      `)
      .single()

    if (updateError || !updated) {
      console.error('Update attendance error:', updateError)
      return errors.internalError('Failed to update attendance')
    }

    // Type assertion for joins
    const employee = updated.employees as unknown as {
      id: string
      employee_id: string
      full_name: string
      department: string | null
    }

    console.log(`[attendance] Admin updated attendance ${id}: status=${input.verificationStatus}, note=${input.note}`)

    return successResponse({
      id: updated.id,
      employee: {
        id: employee.id,
        code: employee.employee_id,
        name: employee.full_name,
        department: employee.department,
      },
      attendanceType: updated.type,
      verificationStatus: updated.verification_status,
      matchScore: updated.match_score,
      note: updated.note,
      message: `Attendance ${input.verificationStatus === 'VERIFIED' ? 'approved' : input.verificationStatus === 'REJECTED' ? 'rejected' : 'updated'} successfully`,
    })
  } catch (error) {
    console.error('Update attendance error:', error)
    return errors.internalError()
  }
}
