/**
 * MobileFaceNet Web Implementation
 * 
 * This module provides MobileFaceNet face embedding extraction for web browsers.
 * Uses ONNX Runtime Web to run the same model as the mobile app.
 * 
 * Model specs:
 * - Input: 112x112 RGB image, normalized to [-1, 1]
 * - Output: 128-dimensional L2-normalized embedding
 * 
 * IMPORTANT: The model file must be placed at /public/models/mobilefacenet.onnx
 * You can get this from converting the mobile TFLite model or using a compatible ONNX model.
 */

import * as ort from 'onnxruntime-web'

// Model configuration - must match mobile exactly
const MODEL_INPUT_SIZE = 112
const EMBEDDING_DIMENSIONS = 128

// Model URL - will try multiple sources
const MODEL_URLS = [
  '/models/mobilefacenet.onnx',  // Local file
  'https://raw.githubusercontent.com/nickmuchi/mobilefacenet-onnx/main/mobilefacenet.onnx', // GitHub
]

let session: ort.InferenceSession | null = null
let isLoading = false
let modelLoadError: string | null = null

/**
 * Initialize the MobileFaceNet model
 */
export async function initMobileFaceNet(): Promise<void> {
  if (session) return
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (modelLoadError) throw new Error(modelLoadError)
    return
  }

  isLoading = true
  modelLoadError = null
  
  try {
    // Configure ONNX Runtime for browser
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/'
    
    // Try each model URL
    let lastError: Error | null = null
    for (const modelUrl of MODEL_URLS) {
      try {
        console.log(`🔄 Trying to load MobileFaceNet from: ${modelUrl}`)
        session = await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
        console.log('✅ MobileFaceNet model loaded successfully from:', modelUrl)
        console.log('   Input:', session.inputNames)
        console.log('   Output:', session.outputNames)
        return
      } catch (error) {
        console.warn(`⚠️ Failed to load from ${modelUrl}:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }
    
    // All sources failed
    throw lastError || new Error('Failed to load MobileFaceNet model from any source')
  } catch (error) {
    modelLoadError = error instanceof Error ? error.message : 'Unknown error loading model'
    console.error('❌ Failed to load MobileFaceNet model:', error)
    throw new Error(`Failed to initialize face recognition model: ${modelLoadError}`)
  } finally {
    isLoading = false
  }
}

/**
 * Check if model is loaded
 */
export function isModelLoaded(): boolean {
  return session !== null
}

/**
 * Preprocess image for MobileFaceNet
 * 
 * Steps (must match mobile exactly):
 * 1. Crop face region (with some margin)
 * 2. Resize to 112x112
 * 3. Convert to RGB float32
 * 4. Normalize pixel values to [-1, 1] using (pixel - 127.5) / 127.5
 * 5. Convert to NCHW format (batch, channels, height, width)
 */
export function preprocessImage(
  imageData: ImageData,
  faceBox?: { x: number; y: number; width: number; height: number }
): Float32Array {
  const canvas = document.createElement('canvas')
  canvas.width = MODEL_INPUT_SIZE
  canvas.height = MODEL_INPUT_SIZE
  const ctx = canvas.getContext('2d')!
  
  // Create temp canvas with original image
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)
  
  // If face box provided, crop to face region with margin
  if (faceBox) {
    const margin = 0.3 // 30% margin around face
    const marginX = faceBox.width * margin
    const marginY = faceBox.height * margin
    
    const sx = Math.max(0, faceBox.x - marginX)
    const sy = Math.max(0, faceBox.y - marginY)
    const sw = Math.min(imageData.width - sx, faceBox.width + marginX * 2)
    const sh = Math.min(imageData.height - sy, faceBox.height + marginY * 2)
    
    // Draw cropped and resized image
    ctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
  } else {
    // Center crop to square and resize
    const size = Math.min(imageData.width, imageData.height)
    const sx = (imageData.width - size) / 2
    const sy = (imageData.height - size) / 2
    ctx.drawImage(tempCanvas, sx, sy, size, size, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
  }
  
  // Get processed image data
  const processedData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
  
  // Convert to NCHW Float32Array with normalization
  // Mobile uses: (pixel - 127.5) / 127.5 which gives range [-1, 1]
  const tensorData = new Float32Array(1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE)
  
  for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
    for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
      const srcIdx = (y * MODEL_INPUT_SIZE + x) * 4
      const r = processedData.data[srcIdx]
      const g = processedData.data[srcIdx + 1]
      const b = processedData.data[srcIdx + 2]
      
      // NCHW format: [batch, channel, height, width]
      // Normalize to [-1, 1]
      tensorData[0 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + y * MODEL_INPUT_SIZE + x] = (r - 127.5) / 127.5 // R
      tensorData[1 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + y * MODEL_INPUT_SIZE + x] = (g - 127.5) / 127.5 // G
      tensorData[2 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE + y * MODEL_INPUT_SIZE + x] = (b - 127.5) / 127.5 // B
    }
  }
  
  return tensorData
}

/**
 * Preprocess image from HTMLImageElement
 */
export function preprocessImageElement(
  img: HTMLImageElement,
  faceBox?: { x: number; y: number; width: number; height: number }
): Float32Array {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return preprocessImage(imageData, faceBox)
}

/**
 * L2 normalize embedding
 */
function l2Normalize(embedding: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i]
  }
  norm = Math.sqrt(norm)
  
  const normalized = new Float32Array(embedding.length)
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm
  }
  return normalized
}

/**
 * Extract face embedding using MobileFaceNet
 * 
 * @param img - HTMLImageElement containing the face image
 * @param faceBox - Optional face bounding box from face detection
 * @returns 128-dimensional L2-normalized embedding
 */
export async function extractEmbedding(
  img: HTMLImageElement,
  faceBox?: { x: number; y: number; width: number; height: number }
): Promise<number[]> {
  if (!session) {
    throw new Error('MobileFaceNet model not initialized. Call initMobileFaceNet() first.')
  }
  
  // Preprocess image
  const inputTensor = preprocessImageElement(img, faceBox)
  
  // Create ONNX tensor
  const tensor = new ort.Tensor('float32', inputTensor, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
  
  // Run inference
  const feeds: Record<string, ort.Tensor> = {}
  feeds[session.inputNames[0]] = tensor
  
  const results = await session.run(feeds)
  
  // Get output embedding
  const outputName = session.outputNames[0]
  const output = results[outputName]
  const embedding = output.data as Float32Array
  
  // Validate dimensions
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    console.warn(`Unexpected embedding dimensions: ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`)
  }
  
  // L2 normalize (should already be normalized, but ensure consistency)
  const normalized = l2Normalize(embedding)
  
  return Array.from(normalized)
}

/**
 * Extract embedding from ImageData directly
 */
export async function extractEmbeddingFromImageData(
  imageData: ImageData,
  faceBox?: { x: number; y: number; width: number; height: number }
): Promise<number[]> {
  if (!session) {
    throw new Error('MobileFaceNet model not initialized. Call initMobileFaceNet() first.')
  }
  
  // Preprocess image
  const inputTensor = preprocessImage(imageData, faceBox)
  
  // Create ONNX tensor
  const tensor = new ort.Tensor('float32', inputTensor, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
  
  // Run inference
  const feeds: Record<string, ort.Tensor> = {}
  feeds[session.inputNames[0]] = tensor
  
  const results = await session.run(feeds)
  
  // Get output embedding
  const outputName = session.outputNames[0]
  const output = results[outputName]
  const embedding = output.data as Float32Array
  
  // L2 normalize
  const normalized = l2Normalize(embedding)
  
  return Array.from(normalized)
}

/**
 * Cleanup resources
 */
export async function dispose(): Promise<void> {
  if (session) {
    await session.release()
    session = null
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions')
  }
  
  let dotProduct = 0
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
  }
  
  // For L2-normalized vectors, dot product equals cosine similarity
  return dotProduct
}
