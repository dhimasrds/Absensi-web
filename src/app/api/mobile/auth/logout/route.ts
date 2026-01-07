import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { logoutSchema } from '@/lib/validators/mobileAuth'
import { verifyRefreshTokenHash } from '@/lib/auth/mobileJwt'
import { ZodError } from 'zod'

// POST /api/mobile/auth/logout - Revoke refresh token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const input = logoutSchema.parse(body)

    const supabase = createAdminSupabaseClient()

    // Find all non-revoked sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('mobile_sessions')
      .select('id, refresh_token_hash')
      .is('revoked_at', null)

    if (sessionError) {
      console.error('Session lookup error:', sessionError)
      return errors.internalError('Failed to lookup session')
    }

    if (!sessions || sessions.length === 0) {
      // No active sessions, but still return success (idempotent)
      return successResponse({ message: 'Logged out successfully' })
    }

    // Find the session with matching refresh token hash
    let matchedSessionId = null
    for (const session of sessions) {
      const isMatch = await verifyRefreshTokenHash(input.refreshToken, session.refresh_token_hash)
      if (isMatch) {
        matchedSessionId = session.id
        break
      }
    }

    if (matchedSessionId) {
      // Revoke the session
      const { error: revokeError } = await supabase
        .from('mobile_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', matchedSessionId)

      if (revokeError) {
        console.error('Session revoke error:', revokeError)
        return errors.internalError('Failed to revoke session')
      }
    }

    // Return success even if token wasn't found (idempotent)
    return successResponse({ message: 'Logged out successfully' })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Logout error:', error)
    return errors.internalError()
  }
}
