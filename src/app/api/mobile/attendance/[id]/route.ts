import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { requireMobileAuth } from '@/lib/auth/mobileGuard'
import { createClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/mobile/attendance/[id] - Get attendance detail by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)
    
    const { id } = await params  // Await params in Next.js 15
    const supabase = createAdminSupabaseClient()

    // Fetch attendance detail
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        type,
        timestamp,
        captured_at,
        source,
        device_id,
        verification_method,
        verification_status,
        match_score,
        liveness_score,
        note,
        proof_image_path,
        proof_image_mime,
        client_capture_id,
        latitude,
        longitude,
        created_at,
        updated_at,
        employee:employees!attendance_logs_employee_id_fkey (
          id,
          employee_code,
          full_name,
          email,
          phone,
          department,
          position
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[attendance-detail] Fetch error:', fetchError)
      
      if (fetchError.code === 'PGRST116') {
        return errors.notFound('Attendance record not found')
      }
      
      return errors.internalError('Failed to fetch attendance detail')
    }

    if (!attendance) {
      return errors.notFound('Attendance record not found')
    }

    // Extract employee data (Supabase returns foreign relations as array or single object)
    const employeeData = Array.isArray(attendance.employee) 
      ? attendance.employee[0] 
      : attendance.employee

    // Verify that attendance belongs to the authenticated employee
    if (employeeData.id !== payload.sub) {
      return errors.forbidden('You can only view your own attendance records')
    }

    // Generate signed URL for proof image if exists
    let proofImageUrl: string | null = null
    if (attendance.proof_image_path) {
      try {
        // Create admin client with service role key (bypasses RLS)
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('attendance-proofs')
          .createSignedUrl(attendance.proof_image_path, 3600) // 1 hour expiry

        if (signedUrlError) {
          console.error('[attendance-detail] Signed URL error:', signedUrlError)
        } else {
          proofImageUrl = signedUrlData.signedUrl
        }
      } catch (urlError) {
        console.error('[attendance-detail] Proof image URL error:', urlError)
      }
    }

    // Format response
    const response = {
      id: attendance.id,
      type: attendance.type,
      timestamp: attendance.timestamp,
      capturedAt: attendance.captured_at,
      source: attendance.source,
      deviceId: attendance.device_id,
      verificationMethod: attendance.verification_method,
      verificationStatus: attendance.verification_status,
      matchScore: attendance.match_score,
      livenessScore: attendance.liveness_score,
      note: attendance.note,
      latitude: attendance.latitude,
      longitude: attendance.longitude,
      proofImageUrl,
      proofImageMime: attendance.proof_image_mime,
      clientCaptureId: attendance.client_capture_id,
      createdAt: attendance.created_at,
      updatedAt: attendance.updated_at,
      employee: {
        id: employeeData.id,
        employeeCode: employeeData.employee_code,
        fullName: employeeData.full_name,
        email: employeeData.email,
        phone: employeeData.phone,
        department: employeeData.department,
        position: employeeData.position,
      }
    }

    return successResponse(response)
  } catch (error) {
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('[attendance-detail] Error:', error)
    return errors.internalError()
  }
}
