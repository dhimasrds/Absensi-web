import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth, validateDeviceMatch } from '@/lib/auth/mobileGuard'
import { uploadUrlSchema } from '@/lib/validators/attendance'
import { ZodError } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// POST /api/mobile/upload-url - Get signed URL for uploading attendance proof
export async function POST(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)
    
    const body = await request.json()
    
    // Validate request body
    const input = uploadUrlSchema.parse(body)
    
    // Validate device match
    validateDeviceMatch(payload.deviceId, input.deviceId)

    const supabase = createAdminSupabaseClient()

    // Generate unique file path
    const fileExtension = input.contentType === 'image/jpeg' ? 'jpg' : 'png'
    const fileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${payload.employeeId}/${new Date().toISOString().split('T')[0]}/${fileName}`

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attendance-proofs')
      .createSignedUploadUrl(filePath)

    if (uploadError) {
      console.error('Upload URL error:', uploadError)
      return errors.internalError('Failed to generate upload URL')
    }

    // URL expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    return successResponse({
      uploadUrl: uploadData.signedUrl,
      filePath: filePath,
      expiresAt: expiresAt,
      token: uploadData.token,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('Upload URL error:', error)
    return errors.internalError()
  }
}
