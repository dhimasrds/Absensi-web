# 📚 Knowledge Transfer - Sistem Absensi Web

> **Panduan untuk Fresh Graduate** - Learn by doing!

---

## 📋 Daftar Isi

1. [Overview Project](#-overview-project)
2. [Tech Stack](#-tech-stack)
3. [Setup Development](#-setup-development)
4. [Struktur Folder](#-struktur-folder)
5. [Database Schema](#-database-schema)
6. [Cara Kerja Sistem](#-cara-kerja-sistem)
7. [API Endpoints](#-api-endpoints)
8. [Key Concepts](#-key-concepts)
9. [Best Practices](#-best-practices)
10. [Troubleshooting](#-troubleshooting)
11. [Resources](#-resources)

---

## 🎯 Overview Project

### Apa itu Sistem Absensi Web?

Aplikasi untuk mencatat kehadiran karyawan menggunakan **Face Recognition** (pengenalan wajah).

**Komponen:**
- **Web Dashboard** - Admin kelola data karyawan & lihat laporan
- **Mobile App** - Karyawan check-in/out dengan scan wajah

**Flow Sederhana:**
```
Mobile App → Scan Wajah → Generate Embedding → Kirim ke Server 
→ Server Compare dengan Database → Check GPS → Save Attendance
```

---

## 🛠 Tech Stack

| Layer | Teknologi | Kegunaan |
|-------|-----------|----------|
| **Frontend** | Next.js 16 + React 19 + TypeScript | Web dashboard |
| **Styling** | Tailwind CSS + Radix UI | UI components |
| **Backend** | Next.js API Routes | REST API |
| **Database** | Supabase PostgreSQL + pgvector | Data + Face embeddings |
| **Auth** | JWT (Jose) | Authentication |
| **Validation** | Zod | Input validation |
| **Deployment** | Vercel + Supabase Cloud | Hosting |

---

## 💻 Setup Development

### 1. Clone Repository

```bash
git clone https://github.com/dhimasrds/Absensi-web.git
cd Absensi-web
npm install
```

### 2. Environment Variables

Buat file `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secret (min 32 chars)
JWT_SECRET=your_jwt_secret_key
```

⚠️ **PENTING**: Jangan commit file `.env.local` ke Git!

### 3. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 📁 Struktur Folder

```
src/
├── app/
│   ├── (admin)/              # Admin pages (protected)
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── devices/
│   │   ├── locations/
│   │   └── attendance/
│   │
│   ├── api/                  # API endpoints
│   │   ├── auth/             # Admin login
│   │   ├── employees/        # Employee CRUD
│   │   ├── devices/
│   │   ├── work-locations/
│   │   └── mobile/           # Mobile-specific APIs
│   │       ├── auth/
│   │       └── attendance/
│   │
│   └── auth/                 # Login page
│
├── components/               # React components
│   ├── ui/                   # Reusable UI (button, dialog, etc)
│   └── admin/
│
└── lib/                      # Utilities
    ├── api/                  # API helpers
    ├── auth/                 # JWT functions
    ├── face/                 # Face recognition
    ├── supabase/             # Database client
    ├── types/                # TypeScript types
    └── validators/           # Zod schemas
```

**Key Points:**
- `app/` = Pages & API routes (Next.js 13+ App Router)
- `lib/` = Business logic & utilities
- `components/` = Reusable UI components

---

## 🗄 Database Schema

### Main Tables

**employees** - Data karyawan
```sql
id, employee_id, full_name, email, department, 
work_location_id, is_active
```

**face_templates** - Template wajah
```sql
id, employee_id, embedding (vector 128), 
quality_score, is_active
```

**devices** - Device Android
```sql
id, device_id, label, device_model, os_version, is_active
```

**attendance_logs** - Log absensi
```sql
id, employee_id, type (CHECK_IN/CHECK_OUT), 
timestamp, device_id, match_score, latitude, longitude
```

**work_locations** - Lokasi kerja
```sql
id, name, address, latitude, longitude, radius_meters
```

### Relationships

```
employees (1) ──── (1) face_templates
    │
    │ (1) ──── (N) attendance_logs
    │
    └─── (N) ──── (1) work_locations
```

---

## ⚙️ Cara Kerja Sistem

### 1. Face Recognition

**What is Face Embedding?**

Representasi wajah dalam 128 angka:
```javascript
[0.142, -0.089, 0.213, ..., 0.098] // 128 numbers
```

**How it works:**
1. Mobile scan wajah → Generate embedding
2. Server compare dengan database (pgvector)
3. Hitung similarity score (cosine distance)
4. If score > threshold (0.80) → Match!

### 2. Authentication

**Admin (Web):**
- Login → JWT token disimpan di HTTP-Only Cookie
- Cookie otomatis dikirim setiap request

**Mobile (Android):**
- Face Login → dapat Access Token (15 min) + Refresh Token (7 days)
- Setiap request kirim: `Authorization: Bearer <access_token>`

### 3. Geofencing

Pastikan karyawan di lokasi kantor:

```typescript
// Check distance antara user location & office location
const distance = calculateDistance(
  userLat, userLon, 
  officeLat, officeLon
)

if (distance > officeRadius) {
  return error("Di luar radius kantor")
}
```

---

## 🔌 API Endpoints

### Admin Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login admin |
| GET | `/api/employees` | List karyawan |
| POST | `/api/employees` | Tambah karyawan |
| POST | `/api/employees/:id/face/enroll` | Daftar wajah |
| GET | `/api/attendance` | Lihat absensi |

### Mobile Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/mobile/auth/face-login` | Login dengan wajah |
| POST | `/api/mobile/attendance/check-in` | Check in |
| POST | `/api/mobile/attendance/check-out` | Check out |
| GET | `/api/mobile/attendance/history` | History absensi |

---

## 💡 Key Concepts

### 1. API Route Example

```typescript
// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = createAdminSupabaseClient()
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

### 2. Validation dengan Zod

```typescript
// Define schema
const createEmployeeSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional(),
})

// Validate input
const result = createEmployeeSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}

const input = result.data // Type-safe!
```

### 3. Supabase Query

```typescript
// SELECT
const { data } = await supabase
  .from('employees')
  .select('*, work_location:work_locations(*)')
  .eq('is_active', true)

// INSERT
const { data } = await supabase
  .from('employees')
  .insert({ employee_id: 'EMP001', full_name: 'John' })
  .select()
  .single()

// UPDATE
await supabase
  .from('employees')
  .update({ is_active: false })
  .eq('id', employeeId)
```

### 4. JWT Authentication

```typescript
// Create token
import { SignJWT } from 'jose'

const token = await new SignJWT({ sub: userId })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')
  .sign(secret)

// Verify token
import { jwtVerify } from 'jose'

const { payload } = await jwtVerify(token, secret)
```

### 5. Face Identification

```typescript
// Call RPC function
const { data } = await supabase.rpc('face_identify_v1', {
  query_embedding: `[${embedding.join(',')}]`,
  match_threshold: 0.80,
  match_count: 1,
})

// Returns: [{ employee_id, score }]
```

---

## 📝 Best Practices

### 1. Validation
✅ **DO**: Always validate input dengan Zod
```typescript
const result = schema.safeParse(input)
if (!result.success) return error
```

### 2. Error Handling
✅ **DO**: Use try-catch dan return error yang jelas
```typescript
try {
  // ... logic
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: 'Internal server error' }, 
    { status: 500 }
  )
}
```

### 3. TypeScript Types
✅ **DO**: Use types dari `src/lib/types/database.ts`
```typescript
import { Employee } from '@/lib/types/database'

const employee: Employee = data[0]
```

### 4. Environment Variables
✅ **DO**: Use `process.env` untuk secrets
```typescript
const secret = process.env.JWT_SECRET
```
❌ **DON'T**: Hardcode credentials
```typescript
const secret = "my-secret-123" // BAD!
```

### 5. SQL Injection
✅ **DO**: Use Supabase query builder (auto-escaped)
```typescript
.eq('employee_id', userInput) // SAFE
```
❌ **DON'T**: String concatenation
```typescript
`WHERE employee_id = '${userInput}'` // UNSAFE!
```

---

## 🔧 Troubleshooting

### Error: "Module not found"
```bash
rm -rf node_modules
npm install
```

### Error: "Supabase connection failed"
- Check `.env.local` file
- Pastikan Supabase project aktif
- Check internet connection

### Error: "JWT expired"
- Admin: Logout dan login ulang
- Mobile: Call refresh token endpoint

### Database error
- Check Supabase Dashboard → SQL Editor
- Lihat error logs

---

## 📖 Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev/)

### Tutorials
- [Next.js Learn](https://nextjs.org/learn) - Interactive tutorial
- [TypeScript in 5 minutes](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

### Tools
- [Postman Collection](docs/postman/) - API testing
- [VS Code](https://code.visualstudio.com/) - Code editor

---

**Tips untuk Belajar:**
- Mulai dari file kecil, jangan langsung baca semua
- Jalankan kode di local, coba ubah-ubah
- Gunakan `console.log()` untuk debug
- Baca error message dengan teliti
- Jangan ragu bertanya!

**Happy coding! 🚀**
