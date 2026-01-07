import { createServerSupabaseClient } from '@/lib/supabase/server'
import { errors } from '@/lib/api/response'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  email: string
  role: string
}

/**
 * Validates admin authentication and authorization
 * Supports both cookie-based auth (browser) and Bearer token auth (API/Postman)
 * Returns admin user if valid, throws error response if not
 */
export async function requireAdmin(request?: NextRequest): Promise<AdminUser> {
  // First, try to get token from Authorization header
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')
  
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    // Use Bearer token authentication
    const token = authHeader.substring(7)
    return await validateAdminWithToken(token)
  }
  
  // Fall back to cookie-based authentication (for browser requests)
  const supabase = await createServerSupabaseClient()
  
  // Get current user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw errors.unauthorized()
  }

  // Check if user has admin role in profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw errors.forbidden('User profile not found or not authorized')
  }

  if (profile.role !== 'admin') {
    throw errors.forbidden('Admin access required')
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role,
  }
}

/**
 * Validates admin using Bearer token
 */
async function validateAdminWithToken(token: string): Promise<AdminUser> {
  // Create Supabase client with service role to validate the token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
  
  // Verify the token by getting user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw errors.unauthorized()
  }

  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    throw errors.forbidden('Admin access required')
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role,
  }
}

/**
 * Validates admin from Authorization header (for API routes)
 * Expects: Authorization: Bearer <supabase_access_token>
 * Note: Bearer is case-insensitive per RFC 7235
 */
export async function requireAdminFromHeader(request: NextRequest): Promise<AdminUser> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw errors.unauthorized()
  }

  const token = authHeader.substring(7)
  
  // Create a temporary Supabase client with the provided token
  const supabase = await createServerSupabaseClient()
  
  // Verify the token by getting user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw errors.unauthorized()
  }

  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    throw errors.forbidden('Admin access required')
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role,
  }
}

/**
 * Check if current session is admin (for middleware/page protection)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}
