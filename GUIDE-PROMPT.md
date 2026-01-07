Kamu adalah AI engineer yang bertugas membangun sistem ABSENSI KARYAWAN Phase 1.
Target utama: WEB ADMIN + BACKEND/API + DATABASE berjalan stabil dan siap dipakai Android.
WAJIB mengikuti urutan milestone dan spesifikasi di bawah. Jangan loncat.

====================================================
0) OUTPUT RULES (WAJIB)
====================================================
- Kerjakan berurutan berdasarkan MILESTONE 1..7.
- Setiap milestone harus menghasilkan:
  (1) daftar file yang dibuat/diubah,
  (2) kode inti (route handler/komponen) yang lengkap untuk milestone tersebut,
  (3) cara menjalankan & test (curl/steps),
  (4) catatan keamanan/assumption.
- Semua UI Web Admin WAJIB menggunakan shadcn/ui (bukan raw HTML).
- Semua API harus pakai Zod validation + error format konsisten.

====================================================
1) SCOPE & GOAL
====================================================
Phase 1 wajib selesai:
A. Web Admin (Next.js)
- Login admin (Supabase Auth)
- Dashboard ringkas
- CRUD employees
- CRUD devices (whitelist)
- Attendance history list + filter + pagination
- Menampilkan foto bukti absensi (signed URL)

B. Backend/API (Next.js Route Handlers)
- Admin APIs: employees, devices, attendance list, proof-image signed URL
- Mobile APIs:
  - Face Identify login (OpenCV embedding) -> keluarkan App JWT (access + refresh)
  - Refresh + logout + /mobile/me
  - Generate signed upload URL untuk foto bukti
  - Attendance check-in/out (idempotent, anti replay, open session rules)
  - Mobile history (karyawan hanya melihat miliknya)

C. Database & Storage (Supabase)
- Tables: profiles, employees, devices, face_templates, mobile_sessions, attendance_logs
- RLS untuk admin access
- Supabase Storage: bucket private attendance-proofs

Non-goals Phase 1:
- UI Android lengkap
- Liveness advanced
- GPS/geofencing, shift, payroll
- Multi-tenant

====================================================
2) TECH STACK (WAJIB)
====================================================
- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn/ui (WAJIB untuk UI)
- lucide-react (ikon)
- Zod validation
- Supabase JS client
- @supabase/ssr untuk web admin session
- jose untuk App JWT (HS256)
- bcryptjs untuk hash refresh token
- date-fns (tanggal)
- react-hook-form + @hookform/resolvers (form + zod)
- sonner (toast) (recommended)

Deploy: Vercel free tier

====================================================
3) SHADCN/UI SETUP (WAJIB) + KOMPONEN YANG HARUS DI-ADD
====================================================
Agent harus menuliskan langkah setup ini di README dan menggunakannya di UI:

A) Init:
- npx shadcn@latest init

B) Add components MINIMAL (WAJIB):
- npx shadcn@latest add button card input label table dialog dropdown-menu select switch separator popover calendar badge form

C) Optional (recommended):
- npx shadcn@latest add tabs skeleton

D) Tambahan:
- npm i lucide-react sonner react-hook-form @hookform/resolvers date-fns

Komponen shadcn per halaman (mapping WAJIB):
- /login: Card, Form, Input, Button
- /dashboard: Card, Badge, (Tabs optional)
- /employees: Card, Input, Table, Dialog, DropdownMenu, Switch, Badge, Form, Select(optional)
- /devices: Card, Input, Table, Dialog, DropdownMenu, Switch, Badge, Form
- /attendance: Card, Table, Badge, Select, Popover+Calendar (date range), Dialog, (Skeleton optional), DropdownMenu

====================================================
4) SECURITY PRINCIPLES (WAJIB)
====================================================
- Mobile tidak akses DB langsung untuk attendance insert.
- Mobile auth menggunakan App JWT (HS256), dihasilkan server.
- Attendance mobile: employeeId boleh dikirim opsional, tapi jika ada harus MATCH dengan token.sub. Jika beda: 403 EMPLOYEE_MISMATCH.
- deviceId dibinding di token dan harus match request. Jika beda: 403 DEVICE_MISMATCH.
- Idempotency: unique (device_id, client_capture_id) => anti double submit.
- Foto bukti private storage. Admin view via signed URL (bukan public URL).

====================================================
5) DATABASE SPEC (SUPABASE)
====================================================
A. Enums:
- attendance_type: CHECK_IN, CHECK_OUT
- attendance_source: WEB_ADMIN, ANDROID
- verification_method: FACE, MANUAL_ADMIN
- verification_status: VERIFIED, PENDING, REJECTED

B. Tables:
1) profiles:
- user_id uuid PK -> auth.users(id)
- role text default 'admin'

2) employees:
- id uuid PK
- employee_id text unique
- full_name text
- email text unique null
- department text null
- is_active boolean default true
- created_at, updated_at

3) devices:
- id uuid PK
- device_id text unique
- label text null
- is_active boolean default true

