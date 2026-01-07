import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { refreshTokenSchema } from '@/lib/validators/mobileAuth'
import { verifyRefreshTokenHash, generateAccessToken, getAccessTokenTTL } from '@/lib/auth/mobileJwt'
import { ZodError } from 'zod'

// POST /api/mobile/auth/refresh - Refresh access token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const input = refreshTokenSchema.parse(body)

    const supabase = createAdminSupabaseClient()

    // Find all non-expired, non-revoked sessions and check hash
    const { data: sessions, error: sessionError } = await supabase
      .from('mobile_sessions')
      .select(`
        id,
        employee_id,
        device_id,
        refresh_token_hash,
        expires_at,
        revoked_at,
        employees (
          id,
          employee_id,
          full_name,
          is_active
        ),
        devices (
          id,
          device_id,
          is_active
        )
      `)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    if (sessionError) {
      console.error('Session lookup error:', sessionError)
      return errors.internalError('Failed to lookup session')
    }

    if (!sessions || sessions.length === 0) {
      return errors.invalidRefreshToken()
    }

    // Find the session with matching refresh token hash
    let matchedSession = null
    for (const session of sessions) {
      const isMatch = await verifyRefreshTokenHash(input.refreshToken, session.refresh_token_hash)
      if (isMatch) {
        matchedSession = session
        break
      }
    }

    if (!matchedSession) {
      return errors.invalidRefreshToken()
    }

    // Type assertion for joined data
    const employee = matchedSession.employees as unknown as {
      id: string
      employee_id: string
      full_name: string
      is_active: boolean
    }
    const device = matchedSession.devices as unknown as {
      id: string
      device_id: string
      is_active: boolean
    }

    // Check if employee is still active
    if (!employee || !employee.is_active) {
      // Revoke session
      await supabase
        .from('mobile_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', matchedSession.id)
      
      return errors.forbidden('Employee account is inactive')
    }

    // Check if device is still active
    if (!device || !device.is_active) {
      // Revoke session
      await supabase
        .from('mobile_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', matchedSession.id)
      
      return errors.deviceNotRegistered()
    }

    // Generate new access token
    const accessToken = await generateAccessToken({
      employeeUuid: employee.id,
      deviceUuid: device.id,
      deviceIdString: device.device_id,
      employeeId: employee.employee_id,
      fullName: employee.full_name,
    })

    return successResponse({
      accessToken,
      expiresIn: getAccessTokenTTL(),
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Token refresh error:', error)
    return errors.internalError()
  }
}
