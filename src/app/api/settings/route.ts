import { NextRequest, NextResponse } from 'next/server'
import { getSettingsByCategory, initializeSettings } from '@/lib/settings'
import { successResponse } from '@/lib/api/response'

/**
 * GET /api/settings
 * Get all settings or filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    console.log('[Settings API] Fetching settings, category:', category)
    
    let settings = await getSettingsByCategory(category)
    
    console.log('[Settings API] Found settings:', settings.length)

    // If no settings, try to initialize
    if (settings.length === 0) {
      console.log('[Settings API] No settings found, initializing...')
      try {
        await initializeSettings()
        settings = await getSettingsByCategory(category)
        console.log('[Settings API] After init, found:', settings.length)
      } catch (initError) {
        console.error('[Settings API] Init error:', initError)
      }
    }

    return NextResponse.json(successResponse(settings))
  } catch (error) {
    console.error('[Settings API] GET error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: errorMessage } },
      { status: 500 }
    )
  }
}
