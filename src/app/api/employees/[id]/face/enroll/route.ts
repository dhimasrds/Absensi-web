import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { enrollFaceSchema } from '@/lib/validators/face'
import { ZodError } from 'zod'
import { preprocessEmbedding, validateEmbedding, logEmbeddingInfo } from '@/lib/face/embedding'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/employees/[id]/face/enroll - Enroll face template for employee
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    
    const { id } = await params
    const body = await request.json()
    
    // Validate request body
    const input = enrollFaceSchema.parse(body)

    const supabase = await createServerSupabaseClient()

    // Check if employee exists and is active
    const { data: employee } = await supabase
      .from('employees')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (!employee) {
      return errors.notFound('Employee')
    }

    if (!employee.is_active) {
      return errors.badRequest('EMPLOYEE_INACTIVE', 'Cannot enroll face for inactive employee')
    }

    // Validate and preprocess embedding
    // This ensures alignment with mobile side (L2 normalization, etc)
    const rawEmbedding = input.payload.embedding
    logEmbeddingInfo(rawEmbedding, 'Enrollment - Raw')
    
    const validation = validateEmbedding(rawEmbedding)
    if (!validation.valid) {
      console.error('Embedding validation failed:', validation.errors)
      return errors.badRequest('INVALID_EMBEDDING', `Invalid embedding: ${validation.errors.join(', ')}`)
    }
    
    // Preprocess (will normalize if needed)
    const processedEmbedding = preprocessEmbedding(rawEmbedding)
    logEmbeddingInfo(processedEmbedding, 'Enrollment - Processed')

    // Convert embedding array to vector format for PostgreSQL
    const embeddingVector = `[${processedEmbedding.join(',')}]`

    // Upload face photo to storage if provided
    let facePhotoPath: string | null = null
    let facePhotoMime: string | null = null
    
    console.log('Face photo upload attempt:', {
      hasPhoto: !!input.facePhotoBase64,
      photoLength: input.facePhotoBase64?.length || 0,
      photoPrefix: input.facePhotoBase64?.substring(0, 50) || 'none'
    })
    
    if (input.facePhotoBase64) {
      try {
        // Extract mime type and base64 data from data URL
        const matches = input.facePhotoBase64.match(/^data:([^;]+);base64,(.+)$/)
        console.log('Regex match result:', {
          matched: !!matches,
          mime: matches?.[1],
          dataLength: matches?.[2]?.length || 0
        })
        
        if (matches) {
          facePhotoMime = matches[1]
          const base64Data = matches[2]
          const buffer = Buffer.from(base64Data, 'base64')
          
          // Generate unique filename
          const timestamp = Date.now()
          const ext = facePhotoMime.split('/')[1] || 'jpg'
          facePhotoPath = `${id}/${timestamp}.${ext}`
          
          console.log('Uploading to storage:', {
            path: facePhotoPath,
            mime: facePhotoMime,
            size: buffer.length
          })
          
          // Use service role client for storage upload (bypass RLS)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
          
          // Upload to Supabase storage with service role
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('face-photos')
            .upload(facePhotoPath, buffer, {
              contentType: facePhotoMime,
              upsert: true,
            })
          
          if (uploadError) {
            console.error('Failed to upload face photo:', uploadError)
            console.error('Upload error details:', JSON.stringify(uploadError))
            // Continue without photo - non-critical
            facePhotoPath = null
            facePhotoMime = null
          } else {
            console.log('✅ Photo uploaded successfully:', uploadData)
          }
        } else {
          console.error('❌ Regex match failed - invalid data URL format')
        }
      } catch (uploadErr) {
        console.error('Error processing face photo:', uploadErr)
        console.error('Upload exception:', uploadErr instanceof Error ? uploadErr.message : uploadErr)
        // Continue without photo - non-critical
        facePhotoPath = null
        facePhotoMime = null
      }
    } else {
      console.log('⚠️ No facePhotoBase64 provided in request')
    }

    // Check if face template already exists for this employee
    const { data: existingTemplate } = await supabase
      .from('face_templates')
      .select('id')
      .eq('employee_id', id)
      .single()

    let result

    if (existingTemplate) {
      // Update existing template
      const updateData: Record<string, unknown> = {
        template_version: input.templateVersion,
        embedding: embeddingVector,
        quality_score: input.qualityScore || null,
        is_active: true,
      }
      
      // Only update photo fields if new photo was uploaded
      if (facePhotoPath) {
        updateData.face_photo_path = facePhotoPath
        updateData.face_photo_mime = facePhotoMime
      }
      
      const { data, error } = await supabase
        .from('face_templates')
        .update(updateData)
        .eq('employee_id', id)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return errors.internalError('Failed to update face template')
      }
      result = data
    } else {
      // Insert new template
      const { data, error } = await supabase
        .from('face_templates')
        .insert({
          employee_id: id,
          template_version: input.templateVersion,
          embedding: embeddingVector,
          quality_score: input.qualityScore || null,
          is_active: true,
          face_photo_path: facePhotoPath,
          face_photo_mime: facePhotoMime,
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return errors.internalError('Failed to create face template')
      }
      result = data
    }

    // Generate signed URL for face photo if available
    let facePhotoUrl: string | null = null
    if (result.face_photo_path) {
      // Use service role client for generating signed URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('face-photos')
        .createSignedUrl(result.face_photo_path, 3600) // 1 hour expiry
      
      if (signedUrl) {
        facePhotoUrl = signedUrl.signedUrl
      }
    }

    return successResponse({
      id: result.id,
      employeeId: result.employee_id,
      templateVersion: result.template_version,
      qualityScore: result.quality_score,
      isActive: result.is_active,
      facePhotoUrl, // Include photo URL in response
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }, { status: existingTemplate ? 200 : 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    if (error instanceof Response) {
      return error
    }
    console.error('Unexpected error:', error)
    return errors.internalError()
  }
}
