'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MapPin, Search, Navigation, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface MapPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (location: {
    latitude: number
    longitude: number
    address: string
  }) => void
  initialLat?: number
  initialLng?: number
}

export function MapPicker({
  open,
  onOpenChange,
  onSelect,
  initialLat = -6.2088,
  initialLng = 106.8456,
}: MapPickerProps) {
  const [latitude, setLatitude] = useState(initialLat)
  const [longitude, setLongitude] = useState(initialLng)
  const [address, setAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Update when props change
  useEffect(() => {
    if (open) {
      setLatitude(initialLat)
      setLongitude(initialLng)
    }
  }, [open, initialLat, initialLng])

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
          },
        }
      )
      const data = await response.json()
      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
    }
  }, [])

  // Search for location by name
  const searchLocation = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'id,en',
          },
        }
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        const newLat = parseFloat(result.lat)
        const newLng = parseFloat(result.lon)
        setLatitude(newLat)
        setLongitude(newLng)
        setAddress(result.display_name)
        toast.success('Location found!')
      } else {
        toast.error('Location not found. Try a different search term.')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search location')
    } finally {
      setLoading(false)
    }
  }

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLat = position.coords.latitude
          const newLng = position.coords.longitude
          setLatitude(newLat)
          setLongitude(newLng)
          await reverseGeocode(newLat, newLng)
          setLoading(false)
          toast.success('Current location detected!')
        },
        (error) => {
          setLoading(false)
          toast.error('Failed to get current location: ' + error.message)
        },
        { enableHighAccuracy: true }
      )
    } else {
      toast.error('Geolocation is not supported by your browser')
    }
  }

  // Handle coordinate change
  const handleCoordinateChange = async (type: 'lat' | 'lng', value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return

    if (type === 'lat') {
      setLatitude(num)
    } else {
      setLongitude(num)
    }
  }

  // Fetch address when coordinates change
  useEffect(() => {
    if (open && latitude && longitude) {
      const timer = setTimeout(() => {
        reverseGeocode(latitude, longitude)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [latitude, longitude, open, reverseGeocode])

  // Handle select
  const handleSelect = () => {
    onSelect({
      latitude,
      longitude,
      address,
    })
    onOpenChange(false)
  }

  // Generate Google Maps embed URL
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${latitude},${longitude}&zoom=16`
  
  // OpenStreetMap as fallback (no API key needed)
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pick Location from Map
          </DialogTitle>
          <DialogDescription>
            Search for a location or enter coordinates manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search location (e.g., Monas Jakarta)"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchLocation()
                  }
                }}
              />
            </div>
            <Button onClick={searchLocation} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Current Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full"
          >
            <Navigation className="mr-2 h-4 w-4" />
            Use My Current Location
          </Button>

          {/* Map Preview */}
          <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-gray-100">
            <iframe
              src={osmUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location Map"
            />
          </div>

          {/* Open in Google Maps link */}
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Google Maps (click to set precise location)
          </a>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="map-latitude">Latitude</Label>
              <Input
                id="map-latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => handleCoordinateChange('lat', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="map-longitude">Longitude</Label>
              <Input
                id="map-longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => handleCoordinateChange('lng', e.target.value)}
              />
            </div>
          </div>

          {/* Address Preview */}
          {address && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-xs text-gray-500">Detected Address</Label>
              <p className="text-sm mt-1">{address}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect}>
            <MapPin className="mr-2 h-4 w-4" />
            Use This Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