4) face_templates:
- id uuid PK
- employee_id uuid unique FK employees.id
- template_version int default 1
- embedding vector(128) (adjust dimension sesuai model)
- is_active boolean default true
- quality_score float null

5) mobile_sessions:
- id uuid PK
- employee_id uuid FK
- device_id uuid FK
- refresh_token_hash text
- expires_at timestamptz
- revoked_at timestamptz null

6) attendance_logs:
- id uuid PK
- employee_id uuid FK
- type attendance_type
- timestamp timestamptz
- source attendance_source
- device_id text null
- client_capture_id text null
- captured_at timestamptz null
- verification_method verification_method default FACE
- verification_status verification_status default VERIFIED
- match_score float null
- liveness_score float null
- note text null
- proof_image_path text null   <-- SIMPLE PHOTO FIELD
- proof_image_mime text null
- created_at timestamptz

Constraint:
- unique index (device_id, client_capture_id) where both not null
- index attendance_employee_ts (employee_id, timestamp desc)

C. RPC identify:
- face_identify_v1(query_embedding vector(128), match_threshold float, match_count int)
returns table(employee_id uuid, score float)
score = 1 - cosine_distance

D. RLS:
- is_admin() based on profiles.role=admin
- employees/devices/face_templates: admin ALL
- attendance_logs: admin SELECT (insert by server/service role)
- profiles: user can select own profile

Storage:
- Bucket private: attendance-proofs
- Path convention: attendance/YYYY-MM-DD/<EMPLOYEE_ID>/<clientCaptureId>.webp

====================================================
6) API CONTRACT (FINAL)
====================================================
Response standard:
Success: { data, meta:{requestId} }
Error: { error:{code,message,details?} }

Auth:
- Admin: Authorization Bearer supabase_access_token
- Mobile: Authorization Bearer app_access_token (JWT)

Admin APIs:
1) GET /api/employees?q&isActive&page&limit&sortBy&sortDir
2) POST /api/employees
   body: { employeeId, fullName, email?, department?, isActive? }
3) PUT /api/employees/:id (partial)
4) DELETE /api/employees/:id (soft delete isActive=false)

5) GET /api/devices
6) POST /api/devices
   body: { deviceId, label?, isActive? }
7) PUT /api/devices/:id
8) DELETE /api/devices/:id (soft)

9) GET /api/attendance?employeeId&from&to&type&source&page&limit&sortDir

10) GET /api/admin/attendance/:id/proof-image-url
   -> return signed download url { url, expiresIn }

Mobile APIs:
1) POST /api/mobile/auth/face-login (IDENTIFY)
 body:
 {
   deviceId, clientCaptureId, capturedAt,
   payload:{type:'EMBEDDING_V1', embedding:[...numbers...]},
   liveness:{provided:boolean, score:null|0..1},
   app:{version, platform:'android'}
 }
 rules: device active, anti replay, capturedAt not stale, score>=threshold
 resp: employee + session{accessToken,refreshToken,expiresIn}

2) POST /api/mobile/auth/refresh { refreshToken }
3) POST /api/mobile/auth/logout { refreshToken }
4) GET /api/mobile/me

5) POST /api/mobile/storage/attendance-proof/upload-url
 auth: mobile
 body: { clientCaptureId, mime:'image/webp' }
 resp: { path, uploadUrl, expiresIn }

Attendance (mobile):
6) POST /api/attendance/check-in
 auth: mobile
 body:
 {
  employeeId?:uuid,
  deviceId, clientCaptureId, capturedAt,
  verificationMethod:'FACE', matchScore:0..1,
  note?, proofImagePath?, proofImageMime?
 }
 rules:
 - if employeeId exists and != token.sub -> 403 EMPLOYEE_MISMATCH
 - deviceId must match token.deviceId -> 403 DEVICE_MISMATCH
 - unique(deviceId, clientCaptureId) -> 409 DUPLICATE_CAPTURE
 - open session exists -> 409 ALREADY_CHECKED_IN
7) POST /api/attendance/check-out (same, but requires open session else 409 NOT_CHECKED_IN)

8) GET /api/mobile/attendance?from&to&page&limit&type (only own data)

Enrollment (admin):
9) POST /api/employees/:id/face/enroll
 body: { templateVersion, payload:{type:'EMBEDDING_V1', embedding:[...]}, qualityScore? }

====================================================
7) WEB ADMIN UI WIREFRAME (WAJIB IKUTI)
====================================================
Global Layout (AppShell):
- Sidebar nav: Dashboard, Employees, Devices, Attendance
- HeaderBar: PageTitle + DropdownMenu(Profile/Logout)
- Content: Card-based layout

/login:
- Centered Card: Form(email,password) + Button
Components: Card, Form, Input, Button, Sonner toast

/dashboard:
- Grid 4 KPI Cards + 1 Card activity section
Components: Card, Badge (Tabs optional)

/employees:
- Card header: title + Add button
- Search input + filter active Select
- Table list + pagination
- Row actions dropdown (Edit, Activate/Deactivate)
- Add/Edit via Dialog form
Components: Card, Input, Select, Table, Dialog, DropdownMenu, Switch, Badge, Form, Button

