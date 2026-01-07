# Milestone 7: Web UI (Admin Dashboard)

## Overview
Implementasi UI admin dashboard menggunakan Next.js App Router, shadcn/ui, dan Tailwind CSS untuk mengelola employees, devices, dan attendance.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Toast**: Sonner

## Components Used (shadcn/ui)

| Component | Usage |
|-----------|-------|
| Button | Actions, navigation |
| Card | Container untuk sections |
| Input | Form inputs |
| Label | Form labels |
| Table | Data tables |
| Badge | Status indicators |
| Dialog | Modal forms |
| DropdownMenu | User menu |
| Avatar | User avatar |
| Skeleton | Loading states |
| Tabs | Tab navigation |
| Separator | Visual dividers |
| Sonner | Toast notifications |

## Page Structure

```
src/app/
├── (admin)/                    # Admin layout group
│   ├── layout.tsx              # Shared admin layout
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard overview
│   ├── employees/
│   │   └── page.tsx            # Employee management
│   ├── devices/
│   │   └── page.tsx            # Device management
│   └── attendance/
│       └── page.tsx            # Attendance records
├── (auth)/                     # Auth layout group
│   └── login/
│       └── page.tsx            # Login page
└── layout.tsx                  # Root layout
```

---

## Admin Layout (`src/app/(admin)/layout.tsx`)

Shared layout dengan navigation bar.

### Features
- Logo dan app name
- Desktop navigation (horizontal)
- Mobile navigation (scrollable tabs)
- User dropdown menu dengan sign out

### Navigation Items
```typescript
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Devices', href: '/devices', icon: Smartphone },
  { name: 'Attendance', href: '/attendance', icon: ClipboardList },
]
```

---

## Dashboard Page (`/dashboard`)

### Features
- Stats cards (4 metrics)
- Recent attendance list

### Stats Cards
| Metric | Icon | Color |
|--------|------|-------|
| Total Employees | Users | Blue |
| Registered Devices | Smartphone | Green |
| Today Check-ins | UserCheck | Purple |
| Today Check-outs | Clock | Orange |

### Data Fetching
```typescript
// Server component - parallel data fetching
const [
  { count: totalEmployees },
  { count: activeEmployees },
  { count: totalDevices },
  { count: activeDevices },
  { count: todayCheckIns },
  { count: todayCheckOuts },
  { data: recentAttendance },
] = await Promise.all([...])
```

---

## Employees Page (`/employees`)

### Features
- Search by name/code/email
- CRUD dialogs (Create, Edit, Delete)
- Pagination
- Status badge (Active/Inactive)

### Table Columns
| Column | Content |
|--------|---------|
| Employee | Name + Code |
| Department | Department + Job Title |
| Contact | Email + Phone |
| Status | Active/Inactive badge |
| Actions | Edit + Delete buttons |

### Dialogs
1. **Create Dialog**: Form untuk add employee
2. **Edit Dialog**: Form untuk update employee
3. **Delete Dialog**: Confirmation dialog

### State Management
```typescript
// URL state untuk search & pagination
const searchParams = useSearchParams()
const [search, setSearch] = useState(searchParams.get('search') || '')
const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

// Dialog states
const [isCreateOpen, setIsCreateOpen] = useState(false)
const [isEditOpen, setIsEditOpen] = useState(false)
const [isDeleteOpen, setIsDeleteOpen] = useState(false)
```

---

## Devices Page (`/devices`)

### Features
- Search by name/unique ID
- CRUD dialogs
- Pagination
- Last seen timestamp
- Active/Inactive toggle

### Table Columns
| Column | Content |
|--------|---------|
| Device | Name + Unique ID |
| Model / OS | Model + OS Version |
| Last Seen | Timestamp |
| Status | Active/Inactive badge |
| Actions | Edit + Delete buttons |

---

## Attendance Page (`/attendance`)

### Features
- Filter by date range
- Filter by type (Check-in/Check-out)
- Pagination
- View proof image dialog

