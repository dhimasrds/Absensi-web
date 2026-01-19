import { NextRequest } from 'next/server'
import { errorResponse } from '@/lib/api/response'

/**
 * POST /api/face/extract-embedding
 * 
 * Extract face embedding from an image using server-side processing.
 * This ensures the same model/preprocessing is used as mobile app.
 * 
 * For now, this is a placeholder that will be implemented when
 * server-side face recognition model is available.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64 } = body
    
    if (!imageBase64) {
      return errorResponse('VALIDATION_ERROR', 'Image is required', { status: 400 })
    }
    
    // TODO: Implement server-side embedding extraction
    // Options:
    // 1. Use Python microservice with InsightFace/MobileFaceNet
    // 2. Use TensorFlow Serving
    // 3. Use ONNX Runtime in Node.js
    
    // For now, return error indicating feature not implemented
    return errorResponse(
      'NOT_IMPLEMENTED',
      'Server-side embedding extraction not yet implemented. Please use client-side extraction.',
      { status: 501 }
    )
  } catch (error) {
    console.error('Extract embedding error:', error)
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to extract embedding',
      { status: 500 }
    )
  }
}
