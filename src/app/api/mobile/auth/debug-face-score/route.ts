import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const FACE_MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.80')

const debugFaceSchema = z.object({
  embedding: z.array(z.number()).length(128),
})

/**
 * Debug endpoint to check face matching score
 * Returns actual similarity scores from database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = debugFaceSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid embedding format', details: result.error },
        { status: 400 }
      )
    }

    const { embedding } = result.data
    const supabase = createAdminSupabaseClient()

    // Convert embedding to vector format
    const embeddingVector = `[${embedding.join(',')}]`

    // Get ALL face templates with scores (no threshold filtering)
    const { data, error } = await supabase.rpc('face_identify_v1', {
      query_embedding: embeddingVector,
      match_threshold: 0.0, // Get all results
      match_count: 10, // Top 10 matches
    })

    if (error) {
      return NextResponse.json(
        { error: 'Database error', details: error },
        { status: 500 }
      )
    }

    // Get employee details for each match
    const matches = await Promise.all(
      (data || []).map(async (match: any) => {
        const { data: employee } = await supabase
          .from('employees')
          .select('id, employee_id, full_name, email, department, is_active')
          .eq('id', match.employee_id)
          .single()

        return {
          employeeId: employee?.employee_id || 'unknown',
          fullName: employee?.full_name || 'unknown',
          isActive: employee?.is_active || false,
          score: match.score,
          passThreshold: match.score >= FACE_MATCH_THRESHOLD,
        }
      })
    )

    return NextResponse.json({
      config: {
        threshold: FACE_MATCH_THRESHOLD,
        minScoreRequired: `${(FACE_MATCH_THRESHOLD * 100).toFixed(0)}%`,
      },
      results: {
        totalMatches: matches.length,
        bestMatch: matches[0] || null,
        allMatches: matches,
      },
      analysis: {
        hasPassingMatch: matches.some(m => m.passThreshold),
        bestScore: matches[0]?.score || 0,
        scoreGap: matches[0] 
          ? (FACE_MATCH_THRESHOLD - matches[0].score).toFixed(4)
          : 'N/A',
      },
    })
  } catch (error) {
    console.error('Debug face score error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
