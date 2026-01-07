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
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Smartphone, TabletSmartphone } from 'lucide-react'

interface Device {
  id: string
  deviceUniqueId: string
  deviceName: string
  deviceModel: string | null
  osVersion: string | null
  appVersion: string | null
  active: boolean
  lastSeenAt: string | null
  createdAt: string
}

interface DevicesResponse {
  data: Device[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

function DevicesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    deviceUniqueId: '',
    deviceName: '',
    deviceModel: '',
    osVersion: '',
    appVersion: '',
    active: true,
  })

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '10')
      
      const res = await fetch(`/api/devices?${params}`)
      const data: DevicesResponse = await res.json()
      
      if (data.data) {
        setDevices(data.data)
        setTotal(data.meta.pagination.total)
        setTotalPages(data.meta.pagination.totalPages)
      }
    } catch {
      toast.error('Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    router.push(`/devices?search=${value}&page=1`)
  }

  const handleCreate = async () => {
    setFormLoading(true)
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to register device')
      }
      
      toast.success('Device registered successfully')
      setIsCreateOpen(false)
      setFormData({ deviceUniqueId: '', deviceName: '', deviceModel: '', osVersion: '', appVersion: '', active: true })
      fetchDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register device')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedDevice) return
    setFormLoading(true)
    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update device')
      }
      
      toast.success('Device updated successfully')
      setIsEditOpen(false)
      setSelectedDevice(null)
      fetchDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update device')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDevice) return
    setFormLoading(true)
    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to delete device')
      }
      
      toast.success('Device deleted successfully')
      setIsDeleteOpen(false)
      setSelectedDevice(null)
      fetchDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete device')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditDialog = (device: Device) => {
    setSelectedDevice(device)
    setFormData({
      deviceUniqueId: device.deviceUniqueId,
      deviceName: device.deviceName,
      deviceModel: device.deviceModel || '',
      osVersion: device.osVersion || '',
      appVersion: device.appVersion || '',
      active: device.active,
    })
    setIsEditOpen(true)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500">Manage registered attendance devices</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TabletSmartphone className="h-5 w-5" />
                Register New Device
              </DialogTitle>
              <DialogDescription>
                Enter the device details to register a new attendance device.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceUniqueId">Device Unique ID *</Label>
                <Input
                  id="deviceUniqueId"
                  placeholder="ANDROID-ABC123"
                  value={formData.deviceUniqueId}
                  onChange={(e) => setFormData({ ...formData, deviceUniqueId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name *</Label>
                <Input
                  id="deviceName"
                  placeholder="Office Tablet 1"
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceModel">Device Model</Label>
                  <Input
                    id="deviceModel"
                    placeholder="Samsung Galaxy Tab A8"
                    value={formData.deviceModel}
                    onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="osVersion">OS Version</Label>
                  <Input
                    id="osVersion"
                    placeholder="Android 13"
                    value={formData.osVersion}
                    onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appVersion">App Version</Label>
                <Input
                  id="appVersion"
                  placeholder="1.0.0"
                  value={formData.appVersion}
                  onChange={(e) => setFormData({ ...formData, appVersion: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={formLoading}>
                {formLoading ? 'Registering...' : 'Register Device'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device List
              </CardTitle>
              <CardDescription>{total} devices registered</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search devices..."
                className="pl-9"
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
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Smartphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No devices found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Model / OS</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.deviceName}</p>
                          <p className="text-sm text-gray-500 font-mono">{device.deviceUniqueId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{device.deviceModel || '-'}</p>
                          <p className="text-sm text-gray-500">{device.osVersion || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDate(device.lastSeenAt)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.active ? 'default' : 'secondary'}>
                          {device.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(device)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDevice(device)
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-deviceUniqueId">Device Unique ID *</Label>
              <Input
                id="edit-deviceUniqueId"
                value={formData.deviceUniqueId}
                onChange={(e) => setFormData({ ...formData, deviceUniqueId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deviceName">Device Name *</Label>
              <Input
                id="edit-deviceName"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-deviceModel">Device Model</Label>
                <Input
                  id="edit-deviceModel"
                  value={formData.deviceModel}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-osVersion">OS Version</Label>
                <Input
                  id="edit-osVersion"
                  value={formData.osVersion}
                  onChange={(e) => setFormData({ ...formData, osVersion: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-appVersion">App Version</Label>
              <Input
                id="edit-appVersion"
                value={formData.appVersion}
                onChange={(e) => setFormData({ ...formData, appVersion: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-active">Device is active</Label>
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

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedDevice?.deviceName}</strong>? 
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
    </div>
  )
}

export default function DevicesPage() {
  return (
    <Suspense fallback={<DevicesPageSkeleton />}>
      <DevicesPageContent />
    </Suspense>
  )
}

function DevicesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
