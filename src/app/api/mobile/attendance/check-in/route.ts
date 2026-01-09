import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth, validateDeviceMatch } from '@/lib/auth/mobileGuard'
import { mobileAttendanceSchema } from '@/lib/validators/attendance'
import { identifyFace } from '@/lib/face/identify'
import { ZodError } from 'zod'
import { createClient } from '@supabase/supabase-js'

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
      .select('id, type, captured_at')  // Column name is 'type', not 'attendance_type'
      .eq('employee_id', payload.sub)  // Use payload.sub (employee UUID)
      .gte('captured_at', todayStart.toISOString())
      .lte('captured_at', todayEnd.toISOString())
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    // If last attendance is CHECK_IN, cannot check-in again
    if (lastAttendance && lastAttendance.type === 'CHECK_IN') {
      return errors.alreadyCheckedIn()
    }

    // ====================================================
    // Upload Proof Image to Storage (if provided)
    // ====================================================
    let actualProofImagePath: string | null = null
    let actualProofImageMime: string | null = null

    if (input.proofImageBase64) {
      try {
        console.log('[check-in] Proof image upload attempt:', {
          hasPhoto: true,
          photoLength: input.proofImageBase64.length,
          photoPrefix: input.proofImageBase64.substring(0, 50),
        })

        let mimeType: string
        let base64Data: string

        // Check if it's a data URL (data:image/jpeg;base64,...) or plain base64
        const dataUrlMatch = input.proofImageBase64.match(/^data:([^;]+);base64,(.+)$/)
        
        if (dataUrlMatch) {
          // Format: data:image/jpeg;base64,/9j/4AAQ...
          mimeType = dataUrlMatch[1]
          base64Data = dataUrlMatch[2]
          console.log('[check-in] Data URL format detected:', { mime: mimeType, dataLength: base64Data.length })
        } else {
          // Plain base64 format (from mobile) - use proofImageMime from request
          mimeType = input.proofImageMime || 'image/jpeg'
          base64Data = input.proofImageBase64
          console.log('[check-in] Plain base64 format detected:', { mime: mimeType, dataLength: base64Data.length })
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Generate unique filename
        const fileExtension = mimeType.split('/')[1]
        const fileName = `${input.clientCaptureId}-${Date.now()}.${fileExtension}`
        const storagePath = `attendance-proofs/${payload.sub}/${fileName}`

        console.log('[check-in] Uploading to storage:', {
          path: storagePath,
          mime: mimeType,
          size: buffer.length,
        })

        // Create admin client with service role key (bypasses RLS)
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Upload to storage using admin client
        const { error: uploadError } = await supabaseAdmin.storage
          .from('attendance-proofs')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
          })

        if (uploadError) {
          console.error('[check-in] Failed to upload proof photo:', uploadError)
          // Don't fail the check-in, just log the error
          console.warn('[check-in] Continuing check-in without proof photo')
        } else {
          console.log('[check-in] ✅ Photo uploaded successfully:', { path: storagePath })
          actualProofImagePath = storagePath
          actualProofImageMime = mimeType
        }
      } catch (uploadError) {
        console.error('[check-in] Proof photo upload error:', uploadError)
        // Don't fail the check-in, just log the error
        console.warn('[check-in] Continuing check-in without proof photo')
      }
    }

    // ====================================================
    // Insert Check-In Record
    // ====================================================
    const { data: attendance, error: insertError } = await supabase
      .from('attendance_logs')
      .insert({
        employee_id: payload.sub,  // Use payload.sub (employee UUID)
        device_id: payload.deviceIdString,  // Device ID string from JWT
        type: 'CHECK_IN',  // Column name is 'type', not 'attendance_type'
        timestamp: input.capturedAt,  // Required timestamp field
        source: 'ANDROID',  // Required source field
        client_capture_id: input.clientCaptureId,
        captured_at: input.capturedAt,
        verification_method: input.verificationMethod,
        match_score: identifyResult.score,  // Score from face matching
        liveness_score: input.liveness.score,  // Liveness score from client
        verification_status: identifyResult.score >= 0.7 ? 'VERIFIED' : 'PENDING',
        note: input.note,
        proof_image_path: actualProofImagePath || input.proofImagePath,  // Use uploaded path if available
        proof_image_mime: actualProofImageMime || input.proofImageMime,
        latitude: input.latitude,  // GPS latitude coordinate
        longitude: input.longitude,  // GPS longitude coordinate
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
          .select('id, type, captured_at')  // Column name is 'type', not 'attendance_type'
          .eq('client_capture_id', input.clientCaptureId)
          .single()

        if (existingRecord) {
          return successResponse({
            id: existingRecord.id,
            attendanceType: existingRecord.type,  // Map 'type' to 'attendanceType' for response
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
      attendanceType: attendance.type,  // Map 'type' to 'attendanceType' for response
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