### Filter Section
```typescript
<Input type="date" value={dateFrom} onChange={...} />
<Input type="date" value={dateTo} onChange={...} />
<select value={typeFilter}>
  <option value="">All Types</option>
  <option value="CHECK_IN">Check In</option>
  <option value="CHECK_OUT">Check Out</option>
</select>
```

### Table Columns
| Column | Content |
|--------|---------|
| Employee | Name + Code + Department |
| Type | Check-in/Check-out dengan icon |
| Date & Time | Time + Date |
| Verification | Status badge + Score |
| Source | Mobile/Web badge |
| Proof | View button |

### Proof Image Dialog
```typescript
// Fetch signed URL
const res = await fetch(`/api/attendance/${record.id}/proof-url`)
const { proofUrl } = await res.json()

// Display in dialog
<img src={proofUrl} alt="Attendance proof" />
```

---

## Loading States

### Skeleton Loading
```typescript
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
```

### Suspense Boundary
```typescript
// Required for useSearchParams
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent />
    </Suspense>
  )
}
```

---

## Toast Notifications

```typescript
import { toast } from 'sonner'

// Success
toast.success('Employee created successfully')

// Error
toast.error('Failed to create employee')

// With message from API
catch (error) {
  toast.error(error instanceof Error ? error.message : 'Unknown error')
}
```

---

## Form Handling

### Form State
```typescript
const [formData, setFormData] = useState({
  employeeCode: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  department: '',
})
```

### API Call Pattern
```typescript
const handleCreate = async () => {
  setFormLoading(true)
  try {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || 'Failed')
    }
    
    toast.success('Created successfully')
    setIsCreateOpen(false)
    fetchData() // Refresh list
  } catch (error) {
    toast.error(error.message)
  } finally {
    setFormLoading(false)
  }
}
```

---

## Styling Patterns

### Card dengan Stats
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">Title</p>
        <p className="text-3xl font-bold mt-1">123</p>
        <p className="text-sm text-gray-400 mt-1">Subtitle</p>
      </div>
      <div className="p-3 rounded-full bg-blue-100">
        <Icon className="h-6 w-6 text-blue-600" />
      </div>
    </div>
  </CardContent>
</Card>
```

### Badge Variants
```tsx
// Active/Inactive
<Badge variant={active ? 'default' : 'secondary'}>
  {active ? 'Active' : 'Inactive'}
</Badge>

// Verification status
<Badge variant={status === 'VERIFIED' ? 'default' : 'destructive'}>
  {status}
</Badge>

// Source
<Badge variant="outline">Mobile</Badge>
```

---

## File Structure

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── devices/page.tsx
│   │   └── attendance/page.tsx
│   ├── (auth)/
│   │   └── login/page.tsx
│   └── layout.tsx
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── avatar.tsx
│       ├── skeleton.tsx
│       ├── separator.tsx
│       └── sonner.tsx
└── lib/
    └── utils.ts          # cn() utility
```

---

## Screenshots

### Dashboard
- Stats cards row
- Recent attendance list

### Employees
- Search bar
- Employee table
- Create/Edit dialog

### Devices
- Search bar
- Device table
- Status toggle

### Attendance
- Date filters
- Type filter
- Attendance table
- Proof image dialog

---

## Responsive Design

### Breakpoints
- Mobile: Default
- Tablet: `sm:` (640px)
- Desktop: `md:` (768px), `lg:` (1024px)

### Examples
```tsx
// Grid columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Hide on mobile
<span className="hidden sm:block">Text</span>

// Mobile navigation
<nav className="md:hidden border-t">
```

---

## Performance Optimizations

1. **Server Components**: Dashboard uses server-side data fetching
2. **Parallel Queries**: Multiple Supabase queries run in parallel
3. **Pagination**: Limited data per page
4. **Suspense**: Proper loading boundaries
5. **Skeleton Loading**: Visual feedback during load
