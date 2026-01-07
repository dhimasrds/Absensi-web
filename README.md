# Employee Attendance System - Phase 1This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



A complete employee attendance management system built with Next.js 16, Supabase, and shadcn/ui.## Getting Started



## 🎯 FeaturesFirst, run the development server:



### Web Admin Dashboard```bash

- **Dashboard** - Overview with employee counts, device stats, and recent attendancenpm run dev

- **Employee Management** - CRUD operations with search and pagination# or

- **Device Management** - Register, update, and deactivate attendance devicesyarn dev

- **Attendance Records** - View all attendance with filters and proof images# or

pnpm dev

### Mobile API (Backend)# or

- **Face Login** - Authenticate employees using face recognitionbun dev

- **Token Management** - JWT access/refresh token flow```

- **Check-in/Check-out** - Record attendance with idempotency support

- **Attendance History** - Query personal attendance recordsOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.



## 🛠️ Tech StackYou can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.



- **Framework**: Next.js 16.1.1 (App Router)This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

- **Database**: Supabase (PostgreSQL)

- **Authentication**: Supabase Auth (Admin) + Custom JWT (Mobile)## Learn More

- **UI Components**: shadcn/ui

- **Styling**: Tailwind CSSTo learn more about Next.js, take a look at the following resources:

- **Validation**: Zod

- **Face Recognition**: pgvector (128-dimensional embeddings)- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## 📁 Project Structure

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

```

src/## Deploy on Vercel

├── app/

│   ├── (admin)/                 # Admin pages (protected)The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

│   │   ├── dashboard/

│   │   ├── employees/Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

│   │   ├── devices/
│   │   └── attendance/
│   ├── (auth)/                  # Auth pages
│   │   └── login/
│   └── api/
│       ├── employees/           # Employee CRUD API
│       ├── devices/             # Device CRUD API
│       ├── attendance/          # Attendance list API
│       └── mobile/              # Mobile endpoints
│           ├── auth/
│           │   ├── face-login/
│           │   ├── refresh/
│           │   └── logout/
│           ├── attendance/
│           │   ├── check-in/
│           │   ├── check-out/
│           │   └── history/
│           ├── me/
│           └── upload-url/
├── components/
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── api/                     # API response helpers
│   ├── auth/                    # Auth guards & JWT utilities
│   ├── face/                    # Face identification
│   ├── supabase/               # Supabase clients
│   └── validators/             # Zod schemas
└── sql/                         # Database migrations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_JWT_SECRET=your-jwt-secret-min-32-chars
```

3. Run database migrations in Supabase SQL Editor:
- `sql/001_schema.sql` - Tables and indexes
- `sql/002_rls.sql` - Row Level Security
- `sql/003_rpc_face_identify.sql` - Face identification RPC
- `sql/004_storage_bucket.sql` - Storage bucket for proofs
- `sql/005_seed_data.sql` - Sample data (optional)

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:3000/login

### Default Admin Credentials
```
Email: admin@company.com
Password: admin123456
```

## 📡 API Endpoints

### Admin APIs (Requires Supabase Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee |
| PUT | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Delete employee |
| POST | `/api/employees/[id]/face/enroll` | Enroll face template |
| GET | `/api/devices` | List devices |
| POST | `/api/devices` | Register device |
| GET | `/api/devices/[id]` | Get device |
| PUT | `/api/devices/[id]` | Update device |
| DELETE | `/api/devices/[id]` | Delete device |
| GET | `/api/attendance` | List attendance |
| GET | `/api/attendance/[id]` | Get attendance |
| GET | `/api/attendance/[id]/proof-url` | Get proof image URL |

### Mobile APIs (Requires JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mobile/auth/face-login` | Login with face |
| POST | `/api/mobile/auth/refresh` | Refresh token |
| POST | `/api/mobile/auth/logout` | Logout (revoke token) |
| GET | `/api/mobile/me` | Get current user |
| POST | `/api/mobile/upload-url` | Get upload URL |
| POST | `/api/mobile/attendance/check-in` | Record check-in |
| POST | `/api/mobile/attendance/check-out` | Record check-out |
| GET | `/api/mobile/attendance/history` | Get history |

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Admin Guard** - Verify admin role for protected endpoints
- **Mobile Guard** - Verify JWT for mobile endpoints
- **Anti-Replay** - `clientCaptureId` prevents duplicate submissions
- **Capture Staleness** - Reject captures older than 60 seconds
- **Hashed Refresh Tokens** - bcrypt hashed in database

## 📱 Mobile App Integration

### Face Login Flow
1. Capture face image on device
2. Generate 128-dimension embedding
3. POST to `/api/mobile/auth/face-login` with:
   - `deviceUniqueId`
   - `embedding` (128-dim array)
   - `capturedAt` (ISO timestamp)
4. Receive `accessToken` and `refreshToken`
5. Use `accessToken` in `Authorization: Bearer <token>` header

### Check-in Flow
1. Capture face image
2. Upload to signed URL (from `/api/mobile/upload-url`)
3. POST to `/api/mobile/attendance/check-in` with:
   - `deviceId`
   - `clientCaptureId` (unique per capture)
   - `capturedAt`
   - `proofImagePath`

## 📄 License

MIT
