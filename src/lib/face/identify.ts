import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { FaceIdentifyResult } from '@/lib/types/database'
import { getSettingNumber } from '@/lib/settings'
import { preprocessEmbedding, validateEmbedding, logEmbeddingInfo } from '@/lib/face/embedding'

/**
 * Result type for face identification with detailed info
 */
export type IdentifyFaceResult = {
  success: true
  employee: {
    id: string
    employeeId: string
    fullName: string
    email: string | null
    department: string | null
  }
  score: number
  threshold: number
} | {
  success: false
  reason: 'NO_MATCH' | 'BELOW_THRESHOLD' | 'EMPLOYEE_INACTIVE' | 'ERROR'
  threshold: number
  bestScore?: number
  bestMatch?: {
    employeeId: string
    fullName: string
  }
  message: string
}

/**
 * Identify employee by face embedding
 * Returns detailed result including failure reason
 */
export async function identifyFaceWithDetails(embedding: number[]): Promise<IdentifyFaceResult> {
  const supabase = createAdminSupabaseClient()

  // Get threshold from settings (with fallback to env var)
  const envThreshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.60')
  const threshold = await getSettingNumber('face_match_threshold', envThreshold)

  // Validate and preprocess embedding
  logEmbeddingInfo(embedding, 'Identify - Query')
  
  const validation = validateEmbedding(embedding)
  if (!validation.valid) {
    console.error('[identifyFace] Invalid embedding:', validation.errors)
    return {
      success: false,
      reason: 'ERROR',
      threshold,
      message: `Invalid embedding: ${validation.errors.join(', ')}`
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('[identifyFace] Embedding warnings:', validation.warnings)
  }

  // Preprocess (normalize if needed)
  const processedEmbedding = preprocessEmbedding(embedding)

  // Convert embedding array to vector format
  const embeddingVector = `[${processedEmbedding.join(',')}]`

  console.log('[identifyFace] Starting face identification')
  console.log('[identifyFace] Threshold:', threshold, '(from settings)')
  console.log('[identifyFace] Embedding length:', processedEmbedding.length)
  console.log('[identifyFace] Embedding normalized:', validation.stats.isNormalized ? 'yes' : 'was normalized')

  // First, get ALL matches without threshold to see best score
  const { data: allMatches, error: allError } = await supabase.rpc('face_identify_v1', {
    query_embedding: embeddingVector,
    match_threshold: 0, // Get all matches
    match_count: 5,
  })

  if (allError) {
    console.error('[identifyFace] RPC error:', allError)
    return {
      success: false,
      reason: 'ERROR',
      threshold,
      message: 'Face identification failed due to server error'
    }
  }

  const allResults = allMatches as FaceIdentifyResult[]
  console.log('[identifyFace] All matches count:', allResults?.length || 0)

  // No matches at all
  if (!allResults || allResults.length === 0) {
    console.log('[identifyFace] No matches found in database')
    return {
      success: false,
      reason: 'NO_MATCH',
      threshold,
      message: 'No registered face found. Please enroll your face first.'
    }
  }

  const bestMatch = allResults[0]
  console.log('[identifyFace] Best match score:', bestMatch.score, 'threshold:', threshold)

  // Check if best match is below threshold
  if (bestMatch.score < threshold) {
    // Get employee name for better error message
    const { data: emp } = await supabase
      .from('employees')
      .select('employee_id, full_name')
      .eq('id', bestMatch.employee_id)
      .single()

    const scorePercent = (bestMatch.score * 100).toFixed(1)
    const thresholdPercent = (threshold * 100).toFixed(1)
    const gap = ((threshold - bestMatch.score) * 100).toFixed(1)

    console.log('[identifyFace] Below threshold:', {
      score: bestMatch.score,
      threshold,
      gap: threshold - bestMatch.score,
      nearestEmployee: emp?.employee_id
    })

    return {
      success: false,
      reason: 'BELOW_THRESHOLD',
      threshold,
      bestScore: bestMatch.score,
      bestMatch: emp ? {
        employeeId: emp.employee_id,
        fullName: emp.full_name
      } : undefined,
      message: `Face match score (${scorePercent}%) is below threshold (${thresholdPercent}%). Gap: ${gap}%. Try better lighting or re-enroll your face.`
    }
  }

  // Get employee details
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, email, department, is_active')
    .eq('id', bestMatch.employee_id)
    .single()

  if (empError || !employee) {
    console.error('[identifyFace] Employee fetch error:', empError)
    return {
      success: false,
      reason: 'ERROR',
      threshold,
      bestScore: bestMatch.score,
      message: 'Failed to fetch employee data'
    }
  }

  // Check if employee is active
  if (!employee.is_active) {
    return {
      success: false,
      reason: 'EMPLOYEE_INACTIVE',
      threshold,
      bestScore: bestMatch.score,
      bestMatch: {
        employeeId: employee.employee_id,
        fullName: employee.full_name
      },
      message: `Employee ${employee.employee_id} is inactive. Please contact administrator.`
    }
  }

  console.log('[identifyFace] Success:', employee.employee_id, employee.full_name, 'score:', bestMatch.score)

  return {
    success: true,
    employee: {
      id: employee.id,
      employeeId: employee.employee_id,
      fullName: employee.full_name,
      email: employee.email,
      department: employee.department,
    },
    score: bestMatch.score,
    threshold,
  }
}

/**
 * Identify employee by face embedding (legacy - returns null on failure)
 * @deprecated Use identifyFaceWithDetails for better error handling
 */
export async function identifyFace(embedding: number[]): Promise<{
  employee: {
    id: string
    employeeId: string
    fullName: string
    email: string | null
    department: string | null
  }
  score: number
} | null> {
  const result = await identifyFaceWithDetails(embedding)
  
  if (result.success) {
    return {
      employee: result.employee,
      score: result.score
    }
  }
  
  return null
}

/**
 * Check if device is registered and active
 */
export async function checkDeviceActive(deviceId: string): Promise<{
  id: string
  deviceId: string
  isActive: boolean
} | null> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('devices')
    .select('id, device_id, is_active')
    .eq('device_id', deviceId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    deviceId: data.device_id,
    isActive: data.is_active,
  }
}
