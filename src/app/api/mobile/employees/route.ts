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

    let query = supabase
      .from('employees')
      .select('id, employee_code, full_name')
      .eq('status', 'ACTIVE')
      .order('employee_code')

    // Filter by code if provided
    if (code) {
      query = query.ilike('employee_code', `%${code}%`)
    }

    const { data: employees, error } = await query.limit(20)

    if (error) {
      console.error('List employees error:', error)
      return errors.internalError('Failed to list employees')
    }

    return successResponse({
      employees: employees.map(emp => ({
        id: emp.id,
        employeeCode: emp.employee_code,
        fullName: emp.full_name,
      })),
      total: employees.length,
    })
  } catch (error) {
    console.error('List employees error:', error)
    return errors.internalError('Failed to list employees')
  }
}
