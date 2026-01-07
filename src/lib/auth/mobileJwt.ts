import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Environment variables
const JWT_SECRET = process.env.APP_JWT_SECRET || 'default-secret-change-me'
const JWT_ISSUER = process.env.APP_JWT_ISSUER || 'attendance-app'
const ACCESS_TOKEN_TTL = parseInt(process.env.APP_ACCESS_TOKEN_TTL_SECONDS || '3600', 10)
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.MOBILE_REFRESH_TOKEN_TTL_DAYS || '30', 10)

// Get secret as Uint8Array for jose
function getSecret(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET)
}

// Mobile JWT payload interface
export interface MobileJwtPayload extends JWTPayload {
  sub: string // employee_id (UUID)
  deviceId: string // device UUID
  deviceIdString: string // original device_id string
  employeeId: string // employee_id code (e.g., EMP001)
  fullName: string
  type: 'access' | 'refresh'
}

// Token pair result
export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds
  refreshExpiresAt: Date
}

/**
 * Generate access token for mobile app
 */
export async function generateAccessToken(payload: {
  employeeUuid: string
  deviceUuid: string
  deviceIdString: string
  employeeId: string
  fullName: string
}): Promise<string> {
  const token = await new SignJWT({
    sub: payload.employeeUuid,
    deviceId: payload.deviceUuid,
    deviceIdString: payload.deviceIdString,
    employeeId: payload.employeeId,
    fullName: payload.fullName,
    type: 'access',
  } as MobileJwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(getSecret())

  return token
}

/**
 * Generate refresh token (random UUID)
 */
export function generateRefreshToken(): string {
  return uuidv4()
}

/**
 * Hash refresh token for storage
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10)
}

/**
 * Verify refresh token against hash
 */
export async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash)
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(payload: {
  employeeUuid: string
  deviceUuid: string
  deviceIdString: string
  employeeId: string
  fullName: string
}): Promise<TokenPair> {
  const accessToken = await generateAccessToken(payload)
  const refreshToken = generateRefreshToken()
  
  const refreshExpiresAt = new Date()
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
    refreshExpiresAt,
  }
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(token: string): Promise<MobileJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JWT_ISSUER,
    })

    const mobilePayload = payload as MobileJwtPayload

    if (mobilePayload.type !== 'access') {
      throw new Error('Invalid token type')
    }

    return mobilePayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
  return expiresAt
}

/**
 * Get access token TTL in seconds
 */
export function getAccessTokenTTL(): number {
  return ACCESS_TOKEN_TTL
}
