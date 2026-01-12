'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, MapPin, Navigation, Map } from 'lucide-react'
import { MapPicker } from '@/components/ui/map-picker'

interface WorkLocation {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface LocationsResponse {
  data: WorkLocation[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
    }
  }
}

function LocationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [mounted, setMounted] = useState(false)
  const [locations, setLocations] = useState<WorkLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<WorkLocation | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: '500',
    isActive: true,
  })

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      params.set('page', String(page))
      params.set('limit', '10')
      
      const res = await fetch(`/api/work-locations?${params}`)
      const data: LocationsResponse = await res.json()
      
      if (data.data) {
        setLocations(data.data)
        setTotal(data.meta?.pagination?.total || 0)
      }
    } catch {
      toast.error('Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    router.push(`/locations?q=${value}&page=1`)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radiusMeters: '500',
      isActive: true,
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Please fill in required fields')
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch('/api/work-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || null,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radiusMeters: parseInt(formData.radiusMeters) || 500,
          isActive: formData.isActive,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to create location')
      }
      
      toast.success('Location created successfully')
      setIsCreateOpen(false)
      resetForm()
      fetchLocations()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create location')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedLocation) return
    
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Please fill in required fields')
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch(`/api/work-locations/${selectedLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || null,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radiusMeters: parseInt(formData.radiusMeters) || 500,
          isActive: formData.isActive,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update location')
      }
      
      toast.success('Location updated successfully')
      setIsEditOpen(false)
      setSelectedLocation(null)
      resetForm()
      fetchLocations()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedLocation) return
    setFormLoading(true)
    try {
      const res = await fetch(`/api/work-locations/${selectedLocation.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to delete location')
      }
      
      toast.success('Location deleted successfully')
      setIsDeleteOpen(false)
      setSelectedLocation(null)
      fetchLocations()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditDialog = (location: WorkLocation) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      address: location.address || '',
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      radiusMeters: String(location.radius_meters),
      isActive: location.is_active,
    })
    setIsEditOpen(true)
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: String(position.coords.latitude),
            longitude: String(position.coords.longitude),
          }))
          toast.success('Location detected')
        },
        (error) => {
          toast.error('Failed to get current location: ' + error.message)
        }
      )
    } else {
      toast.error('Geolocation is not supported by your browser')
    }
  }

  const handleMapSelect = (location: { latitude: number; longitude: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      address: location.address,
    }))
    toast.success('Location selected from map')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Locations</h1>
          <p className="text-gray-500">Manage work locations for attendance geofencing</p>
        </div>
        {mounted ? (
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Add New Location
              </DialogTitle>
              <DialogDescription>
                Create a new work location for attendance tracking.
              </DialogDescription>
            </DialogHeader>
            {/* Form Fields - Inline to prevent focus loss */}
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Location Name *</Label>
                <Input
                  id="create-name"
                  placeholder="Head Office"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-address">Address</Label>
                <Input
                  id="create-address"
                  placeholder="123 Main Street, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-latitude">Latitude *</Label>
                  <Input
                    id="create-latitude"
                    type="number"
                    step="any"
                    placeholder="-6.2088"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-longitude">Longitude *</Label>
                  <Input
                    id="create-longitude"
                    type="number"
                    step="any"
                    placeholder="106.8456"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsMapPickerOpen(true)}>
                  <Map className="mr-2 h-4 w-4" />
                  Pick from Map
                </Button>
                <Button type="button" variant="outline" onClick={getCurrentLocation}>
                  <Navigation className="mr-2 h-4 w-4" />
                  Current Location
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-radiusMeters">Radius (meters) *</Label>
                <Input
                  id="create-radiusMeters"
                  type="number"
                  placeholder="500"
                  value={formData.radiusMeters}
                  onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Employees must be within this distance to clock in
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="create-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Locations</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {locations.filter(l => l.is_active).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-3xl text-gray-400">
              {locations.filter(l => !l.is_active).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search locations..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No locations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new work location.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell className="text-gray-500">
                      {location.address || '-'}
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </TableCell>
                    <TableCell>{location.radius_meters}m</TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? 'default' : 'secondary'}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(location)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLocation(location)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 10 >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {mounted && (
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setSelectedLocation(null)
            resetForm()
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Edit Location
            </DialogTitle>
            <DialogDescription>
              Update the work location details.
            </DialogDescription>
          </DialogHeader>
          {/* Form Fields - Inline to prevent focus loss */}
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Location Name *</Label>
              <Input
                id="edit-name"
                placeholder="Head Office"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="123 Main Street, City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-latitude">Latitude *</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  placeholder="-6.2088"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-longitude">Longitude *</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  placeholder="106.8456"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMapPickerOpen(true)}>
                <Map className="mr-2 h-4 w-4" />
                Pick from Map
              </Button>
              <Button type="button" variant="outline" onClick={getCurrentLocation}>
                <Navigation className="mr-2 h-4 w-4" />
                Current Location
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-radiusMeters">Radius (meters) *</Label>
              <Input
                id="edit-radiusMeters"
                type="number"
                placeholder="500"
                value={formData.radiusMeters}
                onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Employees must be within this distance to clock in
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Delete Dialog */}
      {mounted && (
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Location</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedLocation?.name}&quot;? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
                {formLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Map Picker Dialog */}
      {mounted && (
        <MapPicker
          open={isMapPickerOpen}
          onOpenChange={setIsMapPickerOpen}
          onSelect={handleMapSelect}
          initialLat={formData.latitude ? parseFloat(formData.latitude) : -6.2088}
          initialLng={formData.longitude ? parseFloat(formData.longitude) : 106.8456}
        />
      )}
    </div>
  )
}

export default function LocationsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    }>
      <LocationsPageContent />
    </Suspense>
  )
}
