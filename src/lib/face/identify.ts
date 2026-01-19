import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { FaceIdentifyResult } from '@/lib/types/database'
import { getSettingNumber } from '@/lib/settings'
import { preprocessEmbedding, validateEmbedding, logEmbeddingInfo } from '@/lib/face/embedding'

/**
 * Identify employee by face embedding
 * Returns the best matching employee if score >= threshold
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
  const supabase = createAdminSupabaseClient()

  // Get threshold from settings (with fallback to env var)
  const envThreshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.60')
  const threshold = await getSettingNumber('face_match_threshold', envThreshold)

  // Validate and preprocess embedding
  logEmbeddingInfo(embedding, 'Identify - Query')
  
  const validation = validateEmbedding(embedding)
  if (!validation.valid) {
    console.error('[identifyFace] Invalid embedding:', validation.errors)
    throw new Error(`Invalid embedding: ${validation.errors.join(', ')}`)
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

  // Call RPC function to identify face
  const { data, error } = await supabase.rpc('face_identify_v1', {
    query_embedding: embeddingVector,
    match_threshold: threshold,
    match_count: 1,
  })

  if (error) {
    console.error('[identifyFace] RPC error:', error)
    throw new Error('Face identification failed')
  }

  console.log('[identifyFace] RPC results count:', data?.length || 0)

  const results = data as FaceIdentifyResult[]

  if (!results || results.length === 0) {
    console.log('[identifyFace] No matches found')
    return null
  }

  const match = results[0]

  console.log('[identifyFace] Best match:', {
    employeeId: match.employee_id,
    score: match.score
  })

  // Get employee details
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, email, department')
    .eq('id', match.employee_id)
    .eq('is_active', true)
    .single()

  if (empError || !employee) {
    console.error('[identifyFace] Employee fetch error:', empError)
    return null
  }

  console.log('[identifyFace] Success:', employee.employee_id, employee.full_name)

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employee_id,
      fullName: employee.full_name,
      email: employee.email,
      department: employee.department,
    },
    score: match.score,
  }
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
