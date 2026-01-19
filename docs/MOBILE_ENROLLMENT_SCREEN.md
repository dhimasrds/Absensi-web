# Mobile - Face Enrollment Screen

## Overview

Screen ini digunakan untuk mendaftarkan wajah karyawan baru agar bisa login menggunakan face recognition.

> ⚠️ **PENTING**: Enrollment HARUS dilakukan dari mobile app karena menggunakan MobileFaceNet model yang sama dengan face login.

---

## UI Design

```
┌─────────────────────────────────────┐
│  ←  DAFTAR WAJAH                    │
├─────────────────────────────────────┤
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │   📷 Camera   │           │
│         │    Preview    │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│  Kode Karyawan:                     │
│  ┌─────────────────────────────┐    │
│  │ EMP001                      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      📷 CAPTURE WAJAH       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      ✓ DAFTARKAN           │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## API Endpoint

**URL:** `POST /api/mobile/face/enroll`

**Base URL:** `https://absensi-web-rouge.vercel.app`

---

## Request Body

```json
{
  "employeeCode": "EMP001",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [-0.001, 0.016, 0.008, ...]
  },
  "facePhotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "deviceId": "ANDROID-XXXXX",
  "liveness": {
    "provided": true,
    "score": 0.95
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeCode` | string | ✅ | Kode karyawan dari admin (EMP001, EMP002, dll) |
| `payload.type` | string | ✅ | Harus `"EMBEDDING_V1"` |
| `payload.embedding` | float[] | ✅ | 128-dimensional embedding dari MobileFaceNet |
| `facePhotoBase64` | string | ✅ | Foto wajah dalam format base64 dengan prefix `data:image/jpeg;base64,` |
| `deviceId` | string | ✅ | Unique device ID |
| `liveness.provided` | boolean | ❌ | Apakah liveness check dilakukan |
| `liveness.score` | float | ❌ | Skor liveness (0.0 - 1.0) |

---

## Response

### Success (200)

```json
{
  "data": {
    "message": "Face enrolled successfully",
    "employee": {
      "id": "257c448b-0fa8-4519-9bf2-c94289629cdb",
      "employeeCode": "EMP001",
      "fullName": "Dhimas Saputra"
    },
    "templateVersion": 2,
    "enrolledAt": "2026-01-19T10:30:00.000Z",
    "hasPhoto": true
  }
}
```

### Error - Employee Not Found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Employee not found"
  }
}
```

### Error - Validation (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [...]
  }
}
```

---

## Kotlin Implementation

### 1. Data Classes

```kotlin
// Request
data class FaceEnrollRequest(
    @SerializedName("employeeCode")
    val employeeCode: String,
    
    @SerializedName("payload")
    val payload: EmbeddingPayload,
    
    @SerializedName("facePhotoBase64")
    val facePhotoBase64: String,
    
    @SerializedName("deviceId")
    val deviceId: String,
    
    @SerializedName("liveness")
    val liveness: LivenessData? = null
)

data class EmbeddingPayload(
    @SerializedName("type")
    val type: String = "EMBEDDING_V1",
    
    @SerializedName("embedding")
    val embedding: FloatArray
)

data class LivenessData(
    @SerializedName("provided")
    val provided: Boolean,
    
    @SerializedName("score")
    val score: Float
)

// Response
data class FaceEnrollResponse(
    @SerializedName("data")
    val data: EnrollData?
)

data class EnrollData(
    @SerializedName("message")
    val message: String,
    
    @SerializedName("employee")
    val employee: EmployeeInfo,
    
    @SerializedName("templateVersion")
    val templateVersion: Int,
    
    @SerializedName("enrolledAt")
    val enrolledAt: String,
    
    @SerializedName("hasPhoto")
    val hasPhoto: Boolean
)

data class EmployeeInfo(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("employeeCode")
    val employeeCode: String,
    
    @SerializedName("fullName")
    val fullName: String
)
```

### 2. API Interface (Retrofit)

```kotlin
interface AbsensiApi {
    @POST("api/mobile/face/enroll")
    suspend fun enrollFace(
        @Body request: FaceEnrollRequest
    ): Response<FaceEnrollResponse>
}
```

