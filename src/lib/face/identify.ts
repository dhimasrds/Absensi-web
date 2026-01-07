import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { FaceIdentifyResult } from '@/lib/types/database'

const FACE_MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.80')

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

  // Convert embedding array to vector format
  const embeddingVector = `[${embedding.join(',')}]`

  // Call RPC function to identify face
  const { data, error } = await supabase.rpc('face_identify_v1', {
    query_embedding: embeddingVector,
    match_threshold: FACE_MATCH_THRESHOLD,
    match_count: 1,
  })

  if (error) {
    console.error('Face identify error:', error)
    throw new Error('Face identification failed')
  }

  const results = data as FaceIdentifyResult[]

  if (!results || results.length === 0) {
    return null
  }

  const match = results[0]

  // Get employee details
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, full_name, email, department')
    .eq('id', match.employee_id)
    .eq('is_active', true)
    .single()

  if (empError || !employee) {
    return null
  }

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
