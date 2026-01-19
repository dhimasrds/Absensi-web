# Face Embedding Alignment - Mobile ↔ Backend

## Ringkasan

Dokumen ini menjelaskan alignment antara proses face embedding di **mobile app** dan **backend** untuk memastikan face recognition berfungsi dengan akurat.

## Comparison Table

| Aspek | Mobile (Android) | Backend (Next.js) | Status |
|-------|------------------|-------------------|--------|
| **Model** | MobileFaceNet (TFLite) | - (menerima embedding dari mobile) | ✅ OK |
| **Input Image Size** | 112x112 pixels | - | ✅ OK |
| **Channel Order** | RGB | - | ✅ OK |
| **Pixel Normalization** | `(pixel - 127.5) / 127.5` → [-1, 1] | - | ✅ OK |
| **Raw Output Dimensions** | 192 | - | ✅ OK |
| **Final Embedding Dimensions** | 128 (truncated) | vector(128) | ✅ Aligned |
| **L2 Normalization** | ✅ Applied | ✅ Validated & Normalized jika perlu | ✅ Aligned |
| **Similarity Metric** | Cosine similarity | Cosine distance via pgvector `<=>` | ✅ Aligned |
| **Threshold** | - | 0.60 (configurable via settings) | ✅ OK |

## Improvement yang Sudah Diimplementasi

### 1. Embedding Validation & Preprocessing (`/src/lib/face/embedding.ts`)

Utility functions untuk:
- ✅ **L2 Normalization check** - memastikan embedding sudah normalized (magnitude ≈ 1.0)
- ✅ **Auto-normalization** - jika embedding belum normalized, backend akan normalize
- ✅ **Validation** - cek NaN, Infinity, dimensi
- ✅ **Logging** - detail stats untuk debugging

```typescript
// Fungsi yang tersedia:
calculateL2Norm(embedding)     // Hitung magnitude
normalizeEmbedding(embedding)  // Normalize ke unit vector
isL2Normalized(embedding)      // Cek apakah sudah normalized
validateEmbedding(embedding)   // Validasi lengkap dengan stats
preprocessEmbedding(embedding) // Validate & normalize
cosineSimilarity(e1, e2)       // Hitung similarity
logEmbeddingInfo(embedding)    // Debug logging
```

### 2. Face Enrollment Route Updated (`/src/app/api/employees/[id]/face/enroll/route.ts`)

- ✅ Validate embedding saat enroll
- ✅ Auto-normalize jika perlu
- ✅ Logging untuk debugging
- ✅ Reject invalid embeddings

### 3. Face Identify Updated (`/src/lib/face/identify.ts`)

- ✅ Validate query embedding
- ✅ Auto-normalize jika perlu
- ✅ Better logging

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MOBILE APP                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Capture Face Image                                               │
│ 2. Detect & Crop Face (112x112)                                     │
│ 3. Normalize Pixels: (pixel - 127.5) / 127.5                        │
│ 4. Run MobileFaceNet → 192 dimensions                               │
│ 5. Truncate to 128 dimensions                                       │
│ 6. L2 Normalize (magnitude = 1.0)                                   │
│ 7. Send to Backend API                                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND API                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Receive embedding array (128 float)                              │
│ 2. Validate:                                                        │
│    - Check 128 dimensions                                           │
│    - Check no NaN/Infinity                                          │
│    - Check L2 norm ≈ 1.0                                            │
│ 3. If not normalized → Auto-normalize                               │
│ 4. Convert to pgvector format: [x1,x2,...,x128]                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE (PostgreSQL + pgvector)             │
├─────────────────────────────────────────────────────────────────────┤
│ ENROLLMENT:                                                         │
│   INSERT INTO face_templates (embedding) VALUES ('[x1,x2,...]')     │
│                                                                     │
│ IDENTIFICATION:                                                     │
│   SELECT (1 - (embedding <=> query_embedding)) AS score             │
│   WHERE score >= threshold                                          │
│   ORDER BY score DESC                                               │
│                                                                     │
│   Note: <=> is cosine distance operator                             │
│         score = 1 - cosine_distance = cosine_similarity             │
└─────────────────────────────────────────────────────────────────────┘
```

## Similarity Score Interpretation

| Score | Interpretation |
|-------|----------------|
| 0.90+ | Sangat yakin sama (very confident match) |
| 0.70-0.90 | Kemungkinan besar sama (likely match) |
| 0.60-0.70 | Mungkin sama (possible match, current threshold) |
| < 0.60 | Kemungkinan besar beda (likely different person) |

## Troubleshooting

### Face Not Recognized

1. **Cek embedding stats di log:**
   ```
   [Embedding] Stats:
     Dimensions: 128
     L2 Norm: 0.999998
     Normalized: ✅
   ```

2. **Jika norm jauh dari 1.0:**
   - Mobile side mungkin tidak melakukan L2 normalization
   - Backend akan auto-normalize, tapi sebaiknya fix di mobile

3. **Jika dimensi bukan 128:**
   - Mobile mungkin mengirim raw output (192 dimensions)
   - Perlu truncate di mobile sebelum kirim

### Threshold Tuning

Jika terlalu banyak false reject:
1. Cek log untuk melihat actual score
2. Turunkan threshold di Settings → Face Match Threshold
3. Atau update env var `FACE_MATCH_THRESHOLD`

Jika terlalu banyak false accept:
1. Naikkan threshold
2. Pastikan quality score saat enroll > 0.80

## Files Modified

| File | Perubahan |
|------|-----------|
| `/src/lib/face/embedding.ts` | **NEW** - Utility functions for embedding processing |
| `/src/lib/face/identify.ts` | Added validation & preprocessing |
| `/src/app/api/employees/[id]/face/enroll/route.ts` | Added validation & preprocessing |

## References

- [FACE_EMBEDDING_MECHANISM.md](./FACE_EMBEDDING_MECHANISM.md) - Detail implementasi mobile
- [MobileFaceNet Paper](https://arxiv.org/abs/1804.07573) - Model architecture
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity extension
