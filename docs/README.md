# 📚 Documentation Index

## Employee Attendance System - Phase 1

Dokumentasi lengkap untuk setiap milestone dalam pengembangan sistem absensi karyawan.

---

## 📖 Milestone Documentation

| # | Milestone | Description | File |
|---|-----------|-------------|------|
| 1 | **Database Setup** | Schema, RLS, RPC, Storage Bucket | [MILESTONE-1-DATABASE.md](./MILESTONE-1-DATABASE.md) |
| 2 | **Admin Auth** | Supabase Auth, Middleware, Guards | [MILESTONE-2-ADMIN-AUTH.md](./MILESTONE-2-ADMIN-AUTH.md) |
| 3 | **Admin APIs** | CRUD Employees & Devices | [MILESTONE-3-ADMIN-APIS.md](./MILESTONE-3-ADMIN-APIS.md) |
| 4 | **Mobile Auth** | Face Login, JWT Tokens | [MILESTONE-4-MOBILE-AUTH.md](./MILESTONE-4-MOBILE-AUTH.md) |
| 5 | **Attendance APIs** | Upload URL, Check-in/out | [MILESTONE-5-ATTENDANCE-APIS.md](./MILESTONE-5-ATTENDANCE-APIS.md) |
| 6 | **Admin Attendance** | List & View Attendance | [MILESTONE-6-ADMIN-ATTENDANCE.md](./MILESTONE-6-ADMIN-ATTENDANCE.md) |
| 7 | **Web UI** | Dashboard dengan shadcn/ui | [MILESTONE-7-WEB-UI.md](./MILESTONE-7-WEB-UI.md) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Login Page  │  │  Dashboard  │  │ Employee/Device/Attend  │ │
│  │  (Auth)     │  │  (Stats)    │  │     (CRUD Tables)       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                        Backend (API)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Admin APIs     │  │  Mobile APIs    │  │  Auth APIs      │ │
│  │  /api/employees │  │  /api/mobile/*  │  │  /auth/callback │ │
│  │  /api/devices   │  │  (JWT Auth)     │  │  (Supabase)     │ │
│  │  /api/attendance│  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                        Database (Supabase)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  employees  │  │  devices    │  │  attendance_logs        │ │
│  │  profiles   │  │  sessions   │  │  face_templates         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  RPC: face_identify_v1 | Storage: attendance-proofs        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Features

### Admin Dashboard
- ✅ Supabase Authentication
- ✅ Dashboard dengan statistik
- ✅ CRUD Employees
- ✅ CRUD Devices
- ✅ View Attendance Records
- ✅ View Proof Images

### Mobile API
- ✅ Face Recognition Login
- ✅ JWT Token Management
- ✅ Check-in/Check-out
- ✅ Attendance History
- ✅ Idempotency Support

### Security
- ✅ Row Level Security (RLS)
- ✅ Anti-Replay Protection
- ✅ Device Binding
- ✅ Session Management
- ✅ Hashed Refresh Tokens

---

## 📁 Project Structure

```
Absensi-web/
├── src/
│   ├── app/
│   │   ├── (admin)/          # Protected admin pages
│   │   ├── (auth)/           # Auth pages
│   │   └── api/              # API routes
│   ├── components/
│   │   └── ui/               # shadcn/ui components
│   └── lib/
│       ├── api/              # Response helpers
│       ├── auth/             # Auth utilities
│       ├── face/             # Face identification
│       ├── supabase/         # Supabase clients
│       └── validators/       # Zod schemas
├── sql/                      # Database migrations
├── docs/                     # Documentation (you are here)
└── README.md                 # Quick start guide
```

---

## 🚀 Quick Start

1. **Setup Database**: Jalankan SQL migrations di Supabase
   - [MILESTONE-1-DATABASE.md](./MILESTONE-1-DATABASE.md)

2. **Configure Environment**: Setup `.env.local`
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   APP_JWT_SECRET=...
   ```

3. **Run Development Server**:
   ```bash
   npm install
   npm run dev
   ```

4. **Access Admin**:
   - URL: http://localhost:3000/login
   - Email: admin@company.com
   - Password: admin123456

---

## 📡 API Quick Reference

### Admin Endpoints
| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST | /api/employees | Supabase |
| GET/PUT/DELETE | /api/employees/[id] | Supabase |
| POST | /api/employees/[id]/face/enroll | Supabase |
| GET/POST | /api/devices | Supabase |
| GET/PUT/DELETE | /api/devices/[id] | Supabase |
| GET | /api/attendance | Supabase |
| GET | /api/attendance/[id]/proof-url | Supabase |

### Mobile Endpoints
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/mobile/auth/face-login | None |
| POST | /api/mobile/auth/refresh | None |
| POST | /api/mobile/auth/logout | None |
| GET | /api/mobile/me | JWT |
| POST | /api/mobile/upload-url | JWT |
| POST | /api/mobile/attendance/check-in | JWT |
| POST | /api/mobile/attendance/check-out | JWT |
| GET | /api/mobile/attendance/history | JWT |

---

## 🛠️ Tech Stack Summary

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth (Admin) | Supabase Auth |
| Auth (Mobile) | Custom JWT |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Validation | Zod |
| Face Recognition | pgvector |

---

## 📞 Support

Untuk pertanyaan atau issues, silakan buka issue di repository.
