import { NextRequest, NextResponse } from 'next/server'
import { updateSetting } from '@/lib/settings'
import { errors, successResponse } from '@/lib/api/response'
import { z } from 'zod'

const updateSettingSchema = z.object({
  value: z.string().min(1, 'Value is required'),
})

/**
 * PUT /api/settings/:key
 * Update a setting value
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const body = await request.json()

    // Validate input
    const result = updateSettingSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const { value } = result.data

    // Validate specific settings
    if (key === 'face_match_threshold' || key === 'face_liveness_threshold') {
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue < 0 || numValue > 1) {
        return NextResponse.json(
          { error: { code: 'INVALID_VALUE', message: 'Threshold must be between 0.0 and 1.0' } },
          { status: 400 }
        )
      }
    }

    if (key === 'capture_max_skew_seconds') {
      const numValue = parseInt(value, 10)
      if (isNaN(numValue) || numValue < 0) {
        return NextResponse.json(
          { error: { code: 'INVALID_VALUE', message: 'Capture max skew must be a positive number' } },
          { status: 400 }
        )
      }
    }

    // Update setting
    const success = await updateSetting(key, value)

    if (!success) {
      return errors.internalError('Failed to update setting')
    }

    return NextResponse.json(
      successResponse({
        key,
        value,
        updated: true,
      })
    )
  } catch (error) {
    console.error('[Settings API] PUT error:', error)
    return errors.internalError()
  }
}
