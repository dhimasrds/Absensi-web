'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, AlertCircle, Download, X } from 'lucide-react'

interface Employee {
  id: string
  employeeCode: string
  fullName: string
}

interface FacePhotoPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
}

interface FacePhotoData {
  photoUrl: string
  mimeType: string
  uploadedAt: string
}

export function FacePhotoPreviewDialog({
  open,
  onOpenChange,
  employee,
}: FacePhotoPreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [photoData, setPhotoData] = useState<FacePhotoData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (open && employee) {
      loadFacePhoto()
    } else {
      // Reset state when dialog closes
      setPhotoData(null)
      setError(null)
      setImageLoaded(false)
    }
  }, [open, employee])

  const loadFacePhoto = async () => {
    if (!employee) return

    setLoading(true)
    setError(null)
    setImageLoaded(false)

    try {
      const response = await fetch(`/api/employees/${employee.id}/face/photo`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load face photo')
      }

      setPhotoData(data.data)
    } catch (err) {
      console.error('Error loading face photo:', err)
      setError(err instanceof Error ? err.message : 'Failed to load face photo')
      toast.error('Gagal memuat foto wajah')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!photoData?.photoUrl || !employee) return

    const link = document.createElement('a')
    link.href = photoData.photoUrl
    link.download = `${employee.employeeCode}-face-photo.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Download dimulai')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Face Photo Preview</DialogTitle>
          <DialogDescription>
            {employee && (
              <>
                Foto wajah untuk <strong>{employee.fullName}</strong> ({employee.employeeCode})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading face photo...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <div className="text-center">
                <p className="font-medium text-red-700">Gagal Memuat Foto</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
              <Button onClick={loadFacePhoto} variant="outline">
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Photo Display */}
          {!loading && !error && photoData && (
            <div className="space-y-4">
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
                <img
                  src={photoData.photoUrl}
                  alt="Face photo"
                  className="w-full h-auto max-h-[60vh] object-contain"
                  crossOrigin="anonymous"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setError('Failed to load image')
                    toast.error('Gagal memuat gambar')
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  <span className="font-medium">Uploaded:</span>{' '}
                  {new Date(photoData.uploadedAt).toLocaleString('id-ID')}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {photoData.mimeType}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Tutup
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
