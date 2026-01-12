import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { faceLoginSchema } from '@/lib/validators/mobileAuth'
import { identifyFace, checkDeviceActive } from '@/lib/face/identify'
import { generateTokenPair, hashRefreshToken } from '@/lib/auth/mobileJwt'
import { ZodError } from 'zod'

const CAPTURE_MAX_SKEW_SECONDS = parseInt(process.env.CAPTURE_MAX_SKEW_SECONDS || '120', 10)

// POST /api/mobile/auth/face-login - Face identify login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const input = faceLoginSchema.parse(body)

    const supabase = createAdminSupabaseClient()

    // 1. Check if device is registered, auto-register if not
    let device = await checkDeviceActive(input.deviceId)
    
    if (!device) {
      // Auto-register new device
      const deviceLabel = input.model 
        ? `${input.model}` 
        : `${input.app?.platform || 'Mobile'} Device - Auto Registered`
      
      const { data: newDevice, error: deviceError } = await supabase
        .from('devices')
        .insert({
          device_id: input.deviceId,
          label: deviceLabel,
          is_active: true,
        })
        .select('id, device_id, is_active')
        .single()

      if (deviceError) {
        console.error('Auto-register device error:', deviceError)
        return errors.internalError('Failed to register device')
      }

      device = {
        id: newDevice.id,
        deviceId: newDevice.device_id,
        isActive: newDevice.is_active,
      }
    }

    // Check if device is active
    if (!device.isActive) {
      return errors.deviceNotRegistered() // Using existing error for blocked device
    }

    // 2. Check capture timestamp is not stale
    const capturedAt = new Date(input.capturedAt)
    const now = new Date()
    const skewSeconds = Math.abs((now.getTime() - capturedAt.getTime()) / 1000)

    if (skewSeconds > CAPTURE_MAX_SKEW_SECONDS) {
      return errors.captureStale()
    }

    // 3. Check for anti-replay (clientCaptureId + deviceId already used)
    const { data: existingCapture } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('device_id', input.deviceId)
      .eq('client_capture_id', input.clientCaptureId)
      .single()

    if (existingCapture) {
      return errors.duplicateCapture()
    }

    // 4. Identify face
    const identifyResult = await identifyFace(input.payload.embedding)

    if (!identifyResult) {
      return errors.faceNotRecognized()
    }

    // 5. Generate token pair
    const tokenPair = await generateTokenPair({
      employeeUuid: identifyResult.employee.id,
      deviceUuid: device.id,
      deviceIdString: input.deviceId,
      employeeId: identifyResult.employee.employeeId,
      fullName: identifyResult.employee.fullName,
    })

    // 6. Hash refresh token and store session
    const refreshTokenHash = await hashRefreshToken(tokenPair.refreshToken)

    const { error: sessionError } = await supabase
      .from('mobile_sessions')
      .insert({
        employee_id: identifyResult.employee.id,
        device_id: device.id,
        refresh_token_hash: refreshTokenHash,
        expires_at: tokenPair.refreshExpiresAt.toISOString(),
      })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return errors.internalError('Failed to create session')
    }

    // 7. Return success response
    return successResponse({
      employee: {
        id: identifyResult.employee.id,
        employeeId: identifyResult.employee.employeeId,
        fullName: identifyResult.employee.fullName,
        email: identifyResult.employee.email,
        department: identifyResult.employee.department,
      },
      matchScore: identifyResult.score,
      session: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Face login error:', error)
    return errors.internalError()
  }
}
