import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, errors } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/employees/[id]/face/photo - Get face photo URL for employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    // Get active face template with photo
    const { data: faceTemplate, error } = await supabase
      .from('face_templates')
      .select('face_photo_path, face_photo_mime, created_at, updated_at')
      .eq('employee_id', id)
      .eq('is_active', true)
      .single()

    if (error || !faceTemplate) {
      return errors.notFound('Face template not found for this employee')
    }

    if (!faceTemplate.face_photo_path) {
      return errors.notFound('No face photo found for this employee')
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('face-photos')
      .createSignedUrl(faceTemplate.face_photo_path, 3600)

    if (urlError || !signedUrl) {
      console.error('Error generating signed URL:', urlError)
      return errors.internalError('Failed to generate photo URL')
    }

    return successResponse({
      photoUrl: signedUrl.signedUrl,
      mimeType: faceTemplate.face_photo_mime,
      uploadedAt: faceTemplate.updated_at || faceTemplate.created_at,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    console.error('Unexpected error:', error)
    return errors.internalError()
  }
}
