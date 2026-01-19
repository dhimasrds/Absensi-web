import { NextResponse } from 'next/server'
import { initializeSettings, getSettingsByCategory } from '@/lib/settings'
import { successResponse, errors } from '@/lib/api/response'

/**
 * POST /api/settings/init
 * Initialize default settings if they don't exist
 */
export async function POST() {
  try {
    await initializeSettings()
    const settings = await getSettingsByCategory()
    
    return NextResponse.json(successResponse({
      message: 'Settings initialized successfully',
      count: settings.length,
      settings,
    }))
  } catch (error) {
    console.error('[Settings Init API] Error:', error)
    return errors.internalError()
  }
}

/**
 * GET /api/settings/init
 * Check if settings are initialized
 */
export async function GET() {
  try {
    const settings = await getSettingsByCategory()
    
    return NextResponse.json(successResponse({
      initialized: settings.length > 0,
      count: settings.length,
    }))
  } catch (error) {
    console.error('[Settings Init API] Error:', error)
    return errors.internalError()
  }
}
