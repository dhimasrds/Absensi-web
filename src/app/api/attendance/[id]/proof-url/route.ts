import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { requireAdmin } from '@/lib/auth/adminGuard'

// GET /api/attendance/[id]/proof-url - Get signed URL for attendance proof image (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined
  
  try {
    // Verify admin
    const authResult = await requireAdmin()
    if (authResult instanceof Response) {
      return authResult
    }

    // Resolve params (Next.js 15 async params)
    try {
      const resolvedParams = await params
      id = resolvedParams.id
    } catch (paramsError) {
      console.error('Failed to resolve params:', paramsError)
      return errors.badRequest('INVALID_REQUEST', 'Failed to parse request parameters')
    }
    
    console.log('Proof URL request for attendance ID:', id)

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!id || !uuidRegex.test(id)) {
      console.error('Invalid UUID format:', id)
      return errors.badRequest('INVALID_ID', 'Invalid attendance ID format')
    }

    const supabase = createAdminSupabaseClient()

    // Get attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('id, proof_image_path, proof_image_mime')
      .eq('id', id)
      .single()

    if (fetchError || !attendance) {
      return errors.notFound('Attendance record')
    }

    if (!attendance.proof_image_path) {
      console.log('No proof_image_path for attendance:', id)
      return errors.notFound('Proof image')
    }

    console.log('Fetching signed URL for path:', attendance.proof_image_path)

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('attendance-proofs')
      .createSignedUrl(attendance.proof_image_path, 3600)

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError)
      console.error('Path attempted:', attendance.proof_image_path)
      return errors.internalError('Failed to generate proof URL')
    }

    console.log('Successfully generated signed URL')
    return successResponse({
      attendanceId: attendance.id,
      proofUrl: signedUrl.signedUrl,
      mimeType: attendance.proof_image_mime,
      expiresIn: 3600, // seconds
    })
  } catch (error) {
    console.error('Proof URL error:', error)
    return errors.internalError()
  }
}
