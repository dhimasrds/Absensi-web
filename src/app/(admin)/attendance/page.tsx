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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ClipboardList, UserCheck, Clock, Image, Calendar, Filter } from 'lucide-react'

interface AttendanceRecord {
  id: string
  employeeId: string
  employee: {
    code: string
    name: string
    department: string | null
    jobTitle: string | null
  }
  device: {
    name: string
    model: string | null
  } | null
  attendanceType: 'CHECK_IN' | 'CHECK_OUT'
  attendanceSource: 'WEB_ADMIN' | 'ANDROID'
  capturedAt: string
  verificationMethod: string
  verificationStatus: string
  matchScore: number | null
  livenessScore: number | null
  note: string | null
  hasProof: boolean
  createdAt: string
}

interface AttendanceResponse {
  data: AttendanceRecord[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

function AttendancePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filters
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  
  // Proof dialog
  const [proofDialogOpen, setProofDialogOpen] = useState(false)
  const [proofLoading, setProofLoading] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofRecord, setProofRecord] = useState<AttendanceRecord | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString())
      if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').toISOString())
      if (typeFilter) params.set('type', typeFilter)
      params.set('page', String(page))
      params.set('limit', '15')
      
      const res = await fetch(`/api/attendance?${params}`)
      const data: AttendanceResponse = await res.json()
      
      if (data.data) {
        setRecords(data.data)
        setTotal(data.meta.pagination.total)
        setTotalPages(data.meta.pagination.totalPages)
      }
    } catch {
      toast.error('Failed to fetch attendance records')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, typeFilter, page])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleFilter = () => {
    setPage(1)
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (typeFilter) params.set('type', typeFilter)
    params.set('page', '1')
    router.push(`/attendance?${params}`)
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setTypeFilter('')
    setPage(1)
    router.push('/attendance')
  }

  const openProofDialog = async (record: AttendanceRecord) => {
    if (!record.hasProof) {
      toast.error('No proof image available')
      return
    }
    
    setProofRecord(record)
    setProofDialogOpen(true)
    setProofLoading(true)
    setProofUrl(null)
    
    try {
      const res = await fetch(`/api/attendance/${record.id}/proof-url`)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to fetch proof URL:', res.status, errorData)
        toast.error(errorData.error?.message || 'Failed to load proof image')
        setProofLoading(false)
        return
      }
      
      const data = await res.json()
      
      if (data.data?.proofUrl) {
        setProofUrl(data.data.proofUrl)
      } else {
        console.error('No proofUrl in response:', data)
        toast.error('Failed to load proof image')
      }
    } catch (error) {
      console.error('Error fetching proof URL:', error)
      toast.error('Failed to load proof image')
    } finally {
      setProofLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-gray-500">View and manage all attendance records</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm text-gray-500">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm text-gray-500">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm text-gray-500">Type</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="CHECK_IN">Check In</option>
                <option value="CHECK_OUT">Check Out</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter}>Apply</Button>
              <Button variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Attendance Log
              </CardTitle>
              <CardDescription>{total} records found</CardDescription>
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
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.employee.name}</p>
                          <p className="text-sm text-gray-500">
                            {record.employee.code} · {record.employee.department || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.attendanceType === 'CHECK_IN' ? (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                          <Badge
                            variant={record.attendanceType === 'CHECK_IN' ? 'default' : 'secondary'}
                          >
                            {record.attendanceType === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatTime(record.capturedAt)}</p>
                          <p className="text-sm text-gray-500">{formatDate(record.capturedAt)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge
                            variant={
                              record.verificationStatus === 'VERIFIED'
                                ? 'default'
                                : record.verificationStatus === 'FAILED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {record.verificationStatus}
                          </Badge>
                          {record.matchScore && (
                            <p className="text-xs text-gray-500 mt-1">
                              Score: {(record.matchScore * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.attendanceSource === 'ANDROID' ? 'Mobile' : 'Web'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.hasProof ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openProofDialog(record)}
                          >
                            <Image className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
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

      {/* Proof Image Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance Proof</DialogTitle>
            <DialogDescription>
              View the proof photo captured during attendance check-in or check-out
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {proofRecord && (
              <div className="text-sm text-gray-500">
                <p>
                  <strong>{proofRecord.employee.name}</strong> ({proofRecord.employee.code})
                </p>
                <p>
                  {proofRecord.attendanceType === 'CHECK_IN' ? 'Check In' : 'Check Out'} at{' '}
                  {formatTime(proofRecord.capturedAt)} on {formatDate(proofRecord.capturedAt)}
                </p>
              </div>
            )}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
              {proofLoading ? (
                <div className="text-gray-400">Loading...</div>
              ) : proofUrl ? (
                <img
                  src={proofUrl}
                  alt="Attendance proof"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                  onLoad={() => console.log('Image loaded successfully:', proofUrl)}
                  onError={(e) => {
                    console.error('Image load error:', proofUrl)
                    console.error('Image element:', e.currentTarget)
                    console.error('Natural dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight)
                    toast.error('Failed to display image')
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="text-gray-400">Failed to load image</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<AttendancePageSkeleton />}>
      <AttendancePageContent />
    </Suspense>
  )
}

function AttendancePageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
