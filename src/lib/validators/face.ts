import { z } from 'zod'

// ====================================================
// Face Template Validators
// ====================================================

export const enrollFaceSchema = z.object({
  templateVersion: z.number().int().min(1).default(1),
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z.array(z.number()).length(128, 'Embedding must have exactly 128 dimensions'),
  }),
  qualityScore: z.number().min(0).max(1).optional(),
})

export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>
