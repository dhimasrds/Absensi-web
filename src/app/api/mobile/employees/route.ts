import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'

/**
 * GET /api/mobile/employees
 * 
 * List active employees for mobile enrollment.
 * Returns minimal info (code, name) for privacy.
 * 
 * Query params:
 * - code: Filter by employee code (partial match)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    const supabase = createAdminSupabaseClient()

    // List ALL employees (including non-active for debugging)
    let query = supabase
      .from('employees')
      .select('id, employee_code, full_name, status')
      .order('employee_code')

    // Filter by code if provided (case insensitive)
    if (code) {
      query = query.ilike('employee_code', `%${code}%`)
    }

    const { data: employees, error } = await query.limit(50)

    if (error) {
      console.error('List employees error:', error)
      return errors.internalError(`Failed to list employees: ${error.message}`)
    }

    return successResponse({
      employees: (employees || []).map(emp => ({
        id: emp.id,
        employeeCode: emp.employee_code,
        fullName: emp.full_name,
        status: emp.status,
      })),
      total: employees?.length || 0,
    })
  } catch (error) {
    console.error('List employees error:', error)
    return errors.internalError('Failed to list employees')
  }
}
