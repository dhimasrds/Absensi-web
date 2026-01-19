import { NextRequest, NextResponse } from 'next/server'
import { getSettingsByCategory } from '@/lib/settings'
import { errors, successResponse } from '@/lib/api/response'

/**
 * GET /api/settings
 * Get all settings or filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    const settings = await getSettingsByCategory(category)

    return NextResponse.json(successResponse(settings))
  } catch (error) {
    console.error('[Settings API] GET error:', error)
    return errors.internalError()
  }
}
