# 📚 Knowledge Transfer - Sistem Absensi Web

> **Dokumen ini ditujukan untuk Fresh Graduate** yang baru bergabung dengan tim development.
> Pastikan untuk membaca dengan teliti dan jangan ragu untuk bertanya!

---

## 📋 Daftar Isi

1. [Overview Project](#-overview-project)
2. [Tech Stack](#-tech-stack)
3. [Arsitektur Aplikasi](#-arsitektur-aplikasi)
4. [Struktur Folder](#-struktur-folder)
5. [Setup Development](#-setup-development)
6. [Database Schema](#-database-schema)
7. [Alur Autentikasi](#-alur-autentikasi)
8. [API Endpoints](#-api-endpoints)
9. [Fitur Utama](#-fitur-utama)
10. [Best Practices](#-best-practices)
11. [Troubleshooting](#-troubleshooting)
12. [Resources Belajar](#-resources-belajar)

---

## 🎯 Overview Project

### Apa itu Sistem Absensi Web?

Sistem Absensi Web adalah aplikasi untuk **mencatat kehadiran karyawan** menggunakan teknologi **Face Recognition** (pengenalan wajah). Sistem ini terdiri dari:

1. **Admin Dashboard (Web)** - Untuk HR/Admin mengelola karyawan, device, lokasi kerja, dan melihat laporan absensi
2. **Mobile App (Android)** - Untuk karyawan melakukan check-in/check-out dengan verifikasi wajah

### Cara Kerja Singkat

```
┌─────────────────┐    Face Scan    ┌─────────────────┐    API Call    ┌─────────────────┐
│   Mobile App    │ ──────────────► │   Face Embedding │ ──────────────► │   Backend API   │
│   (Android)     │                 │   (128 numbers)  │                 │   (Next.js)     │
└─────────────────┘                 └─────────────────┘                 └────────┬────────┘
                                                                                  │
                                                                                  ▼
                                                                        ┌─────────────────┐
                                                                        │   PostgreSQL    │
                                                                        │   (Supabase)    │
                                                                        └─────────────────┘
```

**Face Embedding** adalah representasi wajah dalam bentuk 128 angka desimal. Ketika karyawan scan wajah, sistem membandingkan embedding tersebut dengan yang tersimpan di database.

---

## 🛠 Tech Stack

### Frontend (Web Dashboard)
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| **Next.js** | 16.x | React Framework dengan App Router |
| **React** | 19.x | UI Library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Radix UI** | Latest | Komponen UI yang accessible |
| **React Hook Form** | 7.x | Form handling |
| **Zod** | 4.x | Schema validation |

### Backend (API)
| Teknologi | Kegunaan |
|-----------|----------|
| **Next.js API Routes** | REST API endpoints |
| **Jose** | JWT token handling |
| **bcryptjs** | Password hashing |

### Database & Storage
| Teknologi | Kegunaan |
|-----------|----------|
| **Supabase (PostgreSQL)** | Database utama |
| **pgvector** | Menyimpan face embeddings |
| **Supabase Storage** | Menyimpan foto bukti absensi |

### Deployment
| Platform | Kegunaan |
|----------|----------|
| **Vercel** | Hosting Next.js app |
| **Supabase Cloud** | Database hosting |

---

## 🏗 Arsitektur Aplikasi

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
├────────────────────────────┬────────────────────────────────────────┤
│      Admin Dashboard       │           Mobile App                    │
│      (Next.js Web)         │           (Android)                     │
├────────────────────────────┴────────────────────────────────────────┤
│                                                                      │
│                         Next.js API Routes                           │
│                         /api/*                                       │
│                                                                      │
├────────────────────────────┬────────────────────────────────────────┤
│                            │                                         │
│      Admin Auth            │           Mobile Auth                   │
│   (Cookie-based JWT)       │       (Bearer Token JWT)                │
│                            │                                         │
├────────────────────────────┴────────────────────────────────────────┤
│                                                                      │
│                    Supabase (PostgreSQL + pgvector)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
1. User Request
       │
       ▼
2. Middleware (src/middleware.ts)
   - Cek apakah route butuh auth
   - Redirect ke login jika belum auth
       │
       ▼
3. API Route Handler (src/app/api/...)
   - Validasi input dengan Zod
   - Business logic
   - Query database
       │
       ▼
4. Response (JSON)
```

---

## 📁 Struktur Folder

```
Absensi-web/
├── docs/                          # 📚 Dokumentasi
│   └── postman/                   # Postman collection & environment
│
├── public/                        # Static files
│   └── models/                    # Face recognition models (face-api.js)
│
├── scripts/                       # Utility scripts
│   └── seed-dummy-data.ts         # Seed data untuk testing
│
├── src/
│   ├── app/                       # 🎯 Next.js App Router
│   │   ├── (admin)/               # Admin pages (protected)
│   │   │   ├── dashboard/         # Dashboard page
│   │   │   ├── employees/         # Kelola karyawan
│   │   │   ├── devices/           # Kelola devices
│   │   │   ├── locations/         # Kelola lokasi kerja
│   │   │   ├── attendance/        # Lihat absensi
│   │   │   └── layout.tsx         # Admin layout dengan sidebar
│   │   │
│   │   ├── (auth)/                # Auth pages (login)
│   │   ├── auth/                  # Auth route (login page)
│   │   │
│   │   ├── api/                   # 🔌 API Routes
│   │   │   ├── auth/              # Admin auth endpoints
│   │   │   ├── employees/         # Employee CRUD
│   │   │   ├── devices/           # Device CRUD
│   │   │   ├── work-locations/    # Work location CRUD
│   │   │   ├── attendance/        # Attendance (admin)
│   │   │   └── mobile/            # Mobile-specific APIs
│   │   │       ├── auth/          # Mobile auth (face-login)
│   │   │       └── attendance/    # Check-in/out
│   │   │
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Homepage (redirect)
│   │
│   ├── components/                # 🧩 React Components
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── map-picker.tsx     # Map picker untuk lokasi
│   │   │   └── ...
│   │   └── admin/                 # Admin-specific components
│   │       └── sidebar.tsx
│   │
│   ├── lib/                       # 📦 Utilities & Helpers
│   │   ├── api/                   # API response helpers
│   │   ├── auth/                  # Auth utilities (JWT)
│   │   ├── face/                  # Face recognition utilities
│   │   ├── supabase/              # Supabase client
│   │   ├── types/                 # TypeScript types
│   │   │   └── database.ts        # Database table types
│   │   ├── validators/            # Zod validation schemas
│   │   └── utils.ts               # General utilities
│   │
│   └── middleware.ts              # Next.js middleware
│
├── .env.local                     # ⚠️ Environment variables (JANGAN commit!)
├── package.json
├── tsconfig.json
└── next.config.ts
```

### Penjelasan Folder Penting

#### `src/app/(admin)/`
Folder dengan tanda kurung `()` di Next.js adalah **Route Group**. Ini tidak mempengaruhi URL, tapi mengelompokkan halaman dengan layout yang sama.

```
URL: /dashboard     → File: src/app/(admin)/dashboard/page.tsx
URL: /employees     → File: src/app/(admin)/employees/page.tsx
```

#### `src/app/api/`
Folder untuk API Routes. Setiap file `route.ts` menjadi endpoint.

```
src/app/api/employees/route.ts          → GET/POST /api/employees
src/app/api/employees/[id]/route.ts     → GET/PUT/DELETE /api/employees/:id
```

#### `src/lib/validators/`
Schema validation menggunakan Zod. Semua input harus divalidasi sebelum diproses.

---

## 💻 Setup Development

### Prerequisites

1. **Node.js** v18+ ([Download](https://nodejs.org/))
2. **Git** ([Download](https://git-scm.com/))
3. **VS Code** (Recommended) ([Download](https://code.visualstudio.com/))
4. **Postman** untuk testing API ([Download](https://www.postman.com/))

### Langkah Setup

#### 1. Clone Repository

```bash
git clone https://github.com/dhimasrds/Absensi-web.git
cd Absensi-web
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Setup Environment Variables

Buat file `.env.local` di root folder:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secret (untuk admin auth)
JWT_SECRET=your_jwt_secret_min_32_chars
```

> ⚠️ **PENTING**: File `.env.local` berisi credentials rahasia. JANGAN pernah commit ke Git!

#### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### VS Code Extensions yang Direkomendasikan

- **ESLint** - Linting JavaScript/TypeScript
- **Tailwind CSS IntelliSense** - Autocomplete untuk Tailwind
- **Prettier** - Code formatting
- **Thunder Client** - REST API testing (alternatif Postman)

---

## 🗄 Database Schema

### Entity Relationship Diagram (ERD)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   profiles   │       │  employees   │       │work_locations│
├──────────────┤       ├──────────────┤       ├──────────────┤
│ user_id (PK) │       │ id (PK)      │       │ id (PK)      │
│ role         │       │ employee_id  │◄──────│ name         │
│ created_at   │       │ full_name    │       │ address      │
│ updated_at   │       │ email        │       │ latitude     │
└──────────────┘       │ department   │       │ longitude    │
                       │ work_loc_id  │───────►│ radius_meters│
                       │ is_active    │       │ is_active    │
                       │ created_at   │       └──────────────┘
                       └──────┬───────┘
                              │
                              │ 1:1
                              ▼
                       ┌──────────────┐
                       │face_templates│
                       ├──────────────┤
                       │ id (PK)      │
                       │ employee_id  │
                       │ embedding    │  ◄── vector(128)
                       │ quality_score│
                       │ is_active    │
                       └──────────────┘
                              │
                              │ 1:N
                              ▼
┌──────────────┐       ┌──────────────┐
│   devices    │       │attendance_log│
├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ id (PK)      │
│ device_id    │       │ employee_id  │
│ label        │       │ type         │  ◄── CHECK_IN/CHECK_OUT
│ device_model │       │ timestamp    │
│ os_version   │       │ source       │  ◄── WEB_ADMIN/ANDROID
│ is_active    │       │ device_id    │
└──────────────┘       │ match_score  │
                       │ proof_image  │
                       └──────────────┘
```

### Tabel-Tabel Penting

| Tabel | Deskripsi |
|-------|-----------|
| `profiles` | Data admin users (terhubung dengan Supabase Auth) |
| `employees` | Data karyawan |
| `work_locations` | Lokasi kerja dengan koordinat GPS dan radius geofence |
| `face_templates` | Template wajah karyawan (embedding 128 dimensi) |
| `devices` | Device Android yang terdaftar |
| `mobile_sessions` | Session login mobile (refresh token) |
| `attendance_logs` | Log absensi check-in/check-out |

### Type pgvector

Kolom `embedding` di `face_templates` menggunakan tipe `vector(128)` dari extension **pgvector**. Ini memungkinkan:

- Menyimpan array 128 angka dengan efisien
- Melakukan similarity search dengan cepat
- Menggunakan cosine distance untuk face matching

---

## 🔐 Alur Autentikasi

### Admin Authentication (Web Dashboard)

```
┌─────────────┐    POST /api/auth/login    ┌─────────────┐
│   Browser   │ ─────────────────────────► │   Server    │
│             │    {email, password}       │             │
└─────────────┘                            └──────┬──────┘
                                                  │
                                                  ▼
                                           Verify dengan
                                           Supabase Auth
                                                  │
                                                  ▼
┌─────────────┐    Set HTTP-Only Cookie    ┌─────────────┐
│   Browser   │ ◄───────────────────────── │   Server    │
│             │    (JWT Token)             │             │
└─────────────┘                            └─────────────┘
```

**Karakteristik:**
- Cookie-based JWT
- HTTP-Only cookie (tidak bisa diakses JavaScript)
- Automatic refresh via middleware

### Mobile Authentication (Android App)

```
┌─────────────┐  POST /api/mobile/auth/face-login  ┌─────────────┐
│ Android App │ ───────────────────────────────────►│   Server    │
│             │  {deviceId, embedding, liveness}   │             │
└─────────────┘                                    └──────┬──────┘
                                                          │
                                                          ▼
                                                   Face Matching
                                                   (pgvector search)
                                                          │
                                                          ▼
┌─────────────┐    {accessToken, refreshToken}     ┌─────────────┐
│ Android App │ ◄───────────────────────────────── │   Server    │
│             │                                    │             │
└─────────────┘                                    └─────────────┘
```

**Karakteristik:**
- Bearer Token JWT
- Access Token (15 menit) + Refresh Token (7 hari)
- Device auto-registration

---

## 🔌 API Endpoints

### Admin Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login admin |
| POST | `/api/auth/logout` | Logout admin |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/employees` | List karyawan |
| POST | `/api/employees` | Tambah karyawan |
| PUT | `/api/employees/:id` | Update karyawan |
| DELETE | `/api/employees/:id` | Hapus karyawan |
| POST | `/api/employees/:id/face/enroll` | Daftarkan wajah |
| GET | `/api/devices` | List devices |
| GET | `/api/work-locations` | List lokasi kerja |
| GET | `/api/attendance` | List absensi |

### Mobile Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/mobile/auth/face-login` | Login dengan wajah |
| POST | `/api/mobile/auth/refresh` | Refresh token |
| POST | `/api/mobile/auth/logout` | Logout |
| GET | `/api/mobile/me` | Get current employee |
| POST | `/api/mobile/attendance/check-in` | Check in |
| POST | `/api/mobile/attendance/check-out` | Check out |
| GET | `/api/mobile/attendance/history` | History absensi |

### Contoh Request & Response

**Face Login (Mobile)**

```bash
POST /api/mobile/auth/face-login
Content-Type: application/json

{
  "deviceId": "ANDROID-001",
  "clientCaptureId": "capture-123",
  "capturedAt": "2026-01-14T08:00:00Z",
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [0.1, 0.2, ... 128 numbers]
  },
  "liveness": {
    "provided": true,
    "score": 0.95
  },
  "model": "Samsung Galaxy S21",
  "os": "Android 13"
}
```

**Response:**

```json
{
  "data": {
    "employee": {
      "id": "uuid",
      "fullName": "John Doe",
      "employeeId": "EMP001"
    },
    "session": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresAt": "2026-01-14T08:15:00Z"
    },
    "device": {
      "id": "uuid",
      "label": "ANDROID-001"
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

## ⭐ Fitur Utama

### 1. Face Recognition Login

- Menggunakan **face embedding** (128 dimensi)
- Similarity search dengan **pgvector**
- Threshold matching: **0.6** (makin rendah = makin mirip)
- Liveness detection untuk anti-spoofing

### 2. Geofencing

- Setiap lokasi kerja punya koordinat dan radius
- Validasi lokasi saat check-in/check-out
- Menggunakan formula **Haversine** untuk hitung jarak

### 3. Device Management

- Auto-register device saat pertama login
- Admin bisa enable/disable device
- Device info (model, OS) tersimpan di database

### 4. Map Picker (Lokasi Kerja)

- Pilih lokasi dari peta (OpenStreetMap)
- Geocoding (cari alamat → koordinat)
- Reverse geocoding (koordinat → alamat)
- GPS dengan fallback ke IP-based location

---

## 📝 Best Practices

### 1. Validation dengan Zod

Selalu validasi input di API routes:

```typescript
// src/lib/validators/employee.ts
import { z } from 'zod'

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50),
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  // ...
})

// Di API route
const result = createEmployeeSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

### 2. Error Handling

Gunakan try-catch dan return error yang informatif:

```typescript
try {
  const { data, error } = await supabase.from('employees').select()
  
  if (error) throw error
  
  return NextResponse.json({ data })
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
    { status: 500 }
  )
}
```

### 3. TypeScript Types

Selalu gunakan types untuk data dari database:

```typescript
import { Employee, ApiResponse } from '@/lib/types/database'

// Daripada 'any', gunakan type yang spesifik
const employee: Employee = data[0]
```

### 4. Environment Variables

- Development: `.env.local`
- Production: Set di Vercel Dashboard
- JANGAN hardcode credentials!

---

## 🔧 Troubleshooting

### Error: "Module not found"

```bash
# Hapus node_modules dan install ulang
rm -rf node_modules
npm install
```

### Error: "Supabase connection failed"

1. Cek file `.env.local` sudah benar
2. Pastikan Supabase project aktif
3. Cek network/firewall

### Error: "JWT expired"

- Admin: Coba logout dan login ulang
- Mobile: Call refresh token endpoint

### Database migration error

```bash
# Jalankan migration dari Supabase Dashboard
# SQL Editor → Run query
```

---

## 📖 Resources Belajar

### Next.js
- [Next.js Documentation](https://nextjs.org/docs) - Official docs
- [Next.js App Router Tutorial](https://nextjs.org/learn)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript for JS Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/)

### Tailwind CSS
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

### React Hook Form + Zod
- [React Hook Form](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

### Face Recognition
- [face-api.js](https://github.com/justadudewhohacks/face-api.js)
- [pgvector Extension](https://github.com/pgvector/pgvector)

---

## 🤝 Tim & Kontak

Jika ada pertanyaan, silakan hubungi:

- **Tech Lead**: [Nama] - [email]
- **Backend Developer**: [Nama] - [email]
- **Mobile Developer**: [Nama] - [email]

---

## 📝 Catatan Akhir

> "The only way to learn programming is by writing code."

Jangan takut untuk:
- Bertanya jika ada yang tidak dimengerti
- Mencoba dan membuat kesalahan (di development environment)
- Membaca source code untuk memahami flow
- Gunakan Git untuk tracking perubahan

**Selamat belajar dan selamat bergabung dengan tim! 🎉**

---

*Dokumen ini terakhir diperbarui: Januari 2026*
