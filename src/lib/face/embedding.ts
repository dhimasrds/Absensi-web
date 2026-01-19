/**
 * Face Embedding Utilities
 * 
 * Utilities untuk memastikan alignment antara mobile dan backend
 * dalam pemrosesan face embedding.
 * 
 * Reference: FACE_EMBEDDING_MECHANISM.md
 */

// ====================================================
// Constants - harus sync dengan mobile
// ====================================================

export const EMBEDDING_DIMENSIONS = 128
export const EMBEDDING_TYPE = 'EMBEDDING_V1'

// Tolerance untuk L2 normalization check
// Karena floating point precision, norm bisa sedikit berbeda dari 1.0
const L2_NORM_TOLERANCE = 0.1

// ====================================================
// L2 Normalization
// ====================================================

/**
 * Calculate L2 norm (magnitude) of embedding vector
 * 
 * Formula: sqrt(sum(x[i]^2 for all i))
 */
export function calculateL2Norm(embedding: number[]): number {
  let sumSquares = 0
  for (const value of embedding) {
    sumSquares += value * value
  }
  return Math.sqrt(sumSquares)
}

/**
 * Normalize embedding to unit vector (L2 norm = 1)
 * 
 * Formula: normalized[i] = embedding[i] / L2_norm
 * 
 * Mobile side sudah melakukan ini, tapi untuk safety
 * backend juga bisa normalize ulang.
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = calculateL2Norm(embedding)
  
  if (norm === 0) {
    console.warn('[normalizeEmbedding] Zero norm detected, returning original')
    return embedding
  }
  
  return embedding.map(value => value / norm)
}

/**
 * Check if embedding is already L2 normalized
 * 
 * Normalized embedding should have magnitude ~= 1.0
 */
export function isL2Normalized(embedding: number[]): boolean {
  const norm = calculateL2Norm(embedding)
  return Math.abs(norm - 1.0) < L2_NORM_TOLERANCE
}

// ====================================================
// Validation
// ====================================================

export interface EmbeddingValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    dimensions: number
    l2Norm: number
    isNormalized: boolean
    minValue: number
    maxValue: number
    meanValue: number
  }
}

/**
 * Validate embedding format and quality
 */
export function validateEmbedding(embedding: number[]): EmbeddingValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check dimensions
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    errors.push(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`)
  }
  
  // Check for NaN or Infinity
  const hasInvalid = embedding.some(v => !Number.isFinite(v))
  if (hasInvalid) {
    errors.push('Embedding contains NaN or Infinity values')
  }
  
  // Calculate stats
  const l2Norm = calculateL2Norm(embedding)
  const isNormalized = Math.abs(l2Norm - 1.0) < L2_NORM_TOLERANCE
  const minValue = Math.min(...embedding)
  const maxValue = Math.max(...embedding)
  const meanValue = embedding.reduce((a, b) => a + b, 0) / embedding.length
  
  // Check normalization
  if (!isNormalized) {
    warnings.push(`Embedding not L2 normalized (norm=${l2Norm.toFixed(4)}, expected ~1.0)`)
  }
  
  // Check value range (normalized embeddings biasanya dalam range -0.5 to +0.5)
  if (Math.abs(minValue) > 1 || Math.abs(maxValue) > 1) {
    warnings.push(`Unusual value range: [${minValue.toFixed(4)}, ${maxValue.toFixed(4)}]`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      dimensions: embedding.length,
      l2Norm,
      isNormalized,
      minValue,
      maxValue,
      meanValue,
    }
  }
}

// ====================================================
// Similarity Calculation
// ====================================================

/**
 * Calculate cosine similarity between two embeddings
 * 
 * Formula: dot(A, B) / (norm(A) * norm(B))
 * 
 * Jika kedua embedding sudah L2 normalized (norm = 1),
 * maka: cosine_similarity = dot(A, B)
 * 
 * Return value: 0.0 (completely different) to 1.0 (identical)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions')
  }
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }
  
  norm1 = Math.sqrt(norm1)
  norm2 = Math.sqrt(norm2)
  
  if (norm1 === 0 || norm2 === 0) {
    return 0
  }
  
  return dotProduct / (norm1 * norm2)
}

/**
 * Calculate cosine distance (for comparison with pgvector <=> operator)
 * 
 * cosine_distance = 1 - cosine_similarity
 * 
 * Note: pgvector uses <=> for cosine distance
 * Backend converts: score = 1 - distance = cosine_similarity
 */
export function cosineDistance(embedding1: number[], embedding2: number[]): number {
  return 1 - cosineSimilarity(embedding1, embedding2)
}

// ====================================================
// Preprocessing
// ====================================================

/**
 * Preprocess embedding before storing/comparing
 * 
 * 1. Validate dimensions
 * 2. Ensure L2 normalized
 */
export function preprocessEmbedding(embedding: number[]): number[] {
  const validation = validateEmbedding(embedding)
  
  if (!validation.valid) {
    throw new Error(`Invalid embedding: ${validation.errors.join(', ')}`)
  }
  
  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn('[preprocessEmbedding] Warnings:', validation.warnings)
  }
  
  // Normalize if not already normalized
  if (!validation.stats.isNormalized) {
    console.log('[preprocessEmbedding] Normalizing embedding (original norm:', validation.stats.l2Norm.toFixed(4), ')')
    return normalizeEmbedding(embedding)
  }
  
  return embedding
}

// ====================================================
// Debug & Logging
// ====================================================

/**
 * Log embedding info for debugging
 */
export function logEmbeddingInfo(embedding: number[], label: string = 'Embedding'): void {
  const validation = validateEmbedding(embedding)
  
  console.log(`[${label}] Stats:`)
  console.log(`  Dimensions: ${validation.stats.dimensions}`)
  console.log(`  L2 Norm: ${validation.stats.l2Norm.toFixed(6)}`)
  console.log(`  Normalized: ${validation.stats.isNormalized ? '✅' : '❌'}`)
  console.log(`  Value Range: [${validation.stats.minValue.toFixed(4)}, ${validation.stats.maxValue.toFixed(4)}]`)
  console.log(`  Mean: ${validation.stats.meanValue.toFixed(6)}`)
  console.log(`  First 5: [${embedding.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`)
  
  if (validation.errors.length > 0) {
    console.error(`  ❌ Errors: ${validation.errors.join(', ')}`)
  }
  if (validation.warnings.length > 0) {
    console.warn(`  ⚠️ Warnings: ${validation.warnings.join(', ')}`)
  }
}
