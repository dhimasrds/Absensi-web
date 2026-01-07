import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/adminGuard'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { enrollFaceSchema } from '@/lib/validators/face'
import { ZodError } from 'zod'

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

    // Convert embedding array to vector format for PostgreSQL
    const embeddingVector = `[${input.payload.embedding.join(',')}]`
    
    // Convert templateVersion to string for database
    const templateVersionStr = String(input.templateVersion)

    // Check if face template already exists for this employee
    const { data: existingTemplate } = await supabase
      .from('face_templates')
      .select('id')
      .eq('employee_id', id)
      .single()

    let result

    if (existingTemplate) {
      // Update existing template
      const { data, error } = await supabase
        .from('face_templates')
        .update({
          template_version: templateVersionStr,
          embedding: embeddingVector,
          quality_score: input.qualityScore || null,
          is_active: true,
        })
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
          template_version: templateVersionStr,
          embedding: embeddingVector,
          quality_score: input.qualityScore || null,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        return errors.internalError('Failed to create face template')
      }
      result = data
    }

    return successResponse({
      id: result.id,
      employeeId: result.employee_id,
      templateVersion: result.template_version,
      qualityScore: result.quality_score,
      isActive: result.is_active,
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
