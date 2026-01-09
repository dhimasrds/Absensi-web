import { NextRequest } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, validationErrorResponse, errors } from '@/lib/api/response'
import { requireMobileAuth } from '@/lib/auth/mobileGuard'
import { mobileHistoryQuerySchema } from '@/lib/validators/attendance'
import { ZodError } from 'zod'
import { createClient } from '@supabase/supabase-js'

// GET /api/mobile/attendance/history - Get attendance history for the authenticated employee
export async function GET(request: NextRequest) {
  try {
    // Verify JWT and get payload
    const payload = await requireMobileAuth(request)

    // Parse query params (support both from/to and startDate/endDate)
    const { searchParams } = new URL(request.url)
    const queryParams = {
      from: searchParams.get('from') || searchParams.get('startDate') || undefined,
      to: searchParams.get('to') || searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    }

    // Validate query params
    const query = mobileHistoryQuerySchema.parse(queryParams)

    const supabase = createAdminSupabaseClient()

    // Build query
    let dbQuery = supabase
      .from('attendance_logs')
      .select('*', { count: 'exact' })
      .eq('employee_id', payload.sub)  // Use payload.sub (employee UUID)
      .order('captured_at', { ascending: false })

    // Apply filters
    if (query.from) {
      dbQuery = dbQuery.gte('captured_at', query.from)
    }
    if (query.to) {
      dbQuery = dbQuery.lte('captured_at', query.to)
    }
    if (query.type) {
      dbQuery = dbQuery.eq('type', query.type)  // Column name is 'type', not 'attendance_type'
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data: attendances, error, count } = await dbQuery

    if (error) {
      console.error('History fetch error:', error)
      return errors.internalError('Failed to fetch attendance history')
    }

    // Create admin client for generating signed URLs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Transform response with signed URLs for proof images
    const items = await Promise.all((attendances || []).map(async (att) => {
      let proofImageUrl: string | null = null
      
      // Generate signed URL if proof image exists
      if (att.proof_image_path) {
        try {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from('attendance-proofs')
            .createSignedUrl(att.proof_image_path, 3600) // 1 hour expiry
          
          if (signedUrlData) {
            proofImageUrl = signedUrlData.signedUrl
          }
        } catch (urlError) {
          console.error('[history] Proof image URL error:', urlError)
        }
      }

      return {
        id: att.id,
        type: att.type,  // "CHECK_IN" or "CHECK_OUT"
        timestamp: att.timestamp,
        capturedAt: att.captured_at,
        latitude: att.latitude,
        longitude: att.longitude,
        verificationMethod: att.verification_method,
        verificationStatus: att.verification_status,
        matchScore: att.match_score,
        livenessScore: att.liveness_score,
        note: att.note,
        proofImageUrl,
        proofImageMime: att.proof_image_mime,
      }
    }))

    return successResponse(items, {
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count || 0,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error)
    }
    // Handle thrown Response (from mobileGuard)
    if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
      return error as Response
    }
    console.error('History error:', error)
    return errors.internalError()
  }
}
