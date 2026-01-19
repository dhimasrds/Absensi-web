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
10. [Code Deep Dive](#-code-deep-dive)
11. [Security Considerations](#-security-considerations)
12. [Testing Strategy](#-testing-strategy)
13. [Best Practices](#-best-practices)
14. [Troubleshooting](#-troubleshooting)
15. [Resources Belajar](#-resources-belajar)

---

## 🎯 Overview Project

### Apa itu Sistem Absensi Web?

Sistem Absensi Web adalah aplikasi **Enterprise Attendance Management** untuk mencatat kehadiran karyawan menggunakan teknologi **Face Recognition** (pengenalan wajah). Sistem ini dirancang untuk menggantikan sistem absensi manual atau fingerprint dengan solusi yang lebih higienis dan modern.

**Komponen Utama:**

1. **Admin Dashboard (Web)** 
   - Untuk HR/Admin mengelola data master (karyawan, device, lokasi kerja)
   - Monitoring real-time absensi
   - Generate laporan kehadiran
   - Face enrollment untuk karyawan baru

2. **Mobile App (Android)** 
   - Untuk karyawan melakukan check-in/check-out
   - Face recognition dengan liveness detection
   - GPS tracking untuk verifikasi lokasi
   - Attendance history

### Cara Kerja Singkat

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER JOURNEY                             │
└──────────────────────────────────────────────────────────────────┘

[Karyawan] → Buka App Android → Kamera aktif → Scan Wajah
                                                     │
                                                     ▼
                            Face Detection (Client-side)
                                     │
                                     ▼
                            Generate Embedding (128 numbers)
                                     │
                                     ▼
                            Kirim ke Server + GPS Location
                                     │
┌────────────────────────────────────┴───────────────────────────┐
│                         SERVER PROCESS                          │
└─────────────────────────────────────────────────────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  ▼                  ▼                  ▼
            Validate JWT      Compare Face        Check GPS
            & Device ID       dengan Database     dalam Radius
                  │                  │                  │
                  └──────────────────┴──────────────────┘
                                     │
                                     ▼
                           ✅ Check-in Success
                           Save to Database
                                     │
                                     ▼
                           Return Success Response
```

### Face Embedding Explained

**Face Embedding** adalah representasi matematis dari wajah seseorang dalam bentuk array 128 angka floating-point. Contoh:

```javascript
[
  0.142, -0.089, 0.213, ..., 0.098  // Total 128 numbers
]
```

**Mengapa 128 angka?**
- Hasil dari model neural network (FaceNet/face-api.js)
- Cukup untuk merepresentasikan fitur wajah unik setiap orang
- Lebih kecil dari gambar asli (efisien untuk storage & pencarian)

**Proses Matching:**
```
Face A embedding: [0.1, 0.2, 0.3, ...]
Face B embedding: [0.1, 0.19, 0.31, ...]

Cosine Distance = 0.15  ← Makin kecil = makin mirip
Threshold = 0.6

0.15 < 0.6 → ✅ MATCH! (Wajah yang sama)
```

---

## 🛠 Tech Stack

### Frontend (Web Dashboard)
| Teknologi | Versi | Kegunaan | Alasan Pemilihan |
|-----------|-------|----------|------------------|
| **Next.js** | 16.x | React Framework dengan App Router | SSR, file-based routing, API routes dalam satu project |
| **React** | 19.x | UI Library | Industry standard, component-based, huge ecosystem |
| **TypeScript** | 5.x | Type-safe JavaScript | Catch errors sebelum runtime, better IDE support |
| **Tailwind CSS** | 4.x | Utility-first CSS | Rapid development, consistent design, small bundle |
| **Radix UI** | Latest | Headless UI components | Accessible by default, customizable, production-ready |
| **React Hook Form** | 7.x | Form handling | Performant (less re-renders), simple API, built-in validation |
| **Zod** | 4.x | Schema validation | Type-safe validation, TypeScript integration, readable schemas |
| **Lucide React** | Latest | Icon library | Modern icons, tree-shakeable, consistent design |

### Backend (API)
| Teknologi | Kegunaan | Key Features |
|-----------|----------|--------------|
| **Next.js API Routes** | REST API endpoints | Serverless functions, automatic API routing |
| **Jose** | JWT token handling | Modern JWT library, Web Crypto API, secure |
| **bcryptjs** | Password hashing | One-way hash, salt generation, secure password storage |
| **uuid** | Generate unique IDs | UUID v4 for unique identifiers |

### Database & Storage
| Teknologi | Kegunaan | Why We Use It |
|-----------|----------|---------------|
| **Supabase PostgreSQL** | Database utama | Open-source Firebase alternative, real-time, auth built-in |
| **pgvector Extension** | Vector similarity search | Store & query face embeddings efficiently |
| **Supabase Storage** | File storage | S3-compatible, automatic image optimization |

### Development Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting untuk konsistensi |
| **Prettier** | Code formatting otomatis |
| **tsx** | Run TypeScript files directly (untuk scripts) |
| **Postman** | API testing & documentation |

### Deployment
| Platform | Kegunaan | Features |
|----------|----------|----------|
| **Vercel** | Hosting Next.js app | Auto-deploy from Git, Edge Functions, Analytics |
| **Supabase Cloud** | Database hosting | Automatic backups, connection pooling, global CDN |
| **GitHub** | Version control | Code review, CI/CD triggers, collaboration |

### Why This Stack?

1. **Full-Stack TypeScript** - Same language di frontend & backend
2. **Serverless Architecture** - No server management, auto-scaling
3. **Developer Experience** - Hot reload, TypeScript IntelliSense, modern tooling
4. **Production Ready** - Battle-tested stack, used by many companies
5. **Cost Effective** - Free tiers untuk development, pay-as-you-grow

---

## 🏗 Arsitektur Aplikasi

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
├──────────────────────────────────┬──────────────────────────────────────────┤
│         Admin Dashboard          │           Mobile Application             │
│         (Next.js SSR/CSR)        │           (Android - React Native)       │
│                                  │                                          │
│  - Employee Management           │  - Face Scanner (Camera API)             │
│  - Attendance Reports            │  - Check-in/Check-out                    │
│  - Work Location Setup           │  - Attendance History                    │
│  - Device Management             │  - GPS Location Tracking                 │
│  - Face Enrollment               │  - Offline Support (coming soon)         │
└──────────────────────────────────┴──────────────────────────────────────────┘
                                            │
                                            ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MIDDLEWARE LAYER                                  │
│                         (src/middleware.ts)                                  │
│                                                                              │
│  - Session Management (Cookie-based for Web)                                 │
│  - Authentication Check                                                      │
│  - Route Protection                                                          │
│  - Request/Response Logging                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                   ┌────────────────────────┴────────────────────────┐
                   ▼                                                 ▼
┌──────────────────────────────────┐       ┌──────────────────────────────────┐
│      ADMIN API ROUTES            │       │       MOBILE API ROUTES          │
│      /api/*                      │       │       /api/mobile/*              │
│                                  │       │                                  │
│  - Cookie-based Auth             │       │  - Bearer Token Auth (JWT)       │
│  - CRUD Operations               │       │  - Face Recognition              │
│  - File Uploads                  │       │  - Geofencing Validation         │
│  - Reporting                     │       │  - Attendance Logging            │
└──────────────────────────────────┘       └──────────────────────────────────┘
                   │                                                 │
                   └────────────────────────┬────────────────────────┘
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BUSINESS LOGIC LAYER                              │
│                            (src/lib/*)                                       │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Auth Logic    │  │  Face Logic     │  │  Validation     │            │
│  │   (JWT, Hash)   │  │  (Identify)     │  │  (Zod Schemas)  │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │  Geofencing     │  │  Image Upload   │  │  API Response   │            │
│  │  (Haversine)    │  │  (Supabase)     │  │  (Helpers)      │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA ACCESS LAYER                                 │
│                       (Supabase Client Wrappers)                             │
│                                                                              │
│  - Supabase JS Client (Browser)                                              │
│  - Supabase Admin Client (Server-side)                                       │
│  - Connection Pooling                                                        │
│  - Query Optimization                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                    │
│                       PostgreSQL 15 + pgvector                               │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   profiles   │  │  employees   │  │face_templates│  │  devices     │   │
│  │              │  │              │  │              │  │              │   │
│  │ (Admin      │  │ (Karyawan)   │  │ (Embedding)  │  │ (Android)    │   │
│  │  Users)      │  │              │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │work_locations│  │attendance_log│  │mobile_session│                      │
│  │              │  │              │  │              │                      │
│  │ (Geofence)   │  │ (Check-in/   │  │ (JWT Tokens) │                      │
│  │              │  │  Check-out)  │  │              │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                              │
│  RPC Functions:                                                              │
│  - face_identify_v1() → Vector similarity search                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STORAGE LAYER                                     │
│                       (Supabase Storage Buckets)                             │
│                                                                              │
│  - attendance-proof-images/  → Foto bukti check-in/out                       │
│  - face-enrollment-photos/   → Foto saat enroll wajah                        │
│  - employee-avatars/         → Foto profil karyawan                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Check-In

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 1: Mobile App - User Action                                        │
└──────────────────────────────────────────────────────────────────────────┘
   │
   │  Karyawan tap "Check In" → Camera opens → Scan face
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 2: Client-Side Processing                                          │
└──────────────────────────────────────────────────────────────────────────┘
   │
   │  - Face Detection (face-api.js)
   │  - Generate 128-dimensional embedding
   │  - Liveness check (blink detection, etc.)
   │  - Get GPS coordinates
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 3: API Request                                                     │
│  POST /api/mobile/attendance/check-in                                    │
│  Headers: { Authorization: "Bearer <JWT>" }                              │
│  Body: {                                                                 │
│    deviceId,                                                             │
│    payload: { embedding: [128 numbers] },                                │
│    latitude, longitude,                                                  │
│    clientCaptureId, capturedAt                                           │
│  }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 4: Middleware (SKIP for /api/mobile/*)                             │
└──────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 5: API Route Handler                                               │
│  (src/app/api/mobile/attendance/check-in/route.ts)                       │
└──────────────────────────────────────────────────────────────────────────┘
   │
   ├─► 1. Verify JWT (requireMobileAuth)
   │      - Check signature
   │      - Check expiry
   │      - Extract employee_id & device_id
   │
   ├─► 2. Validate Input (Zod schema)
   │      - Check required fields
   │      - Validate data types
   │      - Sanitize inputs
   │
   ├─► 3. Device Validation
   │      - Device ID di token == Device ID di body?
   │      - Device masih active?
   │
   ├─► 4. Face Identification
   │      - Call identifyFace(embedding)
   │      - Vector similarity search di database
   │      - Score > threshold?
   │      - Employee ID match dengan JWT?
   │
   ├─► 5. Idempotency Check
   │      - clientCaptureId sudah ada?
   │      - Return existing record (prevent duplicate)
   │
   ├─► 6. Business Logic Check
   │      - Sudah check-in hari ini?
   │      - Belum check-out dari check-in sebelumnya?
   │
   ├─► 7. Geofencing Validation
   │      - Get employee's work location
   │      - Calculate distance (Haversine formula)
   │      - Distance < radius?
   │
   ├─► 8. Save to Database
   │      - Insert to attendance_logs table
   │      - Save proof image to Storage (jika ada)
   │      - Update employee last_seen
   │
   └─► 9. Return Response
          - Success message
          - Attendance record
          - Next action (Check-out available?)
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 6: Response to Mobile                                              │
│  {                                                                        │
│    "data": {                                                              │
│      "id": "attendance-uuid",                                             │
│      "attendanceType": "CHECK_IN",                                        │
│      "timestamp": "2026-01-14T08:30:00Z",                                 │
│      "matchScore": 0.15,                                                  │
│      "withinGeofence": true                                               │
│    }                                                                      │
│  }                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 7: Mobile App - Update UI                                          │
│  - Show success message                                                   │
│  - Update attendance status                                               │
│  - Enable "Check Out" button                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                          │
│                    (Global CDN + Edge Functions)                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                     Next.js Application                     │    │
│  │                                                             │    │
│  │  - Static Pages (Pre-rendered at build)                    │    │
│  │  - Server Components (Rendered on-demand)                  │    │
│  │  - API Routes (Serverless Functions)                       │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ Secure Connection
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD                                │
│                    (Database + Storage + Auth)                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              PostgreSQL Database                          │      │
│  │              - Connection Pooling                         │      │
│  │              - Automatic Backups                          │      │
│  │              - Point-in-time Recovery                     │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Object Storage (S3-compatible)               │      │
│  │              - Image Optimization                         │      │
│  │              - CDN Caching                                │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
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

### 1. Face Recognition Login 🔐

**Teknologi:**
- Face detection: **face-api.js** (TensorFlow.js based)
- Model: MobileNetV1 + FaceLandmark68Net
- Embedding extraction: 128-dimensional vector
- Distance metric: Cosine distance

**Flow Detail:**

```typescript
// 1. Di Mobile App (Client-side)
async function captureFaceEmbedding() {
  const video = await navigator.mediaDevices.getUserMedia({ video: true })
  
  // Load models
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  
  // Detect face
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  
  // Extract embedding (128 numbers)
  const embedding = Array.from(detection.descriptor)
  
  return embedding // [0.142, -0.089, ..., 0.098]
}

// 2. Di Server (Face Matching)
// src/lib/face/identify.ts
export async function identifyFace(embedding: number[]) {
  const supabase = createAdminSupabaseClient()
  
  // Convert to vector format for PostgreSQL
  const embeddingVector = `[${embedding.join(',')}]`
  
  // Call RPC function (vector similarity search)
  const { data, error } = await supabase.rpc('face_identify_v1', {
    query_embedding: embeddingVector,
    match_threshold: 0.80,  // Threshold: 0 (exact match) to 2 (very different)
    match_count: 1,         // Return top 1 match
  })
  
  // Returns employee with highest similarity score
  return data[0] // { employee_id, score }
}
```

**Database RPC Function:**

```sql
-- PostgreSQL function for face matching
CREATE OR REPLACE FUNCTION face_identify_v1(
  query_embedding vector(128),
  match_threshold float8 DEFAULT 0.80,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  employee_id uuid,
  score float8
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.employee_id,
    (1 - (ft.embedding <=> query_embedding)) as score
  FROM face_templates ft
  INNER JOIN employees e ON e.id = ft.employee_id
  WHERE 
    ft.is_active = true 
    AND e.is_active = true
    AND (1 - (ft.embedding <=> query_embedding)) >= match_threshold
  ORDER BY ft.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

**Operator Explanation:**
- `<=>` = Cosine distance operator (dari pgvector)
- `1 - distance` = Convert distance to similarity score
- Makin tinggi score = makin mirip
- Threshold 0.80 = Minimum 80% similarity

**Security Features:**
- Liveness detection (detect fake photos)
- One-time capture ID (prevent replay attacks)
- Timestamp validation (max 2 minutes skew)
- Device binding (prevent token stealing)

---

### 2. Geofencing 📍

**Purpose:** Pastikan karyawan check-in/out dari lokasi yang benar

**Flow:**

```typescript
// 1. Setup Work Location (Admin)
const workLocation = {
  name: "Kantor Pusat",
  address: "Jl. Sudirman No. 123, Jakarta",
  latitude: -6.2088,
  longitude: 106.8456,
  radius_meters: 100  // 100 meter radius
}

// 2. Validation saat Check-in (Server)
function validateGeofence(
  checkInLat: number,
  checkInLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number
): boolean {
  // Haversine formula - calculate distance between two coordinates
  const R = 6371e3 // Earth radius in meters
  const φ1 = (checkInLat * Math.PI) / 180
  const φ2 = (locationLat * Math.PI) / 180
  const Δφ = ((locationLat - checkInLat) * Math.PI) / 180
  const Δλ = ((locationLon - checkInLon) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = R * c // Distance in meters
  
  console.log(`Distance from office: ${distance.toFixed(2)}m (max: ${radiusMeters}m)`)
  
  return distance <= radiusMeters
}

// Example:
validateGeofence(
  -6.2089, 106.8457,  // User location
  -6.2088, 106.8456,  // Office location
  100                 // 100m radius
)
// → Returns true (15m away, within 100m radius)
```

**Visualization:**

```
         Office Location (Center)
                  ●
               /     \
            /           \
         /                 \
      /        100m          \
     |        Radius          |
      \                     /
         \               /
            \         /  ✅ User (15m away)
               \   / ●
                 ●
              ❌ User (150m away)
```

**Error Handling:**
- GPS tidak available? → Reject check-in
- Accuracy terlalu rendah? → Warning to user
- Di luar radius? → Show distance & office location

---

### 3. Device Management 📱

**Auto-Registration Flow:**

```typescript
// First-time face-login from new device
POST /api/mobile/auth/face-login
{
  "deviceId": "android-abc123",
  "model": "Samsung Galaxy S21",
  "os": "Android 13",
  "embedding": [...]
}

// Server checks:
const device = await checkDeviceActive(input.deviceId)

if (!device) {
  // Device not registered yet → Auto-register
  const newDevice = await supabase
    .from('devices')
    .insert({
      device_id: input.deviceId,
      label: `${input.model} - Auto Registered`,
      device_model: input.model,
      os_version: input.os,
      is_active: true,
      last_seen_at: new Date(),
    })
    .select()
    .single()
  
  console.log('New device registered:', newDevice.id)
}
```

**Device Info Tracking:**
- `device_model`: "Samsung Galaxy S21", "iPhone 14 Pro"
- `os_version`: "Android 13", "iOS 17.2"
- `manufacturer`: "Samsung", "Apple"
- `app_version`: "1.2.3"
- `last_seen_at`: Last login timestamp

**Admin Controls:**
- Enable/Disable device remotely
- View all devices per employee
- Revoke access from compromised devices
- Track device usage statistics

---

### 4. Map Picker (Work Location) 🗺

**Features:**
- Interactive map powered by **OpenStreetMap**
- Search location by address (Geocoding)
- Click to select coordinates
- GPS auto-detect current location
- IP-based fallback (if GPS fails)

**Implementation:**

```typescript
// Component: src/components/ui/map-picker.tsx

// 1. Get current location with fallback
async function getCurrentLocation(): Promise<Coordinates> {
  try {
    // Try GPS first (High accuracy)
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    }
  } catch (gpsError) {
    // Fallback to IP-based location
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    return {
      latitude: data.latitude,
      longitude: data.longitude,
    }
  }
}

// 2. Reverse Geocoding (Coordinates → Address)
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  const response = await fetch(url)
  const data = await response.json()
  return data.display_name
}

// 3. Forward Geocoding (Address → Coordinates)
async function searchLocation(query: string): Promise<SearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
  const response = await fetch(url)
  const data = await response.json()
  return data.map(item => ({
    name: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }))
}
```

**Why OpenStreetMap?**
- ✅ FREE (no API key needed)
- ✅ No usage limits for reasonable use
- ✅ Open-source community
- ❌ Cons: Less accurate than Google Maps in some areas

---

### 5. Attendance History & Reports 📊

**Mobile App - Personal History:**

```typescript
GET /api/mobile/attendance/history?page=1&limit=20&from=2026-01-01&to=2026-01-31

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "CHECK_IN",
      "timestamp": "2026-01-14T08:30:00Z",
      "matchScore": 0.15,
      "livenessScore": 0.95,
      "latitude": -6.2089,
      "longitude": 106.8457,
      "proofImageUrl": "https://...", // Signed URL (expires in 1 hour)
      "note": null
    },
    {
      "id": "uuid",
      "type": "CHECK_OUT",
      "timestamp": "2026-01-14T17:45:00Z",
      // ...
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

**Admin Dashboard - All Employees:**

```typescript
GET /api/attendance?page=1&limit=50&employeeId=uuid&type=CHECK_IN&startDate=2026-01-01&endDate=2026-01-31

// Filters available:
- employeeId: Filter by specific employee
- type: CHECK_IN or CHECK_OUT
- startDate / endDate: Date range
- sortBy: timestamp, employee_name
- sortDir: asc, desc
```

**Features:**
- Export to CSV/Excel
- Daily/Weekly/Monthly reports
- Late check-in detection
- Missing check-out alerts
- Work hours calculation

---

---

## � Code Deep Dive

### API Route Structure

**Pattern:**
```
src/app/api/[resource]/[...segments]/route.ts
```

**Example: Employee CRUD**

```typescript
// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { successResponse, errors } from '@/lib/api/response'
import { createEmployeeSchema } from '@/lib/validators/employee'

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const isActive = searchParams.get('isActive') // 'true', 'false', or 'all'
    const search = searchParams.get('q') || ''

    const supabase = createAdminSupabaseClient()

    // Build query
    let query = supabase
      .from('employees')
      .select('*, work_location:work_locations(*)', { count: 'exact' })

    // Apply filters
    if (isActive !== 'all' && isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`)
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      meta: {
        requestId: crypto.randomUUID(),
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    })
  } catch (error) {
    console.error('List employees error:', error)
    return errors.internalError()
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = createEmployeeSchema.safeParse(body)
    if (!result.success) {
      return validationErrorResponse(result.error)
    }

    const input = result.data
    const supabase = createAdminSupabaseClient()

    // Check if employee_id already exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', input.employeeId)
      .single()

    if (existing) {
      return errors.conflict('Employee ID already exists')
    }

    // Insert employee
    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_id: input.employeeId,
        full_name: input.fullName,
        email: input.email,
        phone_number: input.phoneNumber,
        department: input.department,
        job_title: input.jobTitle,
        work_location_id: input.workLocationId,
        is_active: input.isActive ?? true,
      })
      .select('*, work_location:work_locations(*)')
      .single()

    if (error) throw error

    return NextResponse.json(
      successResponse(data),
      { status: 201 }
    )
  } catch (error) {
    console.error('Create employee error:', error)
    return errors.internalError()
  }
}
```

**Dynamic Routes:**

```typescript
// src/app/api/employees/[id]/route.ts

// GET /api/employees/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const employeeId = params.id
  
  // ... fetch employee by ID
}

// PUT /api/employees/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const employeeId = params.id
  const body = await request.json()
  
  // ... update employee
}

// DELETE /api/employees/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const employeeId = params.id
  
  // ... delete employee (hard delete with CASCADE)
}
```

---

### Authentication Implementation

#### Admin Auth (Cookie-based JWT)

```typescript
// src/lib/auth/admin.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const TOKEN_NAME = 'admin_token'
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function createAdminToken(userId: string, email: string) {
  const token = await new SignJWT({
    sub: userId,
    email: email,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,     // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',    // CSRF protection
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  })
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token.value, JWT_SECRET)
    return {
      userId: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    console.error('JWT verify error:', error)
    return null
  }
}

export async function clearAdminCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}
```

**Usage in API:**

```typescript
// src/app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  // Verify credentials with Supabase Auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return errors.unauthorized('Invalid credentials')
  }

  // Create JWT and set cookie
  const token = await createAdminToken(data.user.id, data.user.email!)
  await setAdminCookie(token)

  return successResponse({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  })
}
```

#### Mobile Auth (Bearer Token JWT)

```typescript
// src/lib/auth/mobileJwt.ts
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export interface MobileTokenPayload {
  sub: string           // employee_id
  deviceIdString: string
  deviceId: string      // device UUID
  type: 'access' | 'refresh'
}

export async function generateTokenPair(
  employeeId: string,
  deviceIdString: string,
  deviceId: string
) {
  // Access token (15 minutes)
  const accessToken = await new SignJWT({
    sub: employeeId,
    deviceIdString,
    deviceId,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET)

  // Refresh token (7 days)
  const refreshToken = await new SignJWT({
    sub: employeeId,
    deviceIdString,
    deviceId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return { accessToken, refreshToken }
}

export async function verifyMobileToken(
  token: string
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as MobileTokenPayload
  } catch (error) {
    return null
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

**Auth Guard for Mobile APIs:**

```typescript
// src/lib/auth/mobileGuard.ts
import { NextRequest } from 'next/server'
import { verifyMobileToken } from './mobileJwt'
import { errors } from '@/lib/api/response'

export async function requireMobileAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw errors.unauthorized('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7) // Remove 'Bearer '
  const payload = await verifyMobileToken(token)

  if (!payload || payload.type !== 'access') {
    throw errors.unauthorized('Invalid or expired token')
  }

  return payload
}

export function validateDeviceMatch(
  tokenDeviceId: string,
  requestDeviceId: string
) {
  if (tokenDeviceId !== requestDeviceId) {
    throw errors.forbidden('Device ID mismatch')
  }
}
```

**Usage:**

```typescript
// src/app/api/mobile/attendance/check-in/route.ts
export async function POST(request: NextRequest) {
  // 1. Verify token & get payload
  const payload = await requireMobileAuth(request)
  // payload: { sub: employee_id, deviceIdString, deviceId, type: 'access' }

  const body = await request.json()

  // 2. Validate device match
  validateDeviceMatch(payload.deviceIdString, body.deviceId)

  // 3. Process check-in...
}
```

---

### Validation with Zod

**Schema Definition:**

```typescript
// src/lib/validators/employee.ts
import { z } from 'zod'

export const createEmployeeSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .max(50, 'Employee ID too long')
    .regex(/^[A-Z0-9-]+$/, 'Employee ID must be uppercase alphanumeric with dashes'),
  
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Full name too long')
    .trim(),
  
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .nullable(),
  
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  
  department: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  jobTitle: z
    .string()
    .max(100)
    .optional()
    .nullable(),
  
  workLocationId: z
    .string()
    .uuid('Invalid work location ID')
    .optional()
    .nullable(),
  
  isActive: z
    .boolean()
    .default(true),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

// Type inference
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
```

**Usage in API:**

```typescript
import { createEmployeeSchema } from '@/lib/validators/employee'
import { validationErrorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate with Zod
  const result = createEmployeeSchema.safeParse(body)

  if (!result.success) {
    // Return formatted error response
    return validationErrorResponse(result.error)
    // Response:
    // {
    //   "error": {
    //     "code": "VALIDATION_ERROR",
    //     "message": "Validation failed",
    //     "details": {
    //       "employeeId": ["Employee ID is required"],
    //       "email": ["Invalid email format"]
    //     }
    //   }
    // }
  }

  const input = result.data // Type-safe!
  // TypeScript knows: input.employeeId is string, input.isActive is boolean, etc.

  // ... process request
}
```

**Complex Validation:**

```typescript
// src/lib/validators/attendance.ts
export const mobileAttendanceSchema = z.object({
  deviceId: z.string().min(1),
  
  clientCaptureId: z.string().min(1),
  
  capturedAt: z.string().datetime(),
  
  payload: z.object({
    type: z.literal('EMBEDDING_V1'),
    embedding: z
      .array(z.number())
      .length(128, 'Embedding must be exactly 128 dimensions'),
  }),
  
  liveness: z.object({
    provided: z.boolean(),
    score: z.number().min(0).max(1).optional(),
  }),
  
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .nullable(),
  
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .nullable(),
  
  proofImageBase64: z
    .string()
    .regex(/^data:image\/(jpeg|jpg|png);base64,/, 'Invalid image format')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    // Custom validation: If liveness.provided is true, score must exist
    if (data.liveness.provided && data.liveness.score === undefined) {
      return false
    }
    return true
  },
  {
    message: 'Liveness score is required when liveness is provided',
    path: ['liveness', 'score'],
  }
)
```

---

### Supabase Client Patterns

**Two Types of Clients:**

```typescript
// 1. Browser Client (Client Components)
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 2. Admin Client (Server-side, API Routes)
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Bypass RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**When to use which:**

| Client Type | Use Case | Auth | RLS |
|-------------|----------|------|-----|
| Browser Client | Client Components, User actions | User JWT | ✅ Enforced |
| Admin Client | API Routes, Server Components | Service Role | ❌ Bypassed |

**Common Patterns:**

```typescript
// Pattern 1: Simple SELECT
const { data, error } = await supabase
  .from('employees')
  .select('*')
  .eq('is_active', true)
  .order('full_name', { ascending: true })

// Pattern 2: SELECT with JOIN
const { data, error } = await supabase
  .from('attendance_logs')
  .select(`
    *,
    employee:employees(id, full_name, employee_id),
    device:devices(id, label)
  `)
  .eq('type', 'CHECK_IN')

// Pattern 3: INSERT with RETURNING
const { data, error } = await supabase
  .from('employees')
  .insert({ employee_id: 'EMP001', full_name: 'John Doe' })
  .select()
  .single()

// Pattern 4: UPDATE
const { error } = await supabase
  .from('employees')
  .update({ is_active: false })
  .eq('id', employeeId)

// Pattern 5: DELETE (Hard delete)
const { error } = await supabase
  .from('employees')
  .delete()
  .eq('id', employeeId)

// Pattern 6: RPC Function
const { data, error } = await supabase.rpc('face_identify_v1', {
  query_embedding: embeddingVector,
  match_threshold: 0.80,
  match_count: 1,
})

// Pattern 7: File Upload
const { data, error } = await supabase.storage
  .from('attendance-proof-images')
  .upload(`${employeeId}/${filename}`, file, {
    contentType: 'image/jpeg',
    upsert: false,
  })

// Pattern 8: Get Signed URL
const { data } = await supabase.storage
  .from('attendance-proof-images')
  .createSignedUrl(filePath, 3600) // 1 hour expiry
```

---

### Error Handling Pattern

**Centralized Error Responses:**

```typescript
// src/lib/api/response.ts
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export function successResponse<T>(data: T, meta?: Record<string, unknown>) {
  return {
    data,
    meta: {
      requestId: crypto.randomUUID(),
      ...meta,
    },
  }
}

export function validationErrorResponse(zodError: ZodError) {
  const details: Record<string, string[]> = {}
  
  zodError.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!details[path]) {
      details[path] = []
    }
    details[path].push(err.message)
  })

  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    },
    { status: 400 }
  )
}

export const errors = {
  unauthorized: (message = 'Unauthorized') =>
    NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message } },
      { status: 401 }
    ),

  forbidden: (message = 'Forbidden') =>
    NextResponse.json(
      { error: { code: 'FORBIDDEN', message } },
      { status: 403 }
    ),

  notFound: (resource = 'Resource') =>
    NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `${resource} not found` } },
      { status: 404 }
    ),

  conflict: (message = 'Resource already exists') =>
    NextResponse.json(
      { error: { code: 'CONFLICT', message } },
      { status: 409 }
    ),

  faceNotRecognized: () =>
    NextResponse.json(
      {
        error: {
          code: 'FACE_NOT_RECOGNIZED',
          message: 'Face not recognized or match score too low',
        },
      },
      { status: 401 }
    ),

  internalError: (message = 'Internal server error') =>
    NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    ),
}
```

**Usage:**

```typescript
export async function POST(request: NextRequest) {
  try {
    // ... business logic

    if (!employee) {
      return errors.notFound('Employee')
    }

    if (score < threshold) {
      return errors.faceNotRecognized()
    }

    return NextResponse.json(successResponse(data))
  } catch (error) {
    console.error('API Error:', error)
    return errors.internalError()
  }
}
```

---

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
