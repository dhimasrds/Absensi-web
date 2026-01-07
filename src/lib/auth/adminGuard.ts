import { createServerSupabaseClient } from '@/lib/supabase/server'
import { errors } from '@/lib/api/response'
import { NextRequest } from 'next/server'

export interface AdminUser {
  id: string
  email: string
  role: string
}

/**
 * Validates admin authentication and authorization
 * Returns admin user if valid, throws error response if not
 */
export async function requireAdmin(request?: NextRequest): Promise<AdminUser> {
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
 * Validates admin from Authorization header (for API routes)
 * Expects: Authorization: Bearer <supabase_access_token>
 */
export async function requireAdminFromHeader(request: NextRequest): Promise<AdminUser> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
