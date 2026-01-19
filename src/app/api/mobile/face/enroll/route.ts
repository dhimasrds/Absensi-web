import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { z } from 'zod'

/**
 * Mobile Face Enrollment API
 * 
 * This endpoint allows mobile app to enroll face embeddings using MobileFaceNet.
 * The embedding is generated on the mobile device using the same model that will
 * be used for face login, ensuring consistency.
 * 
 * POST /api/mobile/face/enroll
 */

const enrollSchema = z.object({
  deviceId: z.string().min(1),
  employeeCode: z.string().optional(), // Employee code for identification
  employeeId: z.string().uuid().optional(), // Or employee UUID directly
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z.array(z.number()).min(128).max(192),
  }),
  liveness: z.object({
    provided: z.boolean(),
    score: z.number().min(0).max(1),
  }).optional(),
  facePhotoBase64: z.string().optional(), // Optional face photo
  model: z.string().optional(),
  os: z.string().optional(),
}).refine(data => data.employeeCode || data.employeeId, {
  message: "Either employeeCode or employeeId is required"
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = enrollSchema.parse(body)

    const supabase = createAdminSupabaseClient()

    // 1. Find employee by employee code OR employee ID
    let employee: { id: string; employee_code: string; full_name: string; status: string } | null = null
    
    if (input.employeeId) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, full_name, status')
        .eq('id', input.employeeId)
        .single()
      
      if (!error && data) employee = data
    } else if (input.employeeCode) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, full_name, status')
        .eq('employee_code', input.employeeCode)
        .single()
      
      if (!error && data) employee = data
    }

    if (!employee) {
      return errors.notFound('Employee')
    }

    if (employee.status !== 'ACTIVE') {
      return errors.forbidden('Employee is not active')
    }

    // 2. Validate liveness score if provided
    const livenessThreshold = parseFloat(process.env.FACE_LIVENESS_THRESHOLD || '0.7')
    if (input.liveness?.provided && input.liveness.score < livenessThreshold) {
      return errors.badRequest('LIVENESS_FAILED', 'Liveness check failed. Please try again with a real face.')
    }

    // 3. Check if employee already has face enrollment
    const { data: existingTemplate } = await supabase
      .from('face_templates')
      .select('id, created_at')
      .eq('employee_id', employee.id)
      .single()

    // 4. Prepare embedding (ensure it's stored consistently)
    const embedding = input.payload.embedding
    
    // L2 normalize if not already
    const l2Norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    const normalizedEmbedding = Math.abs(l2Norm - 1.0) < 0.01 
      ? embedding 
      : embedding.map(v => v / l2Norm)

    // 5. Upload face photo if provided
    let facePhotoUrl: string | null = null
    if (input.facePhotoBase64) {
      try {
        // Extract base64 data
        const base64Data = input.facePhotoBase64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Generate filename
        const filename = `${employee.id}/face_mobile_${Date.now()}.jpg`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('face-photos')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!uploadError && uploadData) {
          const { data: publicUrl } = supabase.storage
            .from('face-photos')
            .getPublicUrl(filename)
          facePhotoUrl = publicUrl?.publicUrl || null
        }
      } catch (photoError) {
        console.error('Failed to upload face photo:', photoError)
        // Continue without photo - not critical
      }
    }

    // 6. Insert or update face template
    if (existingTemplate) {
      // Update existing template
      const { error: updateError } = await supabase
        .from('face_templates')
        .update({
          embedding: normalizedEmbedding,
          template_version: 2, // Version 2 = MobileFaceNet from mobile
          quality_score: input.liveness?.score || null,
          face_photo_url: facePhotoUrl || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTemplate.id)

      if (updateError) {
        console.error('Update face template error:', updateError)
        return errors.internalError('Failed to update face template')
      }

      console.log(`[mobile-enroll] Updated face template for ${employee.employee_code} (${employee.full_name})`)

      return successResponse({
        message: 'Face template updated successfully',
        employee: {
          id: employee.id,
          employeeCode: employee.employee_code,
          fullName: employee.full_name,
        },
        templateVersion: 2,
        enrolledAt: new Date().toISOString(),
        facePhotoUrl,
      })
    } else {
      // Insert new template
      const { data: newTemplate, error: insertError } = await supabase
        .from('face_templates')
        .insert({
          employee_id: employee.id,
          embedding: normalizedEmbedding,
          template_version: 2, // Version 2 = MobileFaceNet from mobile
          quality_score: input.liveness?.score || null,
          face_photo_url: facePhotoUrl,
        })
        .select('id, created_at')
        .single()

      if (insertError) {
        console.error('Insert face template error:', insertError)
        return errors.internalError('Failed to create face template')
      }

      console.log(`[mobile-enroll] Created face template for ${employee.employee_code} (${employee.full_name})`)

      return successResponse({
        message: 'Face enrolled successfully',
        employee: {
          id: employee.id,
          employeeCode: employee.employee_code,
          fullName: employee.full_name,
        },
        templateVersion: 2,
        enrolledAt: newTemplate.created_at,
        facePhotoUrl,
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.badRequest('VALIDATION_ERROR', 'Invalid request body', {
        details: error.issues,
      })
    }

    console.error('Mobile face enroll error:', error)
    return errors.internalError('Failed to enroll face')
  }
}