### 3. Repository

```kotlin
class FaceEnrollRepository(
    private val api: AbsensiApi,
    private val deviceIdProvider: DeviceIdProvider
) {
    suspend fun enrollFace(
        employeeCode: String,
        embedding: FloatArray,
        faceBitmap: Bitmap,
        livenessScore: Float? = null
    ): Result<EnrollData> {
        return try {
            // Convert bitmap to base64
            val base64Photo = bitmapToBase64(faceBitmap)
            
            val request = FaceEnrollRequest(
                employeeCode = employeeCode,
                payload = EmbeddingPayload(embedding = embedding),
                facePhotoBase64 = base64Photo,
                deviceId = deviceIdProvider.getDeviceId(),
                liveness = livenessScore?.let {
                    LivenessData(provided = true, score = it)
                }
            )
            
            val response = api.enrollFace(request)
            
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                Result.failure(Exception("Enrollment failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
        val bytes = outputStream.toByteArray()
        return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
```

### 4. ViewModel

```kotlin
class FaceEnrollViewModel(
    private val repository: FaceEnrollRepository,
    private val faceDetector: MobileFaceNetDetector
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(FaceEnrollUiState())
    val uiState: StateFlow<FaceEnrollUiState> = _uiState.asStateFlow()
    
    private var capturedBitmap: Bitmap? = null
    private var capturedEmbedding: FloatArray? = null
    
    fun onEmployeeCodeChanged(code: String) {
        _uiState.update { it.copy(employeeCode = code) }
    }
    
    fun onCaptureClicked(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessing = true, error = null) }
            
            try {
                // Generate embedding using MobileFaceNet
                val embedding = faceDetector.getEmbedding(bitmap)
                
                if (embedding != null) {
                    capturedBitmap = bitmap
                    capturedEmbedding = embedding
                    _uiState.update { 
                        it.copy(
                            isProcessing = false,
                            isCaptured = true,
                            capturedPreview = bitmap
                        )
                    }
                } else {
                    _uiState.update { 
                        it.copy(
                            isProcessing = false,
                            error = "Wajah tidak terdeteksi. Coba lagi."
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isProcessing = false,
                        error = "Gagal memproses wajah: ${e.message}"
                    )
                }
            }
        }
    }
    
    fun onEnrollClicked() {
        val code = _uiState.value.employeeCode
        val bitmap = capturedBitmap
        val embedding = capturedEmbedding
        
        if (code.isBlank()) {
            _uiState.update { it.copy(error = "Masukkan kode karyawan") }
            return
        }
        
        if (bitmap == null || embedding == null) {
            _uiState.update { it.copy(error = "Capture wajah terlebih dahulu") }
            return
        }
        
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            repository.enrollFace(
                employeeCode = code,
                embedding = embedding,
                faceBitmap = bitmap
            ).onSuccess { data ->
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        isSuccess = true,
                        successMessage = "Wajah ${data.employee.fullName} berhasil didaftarkan!"
                    )
                }
            }.onFailure { error ->
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "Gagal mendaftarkan wajah"
                    )
                }
            }
        }
    }
    
    fun onRetryCapture() {
        capturedBitmap = null
        capturedEmbedding = null
        _uiState.update { it.copy(isCaptured = false, capturedPreview = null) }
    }
}

data class FaceEnrollUiState(
    val employeeCode: String = "",
    val isProcessing: Boolean = false,
    val isCaptured: Boolean = false,
    val capturedPreview: Bitmap? = null,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val successMessage: String? = null,
    val error: String? = null
)
```

### 5. Composable UI