/devices:
- Similar employees (CRUD via Dialog)
Components: Card, Input, Table, Dialog, DropdownMenu, Switch, Badge, Form

/attendance:
- Filter bar: Date range picker (Popover+Calendar), Select employee, Select type, Select source, Apply/Reset
- Table list + pagination
- Row action: View Photo -> Dialog modal, lazy-load signed URL
Components: Card, Popover, Calendar, Select, Table, Badge, Dialog, (Skeleton optional), DropdownMenu, Button

====================================================
8) PROJECT STRUCTURE (RECOMMENDED)
====================================================
app/
  (auth)/login/page.tsx
  (admin)/dashboard/page.tsx
  (admin)/employees/page.tsx
  (admin)/devices/page.tsx
  (admin)/attendance/page.tsx
  api/
    employees/route.ts
    employees/[id]/route.ts
    devices/route.ts
    devices/[id]/route.ts
    attendance/route.ts
    attendance/check-in/route.ts
    attendance/check-out/route.ts
    admin/attendance/[id]/proof-image-url/route.ts
    mobile/auth/face-login/route.ts
    mobile/auth/refresh/route.ts
    mobile/auth/logout/route.ts
    mobile/me/route.ts
    mobile/attendance/route.ts
    mobile/storage/attendance-proof/upload-url/route.ts
    employees/[id]/face/enroll/route.ts
components/
  AppShell.tsx
  PageHeader.tsx
  PaginationBar.tsx
  ConfirmDialog.tsx
  AttendanceFilters.tsx
  ProofPhotoDialog.tsx
lib/
  supabase/{admin,server,browser}.ts
  auth/{adminGuard,mobileJwt}.ts
  validators/{employees,devices,attendance}.ts
  face/identify.ts
  storage/signedUrls.ts
middleware.ts
README.md

====================================================
9) ENV VARS
====================================================
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

APP_JWT_SECRET=
APP_JWT_ISSUER=attendance-app
APP_ACCESS_TOKEN_TTL_SECONDS=3600
MOBILE_REFRESH_TOKEN_TTL_DAYS=30

FACE_MATCH_THRESHOLD=0.80
CAPTURE_MAX_SKEW_SECONDS=120

PROOF_BUCKET_NAME=attendance-proofs

====================================================
10) IMPLEMENTATION ORDER (MUST FOLLOW)
====================================================
Milestone 1: DB + RLS + RPC + bucket
Milestone 2: Admin auth + role admin + admin guards
Milestone 3: Admin APIs (employees, devices)
Milestone 4: Mobile auth (face-login + refresh/logout + me)
Milestone 5: Storage upload-url + attendance check-in/out rules + mobile history
Milestone 6: Admin attendance list + proof-image-url
Milestone 7: Web UI pages (shadcn/ui)

Mulai dari Milestone 1. Jangan loncat.
Jika ada keputusan yang belum jelas, ambil keputusan terbaik yang menjaga keamanan & free tier, lalu tulis di bagian ASSUMPTIONS.

====================================================
11) DEFINITION OF DONE (DoD) PER MILESTONE
====================================================
Milestone 1 — DB + RLS + RPC + Bucket
DONE jika:
- SQL migration lengkap dibuat (enums, tables, indexes)
- RLS enable + policies admin berjalan
- RPC face_identify_v1 bisa dipanggil dan return score
- Bucket attendance-proofs dibuat private

Milestone 2 — Admin Auth + Role Admin + Guards
DONE jika:
- Admin login via Supabase Auth berjalan
- Admin guard server-side cek profiles.role
- Non-admin tidak bisa akses admin APIs/pages

Milestone 3 — Admin APIs (Employees/Devices)
DONE jika:
- CRUD employees & devices berjalan end-to-end
- Zod validation + error format konsisten
- Pagination + search employees/devices berjalan

Milestone 4 — Mobile Auth (Face Identify)
DONE jika:
- face-login menolak device non-terdaftar/non-aktif
- anti replay (clientCaptureId) jalan
- access+refresh token bekerja, logout revoke refresh
- deviceId dibinding dalam token

Milestone 5 — Upload URL + Attendance (Mobile)
DONE jika:
- upload-url return path+signed upload URL valid
- check-in/out:
  - idempotent (duplicate capture ditolak)
  - open session rules berlaku
  - employee/device mismatch ditolak
  - proofImagePath disimpan
- mobile history hanya data miliknya

Milestone 6 — Admin Attendance + Proof Image URL
DONE jika:
- admin attendance list filter+pagination berjalan
- proof-image-url return signed download URL
- signed URL hanya admin

Milestone 7 — Web UI (shadcn/ui)
DONE jika:
- Semua page: /dashboard /employees /devices /attendance selesai minimal
- CRUD via Dialog (shadcn)
- Attendance filter: date range (Popover+Calendar) + select
- View photo via Dialog lazy-load signed URL
- Tidak ada halaman raw HTML (gunakan shadcn/ui)
- README ada: setup shadcn, env vars, run, deploy, curl tests
