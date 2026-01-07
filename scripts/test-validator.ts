import { enrollFaceSchema } from '../src/lib/validators/face'

const testData = {
  templateVersion: 'face-api-v1',
  qualityScore: 1.0,
  payload: {
    type: 'EMBEDDING_V1' as const,
    embedding: Array(128).fill(0.5), // 128 dimensions
  },
}

console.log('Testing with data:', JSON.stringify(testData, null, 2))
console.log('---')

try {
  const result = enrollFaceSchema.parse(testData)
  console.log('✅ Validation PASSED!')
  console.log('Result:', JSON.stringify(result, null, 2))
} catch (e: any) {
  console.log('❌ Validation FAILED!')
  console.log('Errors:', JSON.stringify(e.errors, null, 2))
  console.log('Full error:', e)
}
