'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  User,
  RefreshCw,
  X
} from 'lucide-react'

// Dynamic import for face-api to avoid SSR issues
let faceapi: typeof import('@vladmandic/face-api') | null = null

interface Employee {
  id: string
  employeeCode: string
  fullName: string
}

interface FaceEnrollmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  onSuccess?: () => void
}

type EnrollmentStep = 'upload' | 'detecting' | 'preview' | 'enrolling' | 'success' | 'error'

export function FaceEnrollmentDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: FaceEnrollmentDialogProps) {
  const [step, setStep] = useState<EnrollmentStep>('upload')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [embedding, setEmbedding] = useState<number[] | null>(null)
  const [detectionResult, setDetectionResult] = useState<{
    confidence: number
    landmarks: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [enrolledPhotoUrl, setEnrolledPhotoUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load face-api models
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return
    
    setLoadingModels(true)
    try {
      // Dynamic import of face-api
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api')
      }
      
      // Load from jsDelivr CDN to avoid storing large model files in repo
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      
      setModelsLoaded(true)
      console.log('Face-api models loaded successfully')
    } catch (err) {
      console.error('Failed to load face-api models:', err)
      setError('Gagal memuat model face detection. Silakan refresh halaman.')
    } finally {
      setLoadingModels(false)
    }
  }, [modelsLoaded, loadingModels])

  // Load models when dialog opens
  useEffect(() => {
    if (open && !modelsLoaded) {
      loadModels()
    }
  }, [open, modelsLoaded, loadModels])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('upload')
      setImageUrl(null)
      setEmbedding(null)
      setDetectionResult(null)
      setError(null)
      setEnrolledPhotoUrl(null)
    }
  }, [open])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    // Convert file to base64 data URL for sending to backend
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImageUrl(dataUrl) // Store as base64 data URL
      setStep('detecting')
      setError(null)

      // Detect face after image loads
      setTimeout(() => {
        detectFace(dataUrl)
      }, 100)
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
      setError('Failed to read image file')
    }
    reader.readAsDataURL(file) // Read as data URL instead of blob URL
  }

  const detectFace = async (url: string) => {
    if (!modelsLoaded || !faceapi) {
      setError('Models not loaded yet. Please wait.')
      setStep('error')
      return
    }

    try {
      // Create image element
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })

      // Detect face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('Tidak ada wajah terdeteksi. Pastikan foto menampilkan wajah dengan jelas.')
        setStep('error')
        return
      }

      // Get embedding (128-dimensional descriptor)
      const descriptor = Array.from(detection.descriptor)
      setEmbedding(descriptor)
      
      // Get detection confidence
      const confidence = detection.detection.score
      const landmarks = detection.landmarks.positions.length

      setDetectionResult({
        confidence: Math.round(confidence * 100),
        landmarks,
      })

      // Draw detection on canvas
      if (canvasRef.current && imageRef.current && faceapi) {
        const displaySize = { 
          width: imageRef.current.width, 
          height: imageRef.current.height 
        }
        faceapi.matchDimensions(canvasRef.current, displaySize)
        
        const resizedDetection = faceapi.resizeResults(detection, displaySize)
        
        canvasRef.current.getContext('2d')?.clearRect(
          0, 0, 
          canvasRef.current.width, 
          canvasRef.current.height
        )
        
        faceapi.draw.drawDetections(canvasRef.current, resizedDetection)
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetection)
      }

      setStep('preview')
    } catch (err) {
      console.error('Face detection error:', err)
      setError('Gagal mendeteksi wajah. Silakan coba dengan foto lain.')
      setStep('error')
    }
  }

  const handleEnroll = async () => {
    if (!employee || !embedding) return

    setStep('enrolling')

    try {
      const requestBody = {
        templateVersion: 1, // Version 1 = face-api.js embedding
        qualityScore: detectionResult?.confidence ? detectionResult.confidence / 100 : null,
        payload: {
          type: 'EMBEDDING_V1' as const,
          embedding: embedding,
        },
        facePhotoBase64: imageUrl, // Send base64 photo
      }
      
      console.log('Enrolling face with data:', {
        ...requestBody,
        facePhotoBase64: imageUrl ? `[${imageUrl.length} chars]` : null,
        payload: { ...requestBody.payload, embedding: `[${embedding.length} dimensions]` }
      })
      
      const response = await fetch(`/api/employees/${employee.id}/face/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const responseData = await response.json()
      console.log('Response:', response.status, responseData)
      console.log('Face photo URL from response:', responseData.data?.facePhotoUrl)

      if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.error?.details || 'Failed to enroll face')
      }

      // Store the enrolled face photo URL from response
      if (responseData.data?.facePhotoUrl) {
        console.log('✅ Setting enrolled photo URL:', responseData.data.facePhotoUrl)
        setEnrolledPhotoUrl(responseData.data.facePhotoUrl)
      } else {
        console.warn('⚠️ No facePhotoUrl in response. Full response:', responseData)
      }

      setStep('success')
      toast.success('Face enrolled successfully!')
      
      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false)
        onSuccess?.()
      }, 1500)
    } catch (err) {
      console.error('Enrollment error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan face template')
      setStep('error')
    }
  }

  const handleRetry = () => {
    setStep('upload')
    setImageUrl(null)
    setEmbedding(null)
    setDetectionResult(null)
    setError(null)
    setEnrolledPhotoUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Enroll Face
          </DialogTitle>
          <DialogDescription>
            {employee ? (
              <>Enroll face untuk <strong>{employee.fullName}</strong> ({employee.employeeCode})</>
            ) : (
              'Upload foto wajah karyawan untuk face recognition'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading Models */}
          {loadingModels && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading face detection models...</p>
            </div>
          )}

          {/* Upload Step */}
          {!loadingModels && step === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Klik untuk upload foto atau drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG up to 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900">Tips untuk hasil terbaik:</h4>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• Gunakan foto dengan pencahayaan yang baik</li>
                  <li>• Pastikan wajah terlihat jelas dan menghadap ke depan</li>
                  <li>• Hindari foto dengan kacamata hitam atau masker</li>
                  <li>• Gunakan background polos jika memungkinkan</li>
                </ul>
              </div>
            </div>
          )}

          {/* Detecting Step */}
          {step === 'detecting' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Mendeteksi wajah...</p>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && imageUrl && (
            <div className="space-y-4">
              <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onLoad={() => {
                    // Trigger canvas draw after image loads
                    if (embedding) {
                      // Re-detect to draw overlay
                    }
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {detectionResult && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Wajah Terdeteksi!</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Confidence:</span>
                      <span className="ml-2 font-medium text-green-700">
                        {detectionResult.confidence}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Landmarks:</span>
                      <span className="ml-2 font-medium">{detectionResult.landmarks} points</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Embedding: {embedding?.length} dimensions
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enrolling Step */}
          {step === 'enrolling' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Menyimpan face template...</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-green-700">Face Enrolled Successfully!</p>
                <p className="text-sm text-gray-500 mt-1">
                  {employee?.fullName} sekarang bisa login dengan face recognition
                </p>
              </div>
              
              {/* Preview enrolled face photo */}
              {enrolledPhotoUrl && (
                <div className="w-full space-y-2">
                  <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-gray-100 rounded-lg overflow-hidden border-2 border-green-200">
                    <img
                      src={enrolledPhotoUrl}
                      alt="Enrolled face"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    Foto profil berhasil disimpan
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-red-700">Gagal Mendeteksi Wajah</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Batal
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Ganti Foto
              </Button>
              <Button onClick={handleEnroll}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Enroll Face
              </Button>
            </>
          )}
          
          {step === 'error' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Button>
            </>
          )}
          
          {step === 'success' && (
            <Button onClick={() => onOpenChange(false)}>
              Selesai
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
