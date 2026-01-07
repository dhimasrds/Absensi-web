import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth, validateDeviceMatch, validateEmployeeMatch } from '@/lib/auth/mobileGuard'
import { mobileAttendanceSchema } from '@/lib/validators/attendance'
import { ZodError } from 'zod'

// POST /api/mobile/attendance/check-out - Record a check-out
export async function POST(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)
    
    const body = await request.json()
    
    // Validate request body
    const input = mobileAttendanceSchema.parse(body)
    
    // Validate device match
    validateDeviceMatch(payload.deviceId, input.deviceId)
    
    // Validate employee match if provided
    validateEmployeeMatch(payload.employeeId, input.employeeId)

    const supabase = createAdminSupabaseClient()

    // ====================================================
    // Idempotency Check - Same clientCaptureId
    // ====================================================
    const { data: existingByCapture } = await supabase
      .from('attendance_logs')
      .select('id, attendance_type, captured_at')
      .eq('client_capture_id', input.clientCaptureId)
      .single()

    if (existingByCapture) {
      // Return existing record (idempotent)
      return successResponse({
        id: existingByCapture.id,
        attendanceType: existingByCapture.attendance_type,
        capturedAt: existingByCapture.captured_at,
        message: 'Attendance already recorded',
        idempotent: true,
      })
    }

    // ====================================================
    // Open Session Check - Cannot check-out if not checked-in
    // ====================================================
    // Get today's date range
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Find the last attendance for today
    const { data: lastAttendance } = await supabase
      .from('attendance_logs')
      .select('id, attendance_type, captured_at')
      .eq('employee_id', payload.employeeId)
      .gte('captured_at', todayStart.toISOString())
      .lte('captured_at', todayEnd.toISOString())
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    // If no attendance today or last is CHECK_OUT, cannot check-out
    if (!lastAttendance || lastAttendance.attendance_type === 'CHECK_OUT') {
      return errors.notCheckedIn()
    }

    // ====================================================
    // Insert Check-Out Record
    // ====================================================
    const { data: attendance, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: payload.employeeId,
        device_id: payload.deviceId,
        session_id: payload.sessionId,
        attendance_type: 'CHECK_OUT',
        attendance_source: 'ANDROID',
        client_capture_id: input.clientCaptureId,
        captured_at: input.capturedAt,
        verification_method: input.verificationMethod,
        match_score: input.matchScore,
        liveness_score: input.livenessScore,
        verification_status: input.matchScore && input.matchScore >= 0.7 ? 'VERIFIED' : 'PENDING',
        note: input.note,
        proof_image_path: input.proofImagePath,
        proof_image_mime: input.proofImageMime,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Check-out insert error:', insertError)
      
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Try to fetch the existing record
        const { data: existingRecord } = await supabase
          .from('attendance_logs')
          .select('id, attendance_type, captured_at')
          .eq('client_capture_id', input.clientCaptureId)
          .single()

        if (existingRecord) {
          return successResponse({
            id: existingRecord.id,
            attendanceType: existingRecord.attendance_type,
            capturedAt: existingRecord.captured_at,
            message: 'Attendance already recorded',
            idempotent: true,
          })
        }
      }
      
      return errors.internalError('Failed to record check-out')
    }

    // Calculate work duration
    const checkInTime = new Date(lastAttendance.captured_at)
    const checkOutTime = new Date(attendance.captured_at)
    const durationMs = checkOutTime.getTime() - checkInTime.getTime()
    const durationMinutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    return successResponse({
      id: attendance.id,
      attendanceType: attendance.attendance_type,
      capturedAt: attendance.captured_at,
      verificationStatus: attendance.verification_status,
      checkInId: lastAttendance.id,
      checkInAt: lastAttendance.captured_at,
      workDuration: {
        hours,
        minutes,
        totalMinutes: durationMinutes,
      },
      message: 'Check-out recorded successfully',
      idempotent: false,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('Check-out error:', error)
    return errors.internalError()
  }
}