```kotlin
@Composable
fun FaceEnrollScreen(
    viewModel: FaceEnrollViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    
    // Camera controller
    val cameraController = remember { LifecycleCameraController(context) }
    
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            Toast.makeText(context, uiState.successMessage, Toast.LENGTH_LONG).show()
            delay(1500)
            onNavigateBack()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Daftar Wajah") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Camera Preview or Captured Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(16.dp))
            ) {
                if (uiState.isCaptured && uiState.capturedPreview != null) {
                    Image(
                        bitmap = uiState.capturedPreview!!.asImageBitmap(),
                        contentDescription = "Captured face",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    CameraPreview(
                        controller = cameraController,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                
                if (uiState.isProcessing) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color.White)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Employee Code Input
            OutlinedTextField(
                value = uiState.employeeCode,
                onValueChange = viewModel::onEmployeeCodeChanged,
                label = { Text("Kode Karyawan") },
                placeholder = { Text("Contoh: EMP001") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading,
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Error Message
            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            // Buttons
            if (!uiState.isCaptured) {
                Button(
                    onClick = {
                        // Capture from camera
                        cameraController.takePicture(
                            ContextCompat.getMainExecutor(context),
                            object : ImageCapture.OnImageCapturedCallback() {
                                override fun onCaptureSuccess(image: ImageProxy) {
                                    val bitmap = image.toBitmap()
                                    viewModel.onCaptureClicked(bitmap)
                                    image.close()
                                }
                            }
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !uiState.isProcessing
                ) {
                    Icon(Icons.Default.CameraAlt, null)
                    Spacer(Modifier.width(8.dp))
                    Text("CAPTURE WAJAH")
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = viewModel::onRetryCapture,
                        modifier = Modifier.weight(1f),
                        enabled = !uiState.isLoading
                    ) {
                        Text("ULANGI")
                    }
                    
                    Button(
                        onClick = viewModel::onEnrollClicked,
                        modifier = Modifier.weight(1f),
                        enabled = !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White
                            )
                        } else {
                            Text("DAFTARKAN")
                        }
                    }
                }
            }
        }
    }
}
```

---

## Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User buka screen "Daftar Wajah"                             │
│                    │                                             │
│                    ▼                                             │
│  2. Input kode karyawan (dari admin): EMP001                    │
│                    │                                             │
│                    ▼                                             │
│  3. Klik "CAPTURE WAJAH"                                        │
│                    │                                             │
│                    ▼                                             │
│  4. App process:                                                │
│     ├─ Ambil foto dari camera                                   │
│     ├─ Detect face menggunakan MobileFaceNet                    │
│     └─ Generate 128-dim embedding                               │
│                    │                                             │
│                    ▼                                             │
│  5. Preview foto muncul, user bisa "ULANGI" atau "DAFTARKAN"   │
│                    │                                             │
│                    ▼                                             │
│  6. Klik "DAFTARKAN" → API call                                 │
│     POST /api/mobile/face/enroll                                │
│     {                                                           │
│       employeeCode: "EMP001",                                   │
│       payload: { embedding: [...] },                            │
│       facePhotoBase64: "data:image/jpeg;base64,..."            │
│     }                                                           │
│                    │                                             │
│                    ▼                                             │
│  7. Success → Toast "Wajah berhasil didaftarkan!"              │
│                    │                                             │
│                    ▼                                             │
│  8. Navigate back ke home                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Testing dengan cURL

```bash
curl -X POST 'https://absensi-web-rouge.vercel.app/api/mobile/face/enroll' \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeCode": "EMP001",
    "payload": {
      "type": "EMBEDDING_V1",
      "embedding": [-0.001, 0.016, 0.008, ... 128 values ...]
    },
    "facePhotoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "deviceId": "TEST-DEVICE-001"
  }'
```

---

## Error Handling

| Error Code | Message | Solution |
|------------|---------|----------|
| `NOT_FOUND` | Employee not found | Cek kode karyawan benar |
| `VALIDATION_ERROR` | Invalid request body | Cek format request |
| `FORBIDDEN` | Employee is not active | Hubungi admin |
| `LIVENESS_FAILED` | Liveness check failed | Gunakan wajah asli |

---

## Checklist Implementation

- [ ] UI Screen dengan camera preview
- [ ] Input field untuk employee code
- [ ] MobileFaceNet integration untuk generate embedding
- [ ] Convert bitmap ke base64
- [ ] API call ke `/api/mobile/face/enroll`
- [ ] Handle success/error response
- [ ] Loading state
- [ ] Retry capture functionality
