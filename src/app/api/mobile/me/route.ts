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

    // Get employee details with work location
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        full_name,
        email,
        department,
        is_active,
        work_location_id,
        created_at,
        work_location:work_locations (
          id,
          name,
          address,
          latitude,
          longitude,
          radius_meters
        ),
        face_templates (
          id,
          template_version,
          is_active,
          created_at
        )
      `)
      .eq('id', payload.sub)  // Use payload.sub which contains employee UUID
      .eq('is_active', true)
      .single()

    if (error || !employee) {
      console.error('Employee not found:', error)
      return errors.notFound('Employee not found or inactive')
    }

    // Get device info
    const { data: device } = await supabase
      .from('devices')
      .select('id, device_id, label')
      .eq('id', payload.deviceId)
      .eq('is_active', true)
      .single()

    // Get active session count
    const { count: activeSessions } = await supabase
      .from('mobile_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', payload.sub)  // Use payload.sub (employee UUID)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    // Check if user already checked in today
    // Get start and end of today in local timezone
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Check for CHECK_IN record today
    const { data: todayCheckIn } = await supabase
      .from('attendance_logs')
      .select('id, type, timestamp, verification_status')
      .eq('employee_id', payload.sub)
      .eq('type', 'CHECK_IN')
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Check for CHECK_OUT record today (to see if already checked out)
    const { data: todayCheckOut } = await supabase
      .from('attendance_logs')
      .select('id, type, timestamp, verification_status')
      .eq('employee_id', payload.sub)
      .eq('type', 'CHECK_OUT')
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    // User has checked in if:
    // 1. There's a CHECK_IN record today, AND
    // 2. Either no CHECK_OUT record OR CHECK_OUT is before CHECK_IN
    const alreadyCheckedIn = !!todayCheckIn && (
      !todayCheckOut || 
      new Date(todayCheckIn.timestamp) > new Date(todayCheckOut.timestamp)
    )

    // Extract work location (Supabase returns as array for single relation)
    const workLocation = Array.isArray(employee.work_location) 
      ? employee.work_location[0] 
      : employee.work_location

    // Handle face_templates (could be null, single object, or array)
    const faceTemplates = employee.face_templates 
      ? (Array.isArray(employee.face_templates) ? employee.face_templates : [employee.face_templates])
      : []
    
    const hasEnrolledFace = faceTemplates.length > 0
    const activeFaceTemplates = faceTemplates.filter((ft: { is_active: boolean }) => ft.is_active).length

    return successResponse({
      employee: {
        id: employee.id,
        employeeCode: employee.employee_id,
        fullName: employee.full_name,
        email: employee.email,
        department: employee.department,
        hasEnrolledFace,
        activeFaceTemplates,
        workLocation: workLocation ? {
          id: workLocation.id,
          name: workLocation.name,
          address: workLocation.address,
          latitude: workLocation.latitude,
          longitude: workLocation.longitude,
          radiusMeters: workLocation.radius_meters,
        } : null,
      },
      device: device ? {
        id: device.id,
        deviceId: device.device_id,
        label: device.label,
      } : null,
      session: {
        employeeId: payload.sub,  // Use UUID from payload.sub
        deviceId: payload.deviceId,
        sessionId: payload.sub,  // Use employee UUID as session identifier
        activeSessions: activeSessions || 0,
      },
      attendance: {
        alreadyCheckedIn,  // Boolean: true if checked in today and not yet checked out
        lastCheckIn: todayCheckIn ? {
          timestamp: todayCheckIn.timestamp,
          verificationStatus: todayCheckIn.verification_status,
        } : null,
        lastCheckOut: todayCheckOut ? {
          timestamp: todayCheckOut.timestamp,
          verificationStatus: todayCheckOut.verification_status,
        } : null,
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
