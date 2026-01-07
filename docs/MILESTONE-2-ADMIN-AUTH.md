# Milestone 2: Admin Authentication

## Overview
Implementasi autentikasi admin menggunakan Supabase Auth dengan middleware protection dan login page.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Login Page    │────▶│  Supabase Auth  │────▶│    Dashboard    │
│   /login        │     │   (Email/Pass)  │     │   /dashboard    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Profiles     │
                        │  (role=admin)   │
                        └─────────────────┘
```

## Components

### 1. Supabase Clients

#### Browser Client (`src/lib/supabase/browser.ts`)
Untuk client-side operations.
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server Client (`src/lib/supabase/server.ts`)
Untuk server components dengan cookie handling.
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { /* ... */ }
    }
  })
}
```

#### Admin Client (`src/lib/supabase/admin.ts`)
Untuk operasi dengan service role key (bypass RLS).
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### 2. Auth Guard (`src/lib/auth/adminGuard.ts`)

Fungsi untuk memvalidasi admin role:

```typescript
// Dari server component
export async function requireAdmin(): Promise<User | Response>

// Dari API route dengan header
export async function requireAdminFromHeader(
  authHeader: string | null
): Promise<User | Response>
```

**Flow:**
1. Get user dari Supabase Auth
2. Query profiles table untuk check role
3. Return user jika admin, error response jika tidak

### 3. Middleware (`src/middleware.ts`)

Proteksi route yang membutuhkan auth:

```typescript
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/employees/:path*',
    '/devices/:path*',
    '/attendance/:path*'
  ]
}
```

**Protected Routes:**
- `/dashboard/*`
- `/employees/*`
- `/devices/*`
- `/attendance/*`

### 4. Auth Callback (`src/app/auth/callback/route.ts`)

Handle OAuth callback dan exchange code untuk session:
```typescript
export async function GET(request: NextRequest) {
  const code = searchParams.get('code')
  await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect('/dashboard')
}
```

### 5. Login Page (`src/app/(auth)/login/page.tsx`)

UI login dengan shadcn/ui components:
- Email input
- Password input
- Error handling
- Loading state
- Redirect setelah login

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── browser.ts      # Browser client
│   │   ├── server.ts       # Server client
│   │   └── admin.ts        # Admin client (service role)
│   └── auth/
│       └── adminGuard.ts   # Admin verification
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx    # Login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts    # Auth callback handler
│   └── middleware.ts       # Route protection
```

## Authentication Flow

### Login Flow
```
1. User masuk ke /login
2. Input email & password
3. Call supabase.auth.signInWithPassword()
4. Jika sukses, redirect ke /dashboard
5. Middleware check session
6. Dashboard render
```

### Protected Route Flow
```
1. User akses /dashboard
2. Middleware intercept
3. Check Supabase session
4. Jika tidak ada session → redirect /login
5. Jika ada session → lanjut ke page
6. Page check admin role via requireAdmin()
```

## Admin User Setup

### Create Admin User (SQL)
```sql
-- 1. Create user di Supabase Auth Dashboard
-- Email: admin@company.com
-- Password: admin123456

-- 2. Insert profile dengan role admin
INSERT INTO profiles (user_id, role)
VALUES ('auth-user-uuid', 'admin');
```

### Via Supabase Dashboard
1. Authentication → Users → Add user
2. Email: admin@company.com
3. Password: admin123456
4. SQL Editor → Insert profile

## Security Considerations

1. **Password Hashing**: Handled by Supabase Auth (bcrypt)
2. **Session Management**: Supabase JWT dengan refresh token
3. **CSRF Protection**: Built-in dengan Supabase
4. **RLS**: Database-level access control
5. **Service Role Key**: Hanya di server-side

## Testing

### Manual Testing
1. Buka http://localhost:3000/login
2. Login dengan admin@company.com / admin123456
3. Verifikasi redirect ke /dashboard
4. Test protected routes (/employees, /devices, /attendance)
5. Test logout

### API Testing
```bash
# Get session cookie dari browser
curl -X GET http://localhost:3000/api/employees \
  -H "Cookie: sb-xxx-auth-token=..."
```

## Troubleshooting

### Issue: Redirect loop
**Cause**: Session tidak tersimpan dengan benar
**Solution**: Check cookie settings di Supabase client

### Issue: 401 Unauthorized
**Cause**: User tidak punya role admin
**Solution**: Verify entry di profiles table

### Issue: Middleware not working
**Cause**: Matcher pattern salah
**Solution**: Check regex pattern di middleware.ts
