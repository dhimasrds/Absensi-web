import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth, validateDeviceMatch } from '@/lib/auth/mobileGuard'
import { mobileAttendanceSchema } from '@/lib/validators/attendance'
import { identifyFace } from '@/lib/face/identify'
import { ZodError } from 'zod'

// POST /api/mobile/attendance/check-in - Record a check-in with face verification
export async function POST(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)
    
    const body = await request.json()
    
    // Validate request body
    const input = mobileAttendanceSchema.parse(body)
    
    // Validate device match
    validateDeviceMatch(payload.deviceIdString, input.deviceId)

    const supabase = createAdminSupabaseClient()

    // ====================================================
    // Face Verification - REQUIRED for check-in
    // ====================================================
    let identifyResult
    try {
      identifyResult = await identifyFace(input.payload.embedding)
    } catch (faceError) {
      console.error('Face identification error:', faceError)
      return errors.faceNotRecognized()
    }

    if (!identifyResult) {
      console.log('Face not recognized: no match found')
      return errors.faceNotRecognized()
    }

    // Verify that identified employee matches token employee
    if (identifyResult.employee.id !== payload.sub) {
      console.log('Face mismatch: token employee', payload.sub, 'vs identified', identifyResult.employee.id)
      return errors.faceNotRecognized()
    }

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
    // Open Session Check - Cannot check-in if already checked-in
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
      .eq('employee_id', payload.sub)  // Use payload.sub (employee UUID)
      .gte('captured_at', todayStart.toISOString())
      .lte('captured_at', todayEnd.toISOString())
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    // If last attendance is CHECK_IN, cannot check-in again
    if (lastAttendance && lastAttendance.attendance_type === 'CHECK_IN') {
      return errors.alreadyCheckedIn()
    }

    // ====================================================
    // ====================================================
    // Insert Check-In Record
    // ====================================================
    const { data: attendance, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: payload.sub,  // Use payload.sub (employee UUID)
        device_id: payload.deviceId,
        session_id: payload.sub,  // Use employee UUID as session ID
        attendance_type: 'CHECK_IN',
        client_capture_id: input.clientCaptureId,
        captured_at: input.capturedAt,
        verification_method: input.verificationMethod,
        match_score: identifyResult.score,  // Score from face matching
        liveness_score: input.liveness.score,  // Liveness score from client
        verification_status: identifyResult.score >= 0.7 ? 'VERIFIED' : 'PENDING',
        note: input.note,
        proof_image_path: input.proofImagePath,
        proof_image_mime: input.proofImageMime,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Check-in insert error:', insertError)
      
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
      
      return errors.internalError('Failed to record check-in')
    }

    return successResponse({
      id: attendance.id,
      attendanceType: attendance.attendance_type,
      capturedAt: attendance.captured_at,
      verificationStatus: attendance.verification_status,
      message: 'Check-in recorded successfully',
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
    console.error('Check-in error:', error)
    return errors.internalError()
  }
}
