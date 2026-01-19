# Face Embedding Mechanism - Mobile Side

## Overview

Dokumen ini menjelaskan mekanisme bagaimana aplikasi Android menghasilkan face embedding value untuk proses face recognition (login dan attendance).

---

## 1. Model yang Digunakan

### TFLite Model
- **File**: `mobilefacenet.tflite`
- **Lokasi**: `app/src/main/assets/mobilefacenet.tflite`
- **Source**: [MCarlomagno/FaceRecognitionAuth](https://github.com/MCarlomagno/FaceRecognitionAuth/blob/master/assets/mobilefacenet.tflite)
- **Architecture**: MobileFaceNet
- **Input Size**: 112 x 112 pixels (RGB)
- **Output Size**: 192 dimensions (di-truncate ke 128 untuk server)

---

## 2. Pipeline Embedding Extraction

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EMBEDDING EXTRACTION PIPELINE                      │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Camera     │───▶│    Face      │───▶│    Face      │───▶│   TFLite     │
│   Capture    │    │  Detection   │    │   Cropping   │    │  Inference   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Send to    │◀───│   Create     │◀───│  Normalize   │◀───│   Truncate   │
│   Server     │    │  JSON Payload│    │  Embedding   │    │   to 128     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## 3. Langkah-langkah Detail

### Step 1: Camera Capture

```kotlin
// File: CameraPreview.kt

// Capture frame dari kamera depan (front camera)
// PENTING: Gambar TIDAK di-mirror untuk embedding extraction
val bitmap = imageProxy.toBitmapSafe(mirrorForPreview = false)

// Konversi YUV ke RGB Bitmap
// Rotate sesuai orientasi device
// TIDAK mirror karena foto enrollment biasanya tidak di-mirror
```

**Konfigurasi Camera:**
- Kamera: Front Camera (LENS_FACING_FRONT)
- Aspect Ratio: 4:3
- Format: YUV_420_888
- Output: RGB Bitmap (non-mirrored)

### Step 2: Face Detection (untuk Cropping)

```kotlin
// File: FaceEmbeddingExtractor.kt

// Menggunakan ML Kit Face Detection
val detectorOptions = FaceDetectorOptions.Builder()
    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
    .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
    .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
    .setMinFaceSize(0.1f)
    .build()

faceDetector = FaceDetection.getClient(detectorOptions)
```

### Step 3: Face Cropping

```kotlin
// File: FaceEmbeddingExtractor.kt

private fun detectAndCropFace(bitmap: Bitmap): Bitmap {
    // 1. Detect face bounding box
    val bounds = face.boundingBox
    
    // 2. Add 20% margin around face
    val margin = (max(bounds.width(), bounds.height()) * 0.2f).toInt()
    
    // 3. Calculate crop region
    val left = max(0, bounds.left - margin)
    val top = max(0, bounds.top - margin)
    val right = min(bitmap.width, bounds.right + margin)
    val bottom = min(bitmap.height, bounds.bottom + margin)
    
    // 4. Make it SQUARE (model expects square input)
    val size = max(width, height)
    val centerX = left + width / 2
    val centerY = top + height / 2
    
    // 5. Crop to square region
    return Bitmap.createBitmap(bitmap, squareLeft, squareTop, finalWidth, finalHeight)
}
```

**Output**: Square bitmap containing only the face region with margin

### Step 4: Preprocessing untuk Model

```kotlin
// File: FaceEmbeddingExtractor.kt

// 1. Resize ke 112x112
val resizedBitmap = Bitmap.createScaledBitmap(croppedFace, 112, 112, true)

// 2. Convert ke ByteBuffer dengan normalisasi
private fun convertBitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
    val byteBuffer = ByteBuffer.allocateDirect(4 * 112 * 112 * 3) // float32 x width x height x RGB
    byteBuffer.order(ByteOrder.nativeOrder())

    val pixels = IntArray(112 * 112)
    bitmap.getPixels(pixels, 0, 112, 0, 0, 112, 112)

    for (pixel in pixels) {
        val r = ((pixel shr 16) and 0xFF)
        val g = ((pixel shr 8) and 0xFF)
        val b = (pixel and 0xFF)

        // Normalisasi ke range [-1, 1]
        // Formula: (pixel_value - 127.5) / 127.5
        byteBuffer.putFloat((r - 127.5f) / 127.5f)
        byteBuffer.putFloat((g - 127.5f) / 127.5f)
        byteBuffer.putFloat((b - 127.5f) / 127.5f)
    }

    byteBuffer.rewind()
    return byteBuffer
}
```

**Preprocessing Parameters:**
| Parameter | Value |
|-----------|-------|
| Input Size | 112 x 112 |
| Color Space | RGB |
| Pixel Order | RGB (bukan BGR) |
| Normalization Mean | 127.5 |
| Normalization Std | 127.5 |
| Output Range | [-1, 1] |
| Data Type | Float32 |

### Step 5: TFLite Model Inference

```kotlin
// File: FaceEmbeddingExtractor.kt

// Run model inference
val outputArray = Array(1) { FloatArray(modelOutputSize) } // modelOutputSize = 192
interpreter.run(inputBuffer, outputArray)

val rawEmbedding = outputArray[0] // 192 float values
```

### Step 6: Truncate ke 128 Dimensions

```kotlin
// File: FaceEmbeddingExtractor.kt

// Server expects 128 dimensions, model outputs 192
val embedding = if (rawEmbedding.size > 128) {
    rawEmbedding.take(128).toFloatArray()
} else {
    rawEmbedding
}
```

**Catatan**: Model MobileFaceNet menghasilkan 192 dimensions, tetapi server mengharapkan 128 dimensions. Kita mengambil **128 dimensions pertama**.

### Step 7: L2 Normalization

```kotlin
// File: FaceEmbeddingExtractor.kt

private fun normalizeEmbedding(embedding: FloatArray): FloatArray {
    // Calculate L2 norm
    var sum = 0f
    for (value in embedding) {
        sum += value * value
    }
    val norm = sqrt(sum)

    // Normalize each value
    return if (norm > 0) {
        FloatArray(embedding.size) { embedding[it] / norm }
    } else {
        embedding
    }
}
```

**Formula L2 Normalization:**
```
normalized[i] = embedding[i] / sqrt(sum(embedding[j]^2 for all j))
```

Setelah normalisasi, magnitude (panjang) vector embedding = 1.0

---

## 4. Format Output Embedding

### Struktur Data

```kotlin
// File: FaceEmbedding.kt

data class FaceEmbedding(
    val embedding: List<Float>,  // 128 float values
    val type: String = "EMBEDDING_V1"
)
```

### Contoh Nilai Embedding

```json
{
  "embedding": [
    -0.08360308,
    0.064392656,
    0.07679907,
    -0.072767094,
    -0.021418776,
    // ... total 128 values
    0.04456323
  ]
}
```

**Karakteristik Nilai:**
- Range: Biasanya antara -0.5 hingga +0.5
- Total: 128 float values
- Normalized: Magnitude = 1.0 (L2 normalized)
- Precision: Float32

---

## 5. API Request Format

### Face Login Request

```kotlin
// File: ApiModels.kt

@JsonClass(generateAdapter = true)
data class FaceLoginRequest(
    @Json(name = "deviceId") val deviceId: String,
    @Json(name = "clientCaptureId") val clientCaptureId: String,
    @Json(name = "capturedAt") val capturedAt: String,
    @Json(name = "payload") val payload: EmbeddingPayload,
    @Json(name = "liveness") val liveness: LivenessInfo,
    @Json(name = "app") val app: AppInfo,
    @Json(name = "model") val model: String,
    @Json(name = "os") val os: String
)

@JsonClass(generateAdapter = true)
data class EmbeddingPayload(
    @Json(name = "type") val type: String = "EMBEDDING_V1",
    @Json(name = "embedding") val embedding: List<Float>  // 128 floats
)
```

### Contoh JSON Request

```json
{
  "deviceId": "ANDROID-854CFC3E",
  "clientCaptureId": "capture-1737312000000",
  "capturedAt": "2026-01-19T12:00:00.000Z",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [
      -0.08360308,
      0.064392656,
      0.07679907,
      -0.072767094,
      -0.021418776,
      -0.046787757,
      -0.020900449,
      -0.1038727,
      0.18073186,
      -0.10040494,
      // ... 118 more values ...
      0.09275516,
      0.04456323
    ]
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "app": {
    "version": "1.0.0",
    "platform": "android"
  },
  "model": "Samsung Galaxy S21",
  "os": "Android 13"
}
```

---

## 6. Similarity Calculation (Reference)

Backend biasanya menggunakan **Cosine Similarity** untuk membandingkan embedding:

```
cosine_similarity = dot(A, B) / (norm(A) * norm(B))
```

Karena embedding sudah L2 normalized (norm = 1), maka:

```
cosine_similarity = dot(A, B)
```

**Threshold yang umum digunakan:**
- Match: similarity >= 0.7 (70%)
- Strong Match: similarity >= 0.85 (85%)

---

## 7. Penting untuk Alignment dengan Backend

### Checklist untuk Backend Team:

| No | Item | Mobile Implementation |
|----|------|----------------------|
| 1 | Model | MobileFaceNet (dari FaceRecognitionAuth repo) |
| 2 | Input Size | 112 x 112 pixels |
| 3 | Color Space | RGB (bukan BGR) |
| 4 | Pixel Order | R, G, B per pixel |
| 5 | Normalization | (pixel - 127.5) / 127.5 → range [-1, 1] |
| 6 | Output Size | 128 dimensions (truncated from 192) |
| 7 | Post-processing | L2 Normalization |
| 8 | Data Type | Float32 |
| 9 | Embedding Type | "EMBEDDING_V1" |
| 10 | Mirroring | TIDAK di-mirror |

### Enrollment vs Login Consistency:

Untuk hasil similarity yang baik, pastikan:

1. **Model yang sama** digunakan untuk enrollment dan login
2. **Preprocessing yang sama** (normalization, color space)
3. **Face cropping** yang konsisten (dengan margin)
4. **Tidak ada mirroring** pada kedua proses
5. **L2 normalization** diterapkan pada kedua embedding

---

## 8. File-file Terkait

```
app/src/main/java/com/absensi/
├── face/
│   ├── FaceEmbeddingExtractor.kt    # Main embedding extraction
│   ├── FaceDetectionManager.kt       # Face detection for validation
│   └── model/
│       └── FaceEmbedding.kt          # Embedding data class
├── ui/
│   └── components/
│       └── CameraPreview.kt          # Camera capture & bitmap conversion
└── data/
    └── remote/
        └── dto/
            └── ApiModels.kt          # API request/response models

app/src/main/assets/
└── mobilefacenet.tflite              # TFLite model file
```

---

## 9. Troubleshooting

### Similarity Rendah

1. **Cek mirroring**: Pastikan bitmap tidak di-mirror saat extraction
2. **Cek preprocessing**: Pastikan normalization formula sama
3. **Cek face cropping**: Pastikan wajah di-crop dengan benar
4. **Cek lighting**: Pencahayaan yang berbeda bisa mempengaruhi
5. **Cek pose**: Posisi wajah harus relatif frontal

### NaN atau Infinity di Response

- Mobile sudah handle dengan `NaNInterceptor` yang mengkonversi NaN ke null
- Jika matchScore null, berarti embedding tidak cocok atau ada masalah perhitungan

---

## 10. Contoh Kode Lengkap Extraction

```kotlin
// Cara menggunakan FaceEmbeddingExtractor

class LoginScreen {
    private val faceEmbeddingExtractor = FaceEmbeddingExtractor(context)
    
    fun onCaptureAndLogin(bitmap: Bitmap) {
        try {
            // Extract embedding dari bitmap
            val faceEmbedding = faceEmbeddingExtractor.extractEmbedding(bitmap)
            
            // Log untuk debugging
            Log.d("Embedding", "Size: ${faceEmbedding.embedding.size}")
            Log.d("Embedding", "First 5 values: ${faceEmbedding.embedding.take(5)}")
            
            // Kirim ke server
            val request = FaceLoginRequest(
                deviceId = deviceId,
                clientCaptureId = "capture-${System.currentTimeMillis()}",
                capturedAt = getCurrentIsoTimestamp(),
                payload = EmbeddingPayload(
                    type = faceEmbedding.type,
                    embedding = faceEmbedding.embedding
                ),
                liveness = LivenessInfo(provided = true, score = 0.95f),
                app = AppInfo(version = "1.0.0", platform = "android"),
                model = Build.MODEL,
                os = "Android ${Build.VERSION.RELEASE}"
            )
            
            // Call API
            apiService.faceLogin(request)
            
        } catch (e: Exception) {
            Log.e("Embedding", "Failed: ${e.message}")
        }
    }
}
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-19 | 1.0 | Initial documentation |

