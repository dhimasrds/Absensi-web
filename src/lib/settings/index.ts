import { createAdminSupabaseClient } from '@/lib/supabase/admin'

interface AppSetting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  updated_at: string
}

// Cache settings in memory for 5 minutes
const settingsCache = new Map<string, { value: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a setting value by key
 * Uses in-memory cache to reduce database queries
 */
export async function getSetting(key: string, defaultValue?: string): Promise<string> {
  // Check cache first
  const cached = settingsCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value
  }

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    console.warn(`[Settings] Key "${key}" not found, using default:`, defaultValue)
    return defaultValue || ''
  }

  // Update cache
  settingsCache.set(key, { value: data.value, timestamp: Date.now() })

  return data.value
}

/**
 * Get setting as number
 */
export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key, String(defaultValue))
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Get setting as boolean
 */
export async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue))
  return value === 'true' || value === '1'
}

// Default settings to insert if table is empty
const DEFAULT_SETTINGS: Omit<AppSetting, 'id' | 'updated_at'>[] = [
  {
    key: 'face_match_threshold',
    value: '0.60',
    description: 'Minimum similarity score for face recognition (0.0 - 1.0). Lower = easier to login, Higher = more secure.',
    category: 'face_recognition',
  },
  {
    key: 'face_liveness_threshold',
    value: '0.80',
    description: 'Minimum liveness detection score (0.0 - 1.0). Detects if face is real or photo/video.',
    category: 'face_recognition',
  },
  {
    key: 'capture_max_skew_seconds',
    value: '300',
    description: 'Maximum age of capture timestamp in seconds before it is considered invalid.',
    category: 'face_recognition',
  },
  {
    key: 'geofence_enabled',
    value: 'true',
    description: 'Enable GPS geofencing for attendance validation.',
    category: 'attendance',
  },
  {
    key: 'work_location_radius_meters',
    value: '100',
    description: 'Default radius for work location geofencing in meters.',
    category: 'attendance',
  },
]

/**
 * Initialize default settings if they don't exist
 */
export async function initializeSettings(): Promise<void> {
  const supabase = createAdminSupabaseClient()

  for (const setting of DEFAULT_SETTINGS) {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
        },
        { onConflict: 'key', ignoreDuplicates: true }
      )

    if (error) {
      console.error(`[Settings] Error initializing ${setting.key}:`, error)
    }
  }

  console.log('[Settings] Default settings initialized')
}

/**
 * Get all settings by category
 */
export async function getSettingsByCategory(category?: string): Promise<AppSetting[]> {
  const supabase = createAdminSupabaseClient()

  let query = supabase
    .from('app_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Settings] Error fetching settings:', error)
    // If table doesn't exist, try to initialize
    if (error.code === '42P01') {
      console.log('[Settings] Table does not exist, needs migration')
    }
    return []
  }

  // If no settings found, initialize defaults
  if (!data || data.length === 0) {
    console.log('[Settings] No settings found, initializing defaults...')
    await initializeSettings()
    // Retry fetch
    const { data: retryData } = await query
    return retryData || []
  }

  return data || []
}

/**
 * Update a setting value
 */
export async function updateSetting(
  key: string,
  value: string,
  updatedBy?: string
): Promise<boolean> {
  const supabase = createAdminSupabaseClient()

  const updateData: any = { value }
  if (updatedBy) {
    updateData.updated_by = updatedBy
  }

  const { error } = await supabase
    .from('app_settings')
    .update(updateData)
    .eq('key', key)

  if (error) {
    console.error('[Settings] Error updating setting:', error)
    return false
  }

  // Clear cache
  settingsCache.delete(key)

  console.log(`[Settings] Updated "${key}" to "${value}"`)
  return true
}

/**
 * Clear settings cache
 */
export function clearSettingsCache(): void {
  settingsCache.clear()
  console.log('[Settings] Cache cleared')
}

/**
 * Get face recognition settings (commonly used together)
 */
export async function getFaceRecognitionSettings() {
  const [threshold, livenessThreshold, captureMaxSkew] = await Promise.all([
    getSettingNumber('face_match_threshold', 0.6),
    getSettingNumber('face_liveness_threshold', 0.8),
    getSettingNumber('capture_max_skew_seconds', 300),
  ])

  return {
    faceMatchThreshold: threshold,
    livenessThreshold,
    captureMaxSkewSeconds: captureMaxSkew,
  }
}
