import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { requireMobileAuth } from '@/lib/auth/mobileGuard'

// GET /api/mobile/me - Get current authenticated employee info
export async function GET(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)
    const supabase = createAdminSupabaseClient()

    // Get employee details
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        full_name,
        email,
        phone_number,
        job_title,
        department,
        active,
        created_at,
        face_templates (
          id,
          version,
          is_active,
          created_at
        )
      `)
      .eq('id', payload.employeeId)
      .eq('active', true)
      .single()

    if (error || !employee) {
      console.error('Employee not found:', error)
      return errors.notFound('Employee not found or inactive')
    }

    // Get device info
    const { data: device } = await supabase
      .from('devices')
      .select('id, device_name, device_model, os_version')
      .eq('id', payload.deviceId)
      .eq('active', true)
      .single()

    // Get active session count
    const { count: activeSessions } = await supabase
      .from('mobile_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', payload.employeeId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    return successResponse({
      employee: {
        id: employee.id,
        employeeCode: employee.employee_code,
        fullName: employee.full_name,
        email: employee.email,
        phoneNumber: employee.phone_number,
        jobTitle: employee.job_title,
        department: employee.department,
        hasEnrolledFace: employee.face_templates && employee.face_templates.length > 0,
        activeFaceTemplates: employee.face_templates?.filter((ft: { is_active: boolean }) => ft.is_active).length || 0,
      },
      device: device ? {
        id: device.id,
        deviceName: device.device_name,
        deviceModel: device.device_model,
        osVersion: device.os_version,
      } : null,
      session: {
        employeeId: payload.employeeId,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId,
        activeSessions: activeSessions || 0,
      }
    })
  } catch (error) {
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('Get me error:', error)
    return errors.internalError()
  }
}
