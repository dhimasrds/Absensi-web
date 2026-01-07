import { NextRequest } from 'next/server'
import { verifyAccessToken, MobileJwtPayload } from './mobileJwt'
import { errors } from '@/lib/api/response'

/**
 * Validates mobile JWT from Authorization header
 * Returns decoded payload if valid, throws error response if not
 */
export async function requireMobileAuth(request: NextRequest): Promise<MobileJwtPayload> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw errors.unauthorized()
  }

  const token = authHeader.substring(7)
  
  try {
    const payload = await verifyAccessToken(token)
    return payload
  } catch {
    throw errors.unauthorized()
  }
}

/**
 * Validates that deviceId in request matches token
 */
export function validateDeviceMatch(
  tokenDeviceIdString: string,
  requestDeviceId: string
): void {
  if (tokenDeviceIdString !== requestDeviceId) {
    throw errors.deviceMismatch()
  }
}

/**
 * Validates that employeeId in request (if provided) matches token
 */
export function validateEmployeeMatch(
  tokenEmployeeUuid: string,
  requestEmployeeId?: string
): void {
  if (requestEmployeeId && requestEmployeeId !== tokenEmployeeUuid) {
    throw errors.employeeMismatch()
  }
}
