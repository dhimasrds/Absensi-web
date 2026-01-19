# Face Recognition Model Alignment Solution

## Problem Statement

The web admin portal uses **face-api.js** (ResNet-based) for face embedding extraction during enrollment, while the mobile app uses **MobileFaceNet**. These two models produce **incompatible embeddings**, causing face login from mobile to always fail even when comparing the same person's face.

### Evidence

When comparing embeddings from the same person:
- **Cosine Similarity**: -0.06 (should be > 0.7 for same person)
- **Euclidean Distance**: 1.46 (should be < 0.8 for same person)

This confirms the models are fundamentally incompatible.

## Solution

### Recommended Approach: Mobile-Side Enrollment

The best solution is to perform face enrollment from the **mobile app** using the same MobileFaceNet model that will be used for login. This ensures:

1. ✅ Same model for enrollment and login
2. ✅ Same preprocessing pipeline
3. ✅ Consistent embedding format
4. ✅ No model conversion needed

### Implementation

#### 1. Mobile Enrollment API

A new API endpoint has been created for mobile enrollment:

```
POST /api/mobile/face/enroll
```

Request body:
```json
{
  "deviceId": "ANDROID-XXXX",
  "employeeCode": "EMP001",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [/* 128 float values */]
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "facePhotoBase64": "data:image/jpeg;base64,..." // optional
}
```

Response:
```json
{
  "data": {
    "message": "Face enrolled successfully",
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP001",
      "fullName": "John Doe"
    },
    "templateVersion": 2,
    "enrolledAt": "2026-01-19T12:00:00Z"
  }
}
```

#### 2. Template Versioning

Face templates are versioned to track the embedding source:

| Version | Model | Notes |
|---------|-------|-------|
| 1 | face-api.js (web) | Legacy, incompatible with mobile |
| 2 | MobileFaceNet (mobile) | Recommended for mobile login |

#### 3. Enrollment Workflow

**Option A: Mobile-First (Recommended)**
1. Admin creates employee in web portal (without face enrollment)
2. Employee opens mobile app and enters their employee code
3. Mobile app captures face and extracts embedding using MobileFaceNet
4. Mobile app calls `/api/mobile/face/enroll` with embedding
5. Employee can now login using face recognition

**Option B: Web + Mobile Re-enrollment**
1. Admin enrolls face in web portal (creates version 1 template)
2. Employee uses mobile app first time
3. Mobile app detects template version mismatch
4. Mobile app prompts user to re-enroll face
5. New embedding (version 2) replaces the old one

### Mobile App Implementation Guide

```kotlin
// Android/Kotlin example
suspend fun enrollFace(employeeCode: String, embedding: FloatArray, photoBase64: String?) {
    val body = mapOf(
        "deviceId" to getDeviceId(),
        "employeeCode" to employeeCode,
        "payload" to mapOf(
            "type" to "EMBEDDING_V1",
            "embedding" to embedding.toList()
        ),
        "liveness" to mapOf(
            "provided" to true,
            "score" to livenessScore
        ),
        "facePhotoBase64" to photoBase64
    )
    
    api.post("/api/mobile/face/enroll", body)
}
```

```swift
// iOS/Swift example
func enrollFace(employeeCode: String, embedding: [Float], photoBase64: String?) async throws {
    let body: [String: Any] = [
        "deviceId": getDeviceId(),
        "employeeCode": employeeCode,
        "payload": [
            "type": "EMBEDDING_V1",
            "embedding": embedding
        ],
        "liveness": [
            "provided": true,
            "score": livenessScore
        ],
        "facePhotoBase64": photoBase64 as Any
    ]
    
    try await api.post("/api/mobile/face/enroll", body: body)
}
```

## Alternative: Web MobileFaceNet Integration

For future consideration, the web portal could also use MobileFaceNet via ONNX Runtime Web:

1. Convert MobileFaceNet TFLite model to ONNX format
2. Host the ONNX model file (~3-5MB)
3. Use `onnxruntime-web` to run inference in browser

This approach is prepared in `/src/lib/face/mobilefacenet.ts` but requires the ONNX model file.

## Testing

To verify alignment is working:

1. Enroll face from mobile app using employee code
2. Attempt face login from mobile app
3. Check that similarity score is > 0.6 (configurable threshold)

## Settings

The face match threshold can be adjusted via the Settings page:
- Path: `/settings`
- Setting: `face_match_threshold`
- Default: 0.60
- Range: 0.30 - 0.90

Lower threshold = easier to login (more false positives)
Higher threshold = harder to login (more false negatives)
