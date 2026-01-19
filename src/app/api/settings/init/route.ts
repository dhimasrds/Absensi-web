import { NextResponse } from 'next/server'
import { initializeSettings, getSettingsByCategory } from '@/lib/settings'
import { successResponse } from '@/lib/api/response'

/**
 * POST /api/settings/init
 * Initialize default settings if they don't exist
 */
export async function POST() {
  try {
    console.log('[Settings Init] Starting initialization...')
    await initializeSettings()
    
    const settings = await getSettingsByCategory()
    console.log('[Settings Init] Fetched settings count:', settings.length)
    
    // successResponse already returns NextResponse
    return successResponse({
      message: 'Settings initialized successfully',
      count: settings.length,
      settings,
    })
  } catch (error) {
    console.error('[Settings Init API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: { 
          code: 'INIT_ERROR', 
          message: `Failed to initialize settings: ${errorMessage}`,
          details: error instanceof Error ? error.stack : undefined
        } 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/settings/init
 * Check if settings are initialized
 */
export async function GET() {
  try {
    const settings = await getSettingsByCategory()
    
    // successResponse already returns NextResponse
    return successResponse({
      initialized: settings.length > 0,
      count: settings.length,
    })
  } catch (error) {
    console.error('[Settings Init API] GET Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: { 
          code: 'CHECK_ERROR', 
          message: `Failed to check settings: ${errorMessage}` 
        } 
      },
      { status: 500 }
    )
  }
}
