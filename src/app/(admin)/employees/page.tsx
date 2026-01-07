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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, UserPlus, Users, MapPin, ScanFace } from 'lucide-react'
import { FaceEnrollmentDialog } from '@/components/employees/FaceEnrollmentDialog'

interface WorkLocation {
  id: string
  name: string
  address: string | null
  is_active: boolean
}

interface Employee {
  id: string
  employeeCode: string
  fullName: string
  email: string | null
  phoneNumber: string | null
  jobTitle: string | null
  department: string | null
  workLocationId: string | null
  workLocationName: string | null
  active: boolean
  hasFaceEnrolled: boolean
  createdAt: string
}

interface EmployeesResponse {
  data: Employee[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

function EmployeesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([])
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isFaceEnrollOpen, setIsFaceEnrollOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    jobTitle: '',
    department: '',
    workLocationId: '',
  })

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '10')
      
      const res = await fetch(`/api/employees?${params}`)
      const data: EmployeesResponse = await res.json()
      
      if (data.data) {
        setEmployees(data.data)
        setTotal(data.meta.pagination.total)
        setTotalPages(data.meta.pagination.totalPages)
      }
    } catch {
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  // Fetch work locations
  useEffect(() => {
    const fetchWorkLocations = async () => {
      try {
        const res = await fetch('/api/work-locations?isActive=true&limit=100')
        const data = await res.json()
        if (data.data) {
          setWorkLocations(data.data)
        }
      } catch {
        console.error('Failed to fetch work locations')
      }
    }
    fetchWorkLocations()
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    router.push(`/employees?search=${value}&page=1`)
  }

  const handleCreate = async () => {
    setFormLoading(true)
    try {
      // Map form fields to API fields
      const payload = {
        employeeId: formData.employeeCode,
        fullName: formData.fullName,
        email: formData.email || null,
        department: formData.department || null,
        workLocationId: formData.workLocationId || null,
      }
      
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to create employee')
      }
      
      toast.success('Employee created successfully')
      setIsCreateOpen(false)
      setFormData({ employeeCode: '', fullName: '', email: '', phoneNumber: '', jobTitle: '', department: '', workLocationId: '' })
      fetchEmployees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create employee')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedEmployee) return
    setFormLoading(true)
    try {
      // Map form fields to API fields
      const payload = {
        employeeId: formData.employeeCode,
        fullName: formData.fullName,
        email: formData.email || null,
        department: formData.department || null,
        workLocationId: formData.workLocationId || null,
      }
      
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update employee')
      }
      
      toast.success('Employee updated successfully')
      setIsEditOpen(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEmployee) return
    setFormLoading(true)
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to delete employee')
      }
      
      toast.success('Employee deleted successfully')
      setIsDeleteOpen(false)
      setSelectedEmployee(null)
      fetchEmployees()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setFormLoading(false)
    }
  }

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email || '',
      phoneNumber: employee.phoneNumber || '',
      jobTitle: employee.jobTitle || '',
      department: employee.department || '',
      workLocationId: employee.workLocationId || '',
    })
    setIsEditOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500">Manage your organization's employees</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Employee
              </DialogTitle>
              <DialogDescription>
                Fill in the employee details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">Employee Code *</Label>
                  <Input
                    id="employeeCode"
                    placeholder="EMP001"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+62812345678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workLocation">Work Location</Label>
                <Select
                  value={formData.workLocationId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, workLocationId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No location assigned</span>
                    </SelectItem>
                    {workLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {loc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Employee must be at this location to clock in (geofencing)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Employee'}
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
                <Users className="h-5 w-5" />
                Employee List
              </CardTitle>
              <CardDescription>{total} employees total</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
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
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No employees found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Face</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-sm text-gray-500">{emp.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{emp.department || '-'}</p>
                          <p className="text-sm text-gray-500">{emp.jobTitle || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.workLocationName ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{emp.workLocationName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{emp.email || '-'}</p>
                          <p className="text-sm text-gray-500">{emp.phoneNumber || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.active ? 'default' : 'secondary'}>
                          {emp.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {emp.hasFaceEnrolled ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <ScanFace className="h-3 w-3 mr-1" />
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <ScanFace className="h-3 w-3 mr-1" />
                              Not Enrolled
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={emp.hasFaceEnrolled ? "Re-enroll Face" : "Enroll Face"}
                            onClick={() => {
                              setSelectedEmployee(emp)
                              setIsFaceEnrollOpen(true)
                            }}
                          >
                            <ScanFace className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedEmployee(emp)
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
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-employeeCode">Employee Code *</Label>
                <Input
                  id="edit-employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name *</Label>
                <Input
                  id="edit-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input
                  id="edit-phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-jobTitle">Job Title</Label>
                <Input
                  id="edit-jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-workLocation">Work Location</Label>
              <Select
                value={formData.workLocationId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, workLocationId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">No location assigned</span>
                  </SelectItem>
                  {workLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {loc.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedEmployee?.fullName}</strong>? 
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

      {/* Face Enrollment Dialog */}
      {selectedEmployee && (
        <FaceEnrollmentDialog
          open={isFaceEnrollOpen}
          onOpenChange={setIsFaceEnrollOpen}
          employee={{
            id: selectedEmployee.id,
            fullName: selectedEmployee.fullName,
            employeeCode: selectedEmployee.employeeCode,
          }}
          onSuccess={() => {
            fetchEmployees()
          }}
        />
      )}
    </div>
  )
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<EmployeesPageSkeleton />}>
      <EmployeesPageContent />
    </Suspense>
  )
}

function EmployeesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
