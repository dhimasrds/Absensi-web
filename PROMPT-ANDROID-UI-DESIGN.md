# PROMPT: ANDROID ATTENDANCE APP UI DESIGN

Gunakan prompt ini untuk membuat design UI Android Attendance App dengan AI tools
(Figma AI, Uizard, Galileo AI, v0.dev, atau komunikasi dengan designer).

---

====================================================
## 📱 APP OVERVIEW
====================================================

**App Name**: Absensi Karyawan
**Platform**: Android (Native)
**Min SDK**: Android 8.0 (API 26)
**Design System**: Material Design 3 (Material You)
**Primary Use Case**: Employee attendance check-in/check-out menggunakan face recognition

**Target Users**:
- Karyawan perusahaan
- Usia 20-55 tahun
- Tech literacy: Basic to Intermediate
- Penggunaan: Harian (2x sehari - masuk & pulang)

---

====================================================
## 🎨 DESIGN SPECIFICATIONS
====================================================

### Color Palette (Material You)

```
Primary:           #1565C0 (Blue 800)
Primary Container: #BBDEFB (Blue 100)
Secondary:         #43A047 (Green 600) - untuk Check-in success
Secondary Container: #C8E6C9 (Green 100)
Tertiary:          #EF6C00 (Orange 800) - untuk Check-out
Error:             #D32F2F (Red 700)
Surface:           #FFFFFF
Surface Variant:   #F5F5F5
On Primary:        #FFFFFF
On Surface:        #1C1B1F
```

### Typography (Roboto)

```
Display Large:  57sp - Waktu check-in
Headline Large: 32sp - Nama employee
Headline Medium: 28sp - Page titles
Title Large:    22sp - Card titles
Title Medium:   16sp - Section headers
Body Large:     16sp - Primary text
Body Medium:    14sp - Secondary text
Label Large:    14sp - Button text
Label Small:    11sp - Timestamps
```

### Spacing System

```
xs:  4dp
sm:  8dp
md:  16dp
lg:  24dp
xl:  32dp
xxl: 48dp
```

### Corner Radius

```
Small:       8dp  (Buttons, small cards)
Medium:      12dp (Cards, dialogs)
Large:       16dp (Bottom sheets)
Extra Large: 28dp (FAB)
```

---

====================================================
## 📄 SCREENS TO DESIGN (8 Screens)
====================================================

### SCREEN 1: Splash Screen
────────────────────────────────────────

**Purpose**: App loading & branding

**Elements**:
- App logo (center, animated fade-in)
- App name "Absensi" below logo
- Loading indicator (circular progress)
- Background: Gradient primary color

**Animation**:
- Logo scale from 0.8 to 1.0
- Fade in 500ms
- Auto navigate after 2s

**Wireframe**:
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│         [LOGO]          │
│                         │
│        Absensi          │
│                         │
│      ◌ Loading...       │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

---

### SCREEN 2: Login Screen (Face Recognition)
────────────────────────────────────────

**Purpose**: Employee authentication via face recognition

**Elements**:
- Camera preview (full screen background, 16:9 aspect)
- Face detection overlay (oval frame guide)
- Liveness instruction text (animated)
- Status indicator (Detecting face... / Look straight / Blink your eyes)
- Device ID badge (bottom, small)
- Help button (top right)

**States**:
1. **Initial**: "Posisikan wajah dalam frame"
2. **Face Detected**: "Wajah terdeteksi, harap diam"
3. **Liveness Check**: "Kedipkan mata Anda" / "Putar kepala ke kiri"
4. **Processing**: Circular progress + "Memverifikasi..."
5. **Success**: Checkmark animation + "Selamat datang, [Nama]"
6. **Error**: Error icon + message + "Coba Lagi" button

**Wireframe**:
```
┌─────────────────────────┐
│ ←                    (?) │  ← Help button
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   ┌─────────┐   │   │  ← Oval face guide
│   │   │  CAMERA │   │   │
│   │   │ PREVIEW │   │   │
│   │   └─────────┘   │   │
│   │                 │   │
│   └─────────────────┘   │
│                         │
│   "Kedipkan mata Anda"  │  ← Liveness instruction
│                         │
│   ━━━━━━━━━━━━━━━━━━━   │  ← Progress bar
│                         │
│   Device: ANDROID-XXX   │  ← Device ID (small)
└─────────────────────────┘
```

**Liveness Instructions (Rotate):**
- "Kedipkan mata Anda"
- "Putar kepala ke kiri"
- "Putar kepala ke kanan"
- "Tersenyum"

---

### SCREEN 3: Home Screen (Dashboard)
────────────────────────────────────────

**Purpose**: Main hub - attendance status & actions

**Elements**:
- **Top Bar**: 
  - Profile avatar (left) → tap opens Profile
  - Current date (center)
  - Notification bell (right)
  
- **Greeting Card**:
  - "Selamat Pagi/Siang/Sore, [Nama]" (time-based)
  - Employee ID badge
  - Department text
  
- **Attendance Status Card** (prominent):
  - Today's date
  - Check-in time (large, green) or "Belum Check-in" (gray)
  - Check-out time (large, orange) or "—"
  - Work duration (if both exist)
  - Status badge: "Hadir" / "Belum Absen" / "Terlambat"

- **Action Buttons** (large, centered):
  - "CHECK IN" button (green, full width) - if not checked in
  - "CHECK OUT" button (orange, full width) - if checked in
  - Disabled state if already completed
  
- **Work Location Card**:
  - Location icon + name
  - Distance indicator (if within range: green check, else: red warning)
  - "500m dari Head Office"
  
- **Bottom Navigation**:
  - Home (active)
  - History
  - Profile

**Wireframe**:
```
┌─────────────────────────┐
│ (👤)   7 Januari 2026  🔔│
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Selamat Pagi, John! │ │
│ │ EMP-001 • IT Dept   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │   HARI INI          │ │
│ │                     │ │
│ │  Masuk      Pulang  │ │
│ │  08:30      --:--   │ │
│ │                     │ │
│ │     ● Hadir         │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │     CHECK OUT       │ │  ← Large action button
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 📍 Head Office      │ │
│ │ ✓ Dalam jangkauan   │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│  🏠      📋      👤    │  ← Bottom nav
│  Home   History Profile │
└─────────────────────────┘
```

**Time-based Greetings:**
- 00:00 - 11:59 → "Selamat Pagi"
- 12:00 - 14:59 → "Selamat Siang"
- 15:00 - 18:59 → "Selamat Sore"
- 19:00 - 23:59 → "Selamat Malam"

---

### SCREEN 4: Attendance Capture Screen
────────────────────────────────────────

**Purpose**: Capture face photo for attendance proof

**Elements**:
- Camera preview (full screen)
- Face guide overlay (oval)
- Type indicator: "CHECK IN" or "CHECK OUT" (top banner)
- Current time (large, real-time updating)
- Location status (bottom): "📍 Head Office - 120m"
- Capture button (large FAB at bottom)
- Cancel button (top left)

**States**:
1. **Camera Ready**: Show preview + "Posisikan wajah"
2. **Face Detected**: Green border on oval + enable capture button
3. **Capturing**: Flash effect + "Memproses..."
4. **Uploading**: Progress bar + "Mengunggah bukti..."
5. **Success**: 
   - Checkmark animation
   - "Check-in Berhasil!"
   - Time recorded: "08:30:25"
   - Auto close after 2s
6. **Error**: 
   - Error message
   - "Coba Lagi" button

**Wireframe**:
```
┌─────────────────────────┐
│ ✕           CHECK IN    │  ← Cancel + Type banner
│                         │
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   ┌─────────┐   │   │
│   │   │  FACE   │   │   │
│   │   │ PREVIEW │   │   │
│   │   └─────────┘   │   │
│   │                 │   │
│   └─────────────────┘   │
│                         │
│        08:30:15         │  ← Real-time clock
│                         │
│   "Posisikan wajah      │
│    dalam frame"         │
│                         │
│ 📍 Head Office • 120m   │  ← Location status
│                         │
│         ( 📷 )          │  ← Capture FAB
└─────────────────────────┘
```

**Success State:**
```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│           ✓             │  ← Animated checkmark
│                         │
│    Check-in Berhasil!   │
│                         │
│       08:30:25          │  ← Recorded time
│    7 Januari 2026       │
│                         │
│                         │
│                         │
└─────────────────────────┘
```

---

### SCREEN 5: History Screen
────────────────────────────────────────

**Purpose**: View attendance history

**Elements**:
- **Top Bar**: "Riwayat Absensi" title
- **Month Selector**: Horizontal scroll months or dropdown
- **Summary Card**:
  - Total hadir: X hari
  - Total terlambat: X hari
  - Total tidak hadir: X hari
- **Calendar View** (optional toggle):
  - Monthly calendar with dots indicating attendance
  - Green dot = hadir, Red = tidak hadir, Yellow = terlambat
- **List View** (default):
  - Grouped by date
  - Each item shows:
    - Date + Day name
    - Check-in time (green)
    - Check-out time (orange)
    - Duration
    - Status badge
  - Tap to see detail + proof photo

**Wireframe**:
```
┌─────────────────────────┐
│ ←    Riwayat Absensi    │
├─────────────────────────┤
│ ◀ Januari 2026 ▶        │  ← Month selector
├─────────────────────────┤
│ ┌───────────────────┐   │
│ │ Hadir  Terlambat  │   │
│ │  20       2       │   │
│ └───────────────────┘   │
├─────────────────────────┤
│                         │
│ Senin, 6 Januari 2026   │
│ ┌─────────────────────┐ │
│ │ ↓ 08:30  ↑ 17:45   │ │
│ │ Durasi: 9j 15m     │ │
│ │              Hadir ●│ │
│ └─────────────────────┘ │
│                         │
│ Minggu, 5 Januari 2026  │
│ ┌─────────────────────┐ │
│ │      LIBUR          │ │
│ └─────────────────────┘ │
│                         │
│ Sabtu, 4 Januari 2026   │
│ ┌─────────────────────┐ │
│ │ ↓ 08:45  ↑ 17:30   │ │
│ │ Durasi: 8j 45m     │ │
│ │          Terlambat ●│ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│  🏠      📋      👤    │
│  Home   History Profile │
└─────────────────────────┘
```

---

### SCREEN 6: Attendance Quick Preview (Bottom Sheet)
────────────────────────────────────────

**Purpose**: Quick preview before navigating to full detail screen

**Trigger**: Tap attendance item in History Screen

**Elements**:
- Drag handle (top)
- Date & status (header)
- Check-in/out summary (time only)
- Small proof photo thumbnails
- "Lihat Detail Lengkap" button → navigates to Screen 8

**Wireframe:**
```
┌─────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━ │  ← Drag handle
│                         │
│   Senin, 6 Januari 2026 │
│          Hadir ●        │
│                         │
├─────────────────────────┤
│                         │
│  ↓ CHECK IN    08:30   │
│  ↑ CHECK OUT   17:45   │
│                         │
│  Durasi: 9j 15m         │
│                         │
├─────────────────────────┤
│ ┌───────┐ ┌───────┐     │
│ │ FOTO  │ │ FOTO  │     │  ← Thumbnails
│ │  IN   │ │  OUT  │     │
│ └───────┘ └───────┘     │
│                         │
├─────────────────────────┤
│                         │
│ [ Lihat Detail Lengkap ]│  ← Navigate to Screen 8
│                         │
└─────────────────────────┘
```

---

### SCREEN 7: Profile Screen
────────────────────────────────────────

**Purpose**: View profile & settings

**Elements**:
- Profile photo (large, circular)
- Employee name (headline)
- Employee ID
- Department & Position
- **Work Location Card**:
  - Assigned location
  - Map preview (optional)
  - Radius info
- **Device Info**:
  - Device ID
  - Registered date
- **Actions**:
  - Edit Profile (disabled - managed by admin)
  - Change Language
  - App Version
  - Logout button (destructive)

**Wireframe**:
```
┌─────────────────────────┐
│ ←        Profil         │
├─────────────────────────┤
│                         │
│         (👤)            │  ← Large avatar
│                         │
│       John Doe          │
│       EMP-001           │
│   IT Dept • Developer   │
│                         │
├─────────────────────────┤
│ LOKASI KERJA            │
│ ┌─────────────────────┐ │
│ │ 📍 Head Office      │ │
│ │ Jl. Sudirman No.123 │ │
│ │ Radius: 500m        │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ PERANGKAT               │
│ ┌─────────────────────┐ │
│ │ 📱 ANDROID-A1B2C3   │ │
│ │ Terdaftar: 1 Jan 26 │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 🌐 Bahasa Indonesia │▶│
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ℹ️ Versi 1.0.0      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │      KELUAR         │ │  ← Red/destructive
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│  🏠      📋      👤    │
│  Home   History Profile │
└─────────────────────────┘
```

---

### SCREEN 8: Attendance Detail Screen (Full Page) ⭐ NEW
────────────────────────────────────────

**Purpose**: View complete attendance detail with proof photo, location map, and all metadata

**Navigation**: From History Screen → Tap attendance item → Bottom Sheet → "Lihat Detail Lengkap"

**Elements**:

**A. Top App Bar:**
- Back button (←)
- Title: "Detail Absensi"
- More options menu (⋮) - optional

**B. Proof Photo Section:**
- Large photo preview (16:9 aspect ratio)
- Tap to view fullscreen with zoom/pinch
- Photo timestamp overlay (bottom-right corner)
- Face verification badge overlay (top-right): "✓ Terverifikasi"
- If no photo: placeholder with camera icon

**C. Status Header Card:**
- Attendance type badge: "CHECK IN" (green) or "CHECK OUT" (orange)
- Date: "Senin, 6 Januari 2026"
- Time (large): "08:30:25"
- Status badge: "Hadir" / "Terlambat" / "Tidak Hadir"

**D. Location Section with Minimap:**
- Section title: "LOKASI ABSENSI"
- Minimap preview (Google Maps static/embedded, 16:9 or 2:1)
  - Blue pin marker = User's capture location
  - Red pin marker = Work location center
  - Blue circle overlay = Work location radius (500m)
- Location details below map:
  - 📍 Koordinat: -6.2088, 106.8456
  - 🏢 Lokasi Kerja: Head Office
  - 📏 Jarak: 120m dari titik lokasi
  - Status: ✓ Dalam jangkauan (green) / ⚠ Di luar jangkauan (red)
- "Buka di Google Maps" button (outlined)

**E. Verification Details Card:**
- Section title: "DETAIL VERIFIKASI"
- Method: Face Recognition (with icon)
- Match Score: 95.42% (with visual progress bar)
- Liveness Score: 98.21% (with visual progress bar)
- Verification Status: ✓ Terverifikasi / ⏳ Pending / ✗ Ditolak

**F. Device & Meta Info Card:**
- Section title: "INFORMASI PERANGKAT"
- Device ID: ANDROID-A1B2C3D4
- Device Label: Front Desk Tablet
- Capture ID: 550e8400-e29b-41d4...
- Client Timestamp: 08:30:25.123 WIB
- Server Timestamp: 08:30:26.456 WIB

**G. Notes Section (if exists):**
- Section title: "CATATAN"
- Note text content (expandable if long)
- Empty state if no notes

**Full Wireframe:**
```
┌─────────────────────────┐
│ ←   Detail Absensi    ⋮ │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │                     │ │
│ │                     │ │
│ │    PROOF PHOTO      │ │  ← 16:9 photo (tap to zoom)
│ │                     │ │
│ │ ┌────────┐          │ │
│ │ │✓ Face  │ 08:30:25 │ │  ← Badge + timestamp overlay
│ │ └────────┘          │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ ┌──────────┐        │ │
│ │ │ CHECK IN │        │ │  ← Type badge (green/orange)
│ │ └──────────┘        │ │
│ │                     │ │
│ │     08:30:25        │ │  ← Large time
│ │ Senin, 6 Jan 2026   │ │
│ │              Hadir ●│ │  ← Status badge
│ └─────────────────────┘ │
│                         │
│ ─ LOKASI ABSENSI ────── │
│ ┌─────────────────────┐ │
│ │ ┌─────────────────┐ │ │
│ │ │                 │ │ │
│ │ │    MINIMAP      │ │ │  ← Google Maps
│ │ │   📍      ◯     │ │ │  ← User pin + radius circle
│ │ │          🏢     │ │ │  ← Work location pin
│ │ │                 │ │ │
│ │ └─────────────────┘ │ │
│ │                     │ │
│ │ 📍 Koordinat        │ │
│ │ -6.208800, 106.8456 │ │
│ │                     │ │
│ │ 🏢 Lokasi Kerja     │ │
│ │ Head Office         │ │
│ │ Jl. Sudirman No.123 │ │
│ │                     │ │
│ │ 📏 Jarak            │ │
│ │ 120m ✓ Dalam area   │ │  ← Green if within, red if not
│ │                     │ │
│ │ ┌─────────────────┐ │ │
│ │ │🗺 Buka di Maps   │ │ │  ← Outlined button
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
│                         │
│ ─ DETAIL VERIFIKASI ─── │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │ Metode              │ │
│ │ 👤 Face Recognition │ │
│ │                     │ │
│ │ Match Score         │ │
│ │ ████████████░░ 95%  │ │  ← Progress bar (green)
│ │                     │ │
│ │ Liveness Score      │ │
│ │ █████████████░ 98%  │ │  ← Progress bar (green)
│ │                     │ │
│ │ Status Verifikasi   │ │
│ │ ✓ Terverifikasi     │ │  ← Green badge
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ ─ INFO PERANGKAT ────── │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │ Device ID           │ │
│ │ ANDROID-A1B2C3D4    │ │  ← Monospace font
│ │                     │ │
│ │ Label               │ │
│ │ Front Desk Tablet   │ │
│ │                     │ │
│ │ Capture ID          │ │
│ │ 550e8400-e29b...    │ │  ← Truncated, tap to copy
│ │                     │ │
│ │ Waktu Capture       │ │
│ │ 08:30:25.123 WIB    │ │
│ │                     │ │
│ │ Waktu Server        │ │
│ │ 08:30:26.456 WIB    │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ ─ CATATAN ───────────── │
│ ┌─────────────────────┐ │
│ │ Terlambat karena    │ │
│ │ macet di jalan      │ │
│ │ tol Cikampek.       │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

**Photo Fullscreen Viewer (on tap photo):**
```
┌─────────────────────────┐
│ ✕                       │  ← Close button (white)
│                         │
│                         │
│                         │
│    ┌───────────────┐    │
│    │               │    │
│    │               │    │
│    │  FULL PHOTO   │    │  ← Pinch to zoom
│    │               │    │
│    │               │    │
│    │               │    │
│    └───────────────┘    │
│                         │
│                         │
│                         │
│         1 / 1           │  ← Photo counter
│                         │
│ Background: Black       │
└─────────────────────────┘
```

**Map Expanded View (on tap minimap):**
```
┌─────────────────────────┐
│ ←    Lokasi Absensi     │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │                     │ │
│ │                     │ │
│ │    FULL MAP VIEW    │ │  ← Interactive map
│ │                     │ │
│ │   📍        ◯       │ │  ← User + radius
│ │            🏢       │ │  ← Work location
│ │                     │ │
│ │                     │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ LOKASI ANDA             │
│ -6.208800, 106.845600   │
│                         │
│ LOKASI KERJA            │
│ Head Office             │
│ Radius: 500m            │
│                         │
│ JARAK                   │
│ 120m ✓ Dalam jangkauan  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │  🗺 Buka Google Maps │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

====================================================
## 🚨 ERROR & EMPTY STATES
====================================================

### Location Error (Geofencing - Out of Range)
```
┌─────────────────────────┐
│                         │
│          🚫            │
│                         │
│   Di Luar Area Kerja    │
│                         │
│  Anda berada 850m dari  │
│  Head Office.           │
│  Maksimal: 500m         │
│                         │
│  [    KEMBALI    ]      │
│                         │
└─────────────────────────┘
```

### No Internet Connection
```
┌─────────────────────────┐
│                         │
│          📡            │
│                         │
│    Tidak Ada Koneksi    │
│                         │
│  Absensi akan disimpan  │
│  dan dikirim saat       │
│  online.                │
│                         │
│  [ LANJUTKAN OFFLINE ]  │
│                         │
└─────────────────────────┘
```

### Face Not Recognized
```
┌─────────────────────────┐
│                         │
│          ❌            │
│                         │
│  Wajah Tidak Dikenali   │
│                         │
│  Pastikan pencahayaan   │
│  cukup dan wajah        │
│  terlihat jelas.        │
│                         │
│  [    COBA LAGI    ]    │
│                         │
└─────────────────────────┘
```

### Empty History
```
┌─────────────────────────┐
│                         │
│          📋            │
│                         │
│   Belum Ada Riwayat     │
│                         │
│  Riwayat absensi akan   │
│  muncul di sini setelah │
│  Anda melakukan         │
│  check-in pertama.      │
│                         │
└─────────────────────────┘
```

### GPS Spoofing Detected
```
┌─────────────────────────┐
│                         │
│          ⚠️            │
│                         │
│  Fake GPS Terdeteksi    │
│                         │
│  Nonaktifkan aplikasi   │
│  mock location untuk    │
│  melanjutkan.           │
│                         │
│  [   PENGATURAN   ]     │
│                         │
└─────────────────────────┘
```

### Already Checked In
```
┌─────────────────────────┐
│                         │
│          ℹ️            │
│                         │
│  Sudah Check-in         │
│                         │
│  Anda sudah melakukan   │
│  check-in hari ini      │
│  pukul 08:30            │
│                         │
│  [    KEMBALI    ]      │
│                         │
└─────────────────────────┘
```

### Not Checked In Yet (for Check-out)
```
┌─────────────────────────┐
│                         │
│          ℹ️            │
│                         │
│  Belum Check-in         │
│                         │
│  Anda harus melakukan   │
│  check-in terlebih      │
│  dahulu.                │
│                         │
│  [   CHECK IN    ]      │
│                         │
└─────────────────────────┘
```

---

====================================================
## 🔄 LOADING STATES
====================================================

### Skeleton Loading (History)
```
┌─────────────────────────┐
│ ████████████████        │
│ ┌─────────────────────┐ │
│ │ ██████  ██████████  │ │
│ │ ████████████        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ██████  ██████████  │ │
│ │ ████████████        │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ██████  ██████████  │ │
│ │ ████████████        │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Processing Attendance
```
┌─────────────────────────┐
│                         │
│          ◌             │  ← Circular progress (animated)
│                         │
│    Memproses absensi... │
│                         │
│    Mohon tunggu         │
│                         │
└─────────────────────────┘
```

### Uploading Photo
```
┌─────────────────────────┐
│                         │
│    ━━━━━━━━━━░░░░░░    │  ← Linear progress
│          65%            │
│                         │
│   Mengunggah foto...    │
│                         │
└─────────────────────────┘
```

---

====================================================
## 📐 COMPONENT SPECIFICATIONS
====================================================

### Attendance Status Card (Home)

```
┌─────────────────────────────────────┐
│  📅 Hari ini, 7 Januari 2026       │
│                                     │
│     ↓ MASUK          ↑ PULANG      │
│      08:30            17:45        │
│     (green)          (orange)      │
│                                     │
│  ──────────────────────────────    │
│  Durasi: 9 jam 15 menit            │
│                            [Hadir] │ ← Badge
└─────────────────────────────────────┘

Specs:
- Card elevation: 2dp
- Corner radius: 12dp
- Padding: 16dp
- Time font: Headline Large (32sp) or Display Medium
- Duration font: Body Medium
- Badge: Filled, corner radius 16dp, padding 8dp horizontal
```

### Action Button (Check In/Out)

```
┌─────────────────────────────────────┐
│                                     │
│            CHECK IN                 │
│                                     │
└─────────────────────────────────────┘

Specs:
- Height: 56dp
- Corner radius: 28dp (full rounded)
- Font: Title Medium (16sp), Bold, ALL CAPS
- Check In color: Green (#43A047)
- Check Out color: Orange (#EF6C00)
- Disabled color: Gray (#BDBDBD)
- Ripple effect on tap
- Elevation: 4dp (pressed: 8dp)
```

### History Item Card

```
┌─────────────────────────────────────┐
│  Senin, 6 Januari 2026              │
│                                     │
│  ↓ 08:30    →    ↑ 17:45           │
│                                     │
│  Durasi: 9j 15m              [Hadir]│
└─────────────────────────────────────┘

Specs:
- Card elevation: 1dp
- Corner radius: 8dp
- Padding: 12dp horizontal, 16dp vertical
- Date font: Title Small (14sp), Medium weight
- Arrow icons: 18dp, colored (green/orange)
- Time font: Body Large (16sp), Medium weight
- Tap feedback: Ripple + elevation to 4dp
```

### Bottom Navigation

```
┌───────────┬───────────┬───────────┐
│    🏠     │    📋     │    👤     │
│  Beranda  │  Riwayat  │  Profil   │
└───────────┴───────────┴───────────┘

Specs:
- Height: 80dp
- Icon size: 24dp
- Label font: Label Medium (12sp)
- Active: Primary color (#1565C0)
- Inactive: On Surface Variant (#49454F)
- Indicator: Pill shape behind active icon (64dp x 32dp)
- Badge support: For notifications (red dot)
```

### Face Guide Overlay

```
      ┌─────────────────┐
      │                 │
      │   ╭─────────╮   │
      │   │         │   │
      │   │  FACE   │   │  ← Oval shape
      │   │  AREA   │   │
      │   │         │   │
      │   ╰─────────╯   │
      │                 │
      └─────────────────┘

Specs:
- Oval ratio: 3:4 (width:height)
- Border width: 3dp
- Border style: Dashed when detecting, Solid when face found
- Border color: White (detecting), Green (face detected), Red (error)
- Background outside oval: Semi-transparent black (#000000, 50% opacity)
- Animation: Pulse when detecting (scale 1.0 → 1.02, 1000ms loop)
```

### Attendance Detail - Proof Photo Card

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│          PROOF PHOTO                │
│           (16:9)                    │
│                                     │
│                        ┌──────────┐ │
│                        │ ✓ Face   │ │ ← Verified badge
│                        └──────────┘ │
│  ┌────────────────────────────────┐ │
│  │ 📷 08:30:25 • 6 Jan 2026      │ │ ← Timestamp bar
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘

Specs:
- Aspect ratio: 16:9
- Corner radius: 12dp
- Verified badge: 
  - Background: Green with 80% opacity
  - Icon: Check mark (white)
  - Text: "Face" or "Terverifikasi"
  - Position: Top-right, 8dp margin
  - Corner radius: 8dp
- Timestamp bar:
  - Background: Black with 60% opacity
  - Text: White, Label Small (11sp)
  - Position: Bottom, full width
  - Padding: 8dp vertical, 12dp horizontal
- Tap action: Open fullscreen photo viewer
- Placeholder: Gray background + camera icon (if no photo)
```

### Attendance Detail - Minimap Card

```
┌─────────────────────────────────────┐
│ LOKASI ABSENSI                      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │         GOOGLE MAP              │ │
│ │                                 │ │
│ │    📍 ← User location (blue)    │ │
│ │         ◯ ← Radius circle       │ │
│ │    🏢 ← Work location (red)     │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📍 Koordinat                        │
│    -6.208800, 106.845600           │
│                                     │
│ 🏢 Lokasi Kerja                     │
│    Head Office                      │
│    Jl. Sudirman No. 123            │
│                                     │
│ 📏 Jarak dari Lokasi                │
│    120 meter ✓ Dalam jangkauan     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │      🗺️ Buka di Google Maps     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Specs:
- Section title: Title Small (14sp), ALL CAPS, On Surface Variant
- Card elevation: 1dp
- Corner radius: 12dp
- Map height: 180dp
- Map corner radius: 8dp
- User pin: Blue (#1565C0), size 32dp
- Work location pin: Red (#D32F2F), size 32dp
- Radius circle: Primary color with 20% opacity, stroke 2dp
- Distance status colors:
  - Within range: Green (#43A047) + check icon
  - Out of range: Red (#D32F2F) + warning icon
- "Buka di Maps" button:
  - Style: Outlined
  - Full width
  - Icon: Map icon (left side)
  - Corner radius: 8dp
```

### Attendance Detail - Verification Card

```
┌─────────────────────────────────────┐
│ DETAIL VERIFIKASI                   │
├─────────────────────────────────────┤
│                                     │
│ Metode Verifikasi                   │
│ ┌─────────────────────────────────┐ │
│ │ 👤  Face Recognition            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Match Score                         │
│ ┌─────────────────────────────────┐ │
│ │ ████████████████░░░░  95.42%   │ │
│ └─────────────────────────────────┘ │
│ Tingkat kecocokan wajah             │
│                                     │
│ Liveness Score                      │
│ ┌─────────────────────────────────┐ │
│ │ █████████████████░░░  98.21%   │ │
│ └─────────────────────────────────┘ │
│ Deteksi wajah asli (bukan foto)     │
│                                     │
│ Status Verifikasi                   │
│ ┌─────────────────────────────────┐ │
│ │ ✓  Terverifikasi                │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

Specs:
- Progress bar:
  - Height: 8dp
  - Corner radius: 4dp
  - Track color: Gray (#E0E0E0)
  - Progress colors:
    - >= 90%: Green (#43A047)
    - 70-89%: Orange (#EF6C00)
    - < 70%: Red (#D32F2F)
- Percentage text: Body Medium, aligned right
- Helper text: Body Small (12sp), On Surface Variant
- Status chip:
  - Verified: Green background (#C8E6C9), green text (#2E7D32)
  - Pending: Orange background (#FFE0B2), orange text (#E65100)
  - Rejected: Red background (#FFCDD2), red text (#C62828)
```

### Attendance Detail - Device Info Card

```
┌─────────────────────────────────────┐
│ INFORMASI PERANGKAT                 │
├─────────────────────────────────────┤
│                                     │
│ Device ID                           │
│ ANDROID-A1B2C3D4E5                  │
│                                     │
│ Label Perangkat                     │
│ Front Desk Tablet                   │
│                                     │
│ Client Capture ID                   │
│ 550e8400-e29b-41d4-a716...         │
│                                     │
│ Waktu Capture (Client)              │
│ 08:30:25.123 WIB                    │
│                                     │
│ Waktu Server                        │
│ 08:30:26.456 WIB                    │
│                                     │
└─────────────────────────────────────┘

Specs:
- Label: Body Small (12sp), On Surface Variant
- Value: Body Medium (14sp), On Surface
- ID values: Monospace font (Roboto Mono)
- Long IDs: Truncate with ellipsis, tap to copy full value
- Spacing between items: 16dp
- Card padding: 16dp
- Divider: Optional, 1dp, Surface Variant color
```

---

====================================================
## 🎬 ANIMATIONS & TRANSITIONS
====================================================

### Screen Transitions
- **Forward navigation**: Slide in from right (300ms, ease-out)
- **Back navigation**: Slide out to right (250ms, ease-in)
- **Bottom sheet**: Slide up with fade (300ms, ease-out)
- **Dialog**: Fade in + scale from 0.9 to 1.0 (200ms, ease-out)
- **Tab switch**: Cross-fade (150ms)

### Micro-interactions
- **Button press**: Scale to 0.95 + ripple (100ms)
- **Card tap**: Elevation increase 1dp → 4dp (150ms)
- **Success checkmark**: Draw animation (500ms) + scale bounce (1.0 → 1.2 → 1.0)
- **Error shake**: Horizontal shake 3x, 10dp amplitude (300ms)
- **Loading spinner**: Continuous rotation (1000ms per cycle)
- **Progress bar fill**: Animated fill with easing (500ms)

### Liveness Detection
- **Instruction change**: Fade out/in (200ms)
- **Progress bar**: Smooth fill animation (linear)
- **Face detected**: Border color transition white → green (200ms)
- **Face lost**: Border color transition green → white (200ms)

### Photo Viewer
- **Open**: Scale from thumbnail position with shared element transition
- **Close**: Reverse of open
- **Zoom**: Pinch gesture with smooth scaling
- **Pan**: Smooth panning when zoomed

---

====================================================
## 📱 RESPONSIVE CONSIDERATIONS
====================================================

### Small Phones (< 360dp width)
- Reduce card padding to 12dp
- Stack check-in/out times vertically in status card
- Smaller action button (48dp height)
- Reduce font sizes by 2sp

### Large Phones (> 400dp width)
- Increase card padding to 20dp
- Larger photo preview in detail screen
- More spacious layout

### Tablets (> 600dp width)
- Two-column layout for history list
- Side-by-side check-in/out in status card
- Larger camera preview area
- Split-screen support

### Landscape Mode
- Camera preview: 16:9 centered with controls on side
- History: Horizontal list or grid
- Detail screen: Photo on left, info on right

---

====================================================
## 🌙 DARK MODE COLORS
====================================================

```
Primary:           #90CAF9 (Blue 200)
Primary Container: #1565C0 (Blue 800)
Secondary:         #81C784 (Green 300)
Secondary Container: #1B5E20 (Green 900)
Tertiary:          #FFB74D (Orange 300)
Tertiary Container: #E65100 (Orange 900)
Error:             #EF5350 (Red 400)
Surface:           #121212
Surface Variant:   #1E1E1E
On Primary:        #003258
On Surface:        #E1E1E1
On Surface Variant: #A0A0A0
```

### Dark Mode Specific Adjustments
- Card elevation shown via lighter surface color (not shadow)
- Reduce image brightness slightly for eye comfort
- Progress bars use lighter track color (#2C2C2C)
- Map uses dark mode style if available

---

====================================================
## 📝 COPY / TEXT (INDONESIAN)
====================================================

### Navigation
- Home: "Beranda"
- History: "Riwayat"
- Profile: "Profil"

### Buttons
- Check In: "CHECK IN"
- Check Out: "CHECK OUT"
- Try Again: "COBA LAGI"
- Back: "KEMBALI"
- Logout: "KELUAR"
- Continue: "LANJUTKAN"
- Continue Offline: "LANJUTKAN OFFLINE"
- Open in Maps: "Buka di Google Maps"
- View Full Detail: "Lihat Detail Lengkap"
- Settings: "PENGATURAN"

### Status Labels
- Present: "Hadir"
- Late: "Terlambat"
- Absent: "Tidak Hadir"
- Not Clocked In: "Belum Absen"
- Holiday: "Libur"
- Verified: "Terverifikasi"
- Pending: "Menunggu"
- Rejected: "Ditolak"

### Section Titles
- Today: "HARI INI"
- Attendance Location: "LOKASI ABSENSI"
- Verification Details: "DETAIL VERIFIKASI"
- Device Information: "INFORMASI PERANGKAT"
- Work Location: "LOKASI KERJA"
- Device: "PERANGKAT"
- Notes: "CATATAN"
- Coordinates: "Koordinat"
- Distance: "Jarak"

### Messages - Face Recognition
- Face detected: "Wajah terdeteksi"
- Position face: "Posisikan wajah dalam frame"
- Hold still: "Harap diam"
- Blink eyes: "Kedipkan mata Anda"
- Turn left: "Putar kepala ke kiri"
- Turn right: "Putar kepala ke kanan"
- Smile: "Tersenyum"

### Messages - Processing
- Processing: "Memproses..."
- Verifying: "Memverifikasi..."
- Uploading: "Mengunggah foto..."
- Please wait: "Mohon tunggu"

### Messages - Success
- Check-in success: "Check-in Berhasil!"
- Check-out success: "Check-out Berhasil!"
- Welcome: "Selamat datang, [Nama]"

### Messages - Errors
- Face not recognized: "Wajah Tidak Dikenali"
- Out of range: "Di Luar Area Kerja"
- No connection: "Tidak Ada Koneksi"
- GPS spoofing: "Fake GPS Terdeteksi"
- Already checked in: "Sudah Check-in"
- Not checked in: "Belum Check-in"
- Device not registered: "Perangkat Tidak Terdaftar"

### Messages - Location
- Within range: "Dalam jangkauan"
- Out of range: "Di luar jangkauan"
- Distance from location: "dari titik lokasi"
- Maximum allowed: "Maksimal"

### Greetings (Time-based)
- Morning (00:00-11:59): "Selamat Pagi"
- Afternoon (12:00-14:59): "Selamat Siang"
- Evening (15:00-18:59): "Selamat Sore"
- Night (19:00-23:59): "Selamat Malam"

### Misc
- Duration: "Durasi"
- Hours short: "j" (e.g., "9j 15m")
- Minutes short: "m"
- Meters: "m" or "meter"
- From: "dari"
- Check in time: "Masuk"
- Check out time: "Pulang"
- Method: "Metode"
- Match Score: "Match Score"
- Liveness Score: "Liveness Score"
- Verification Status: "Status Verifikasi"

---

====================================================
## 🎯 DESIGN DELIVERABLES CHECKLIST
====================================================

### Required Screens
- [ ] 1. Splash Screen
- [ ] 2. Login Screen (Face Recognition)
  - [ ] Initial state
  - [ ] Face detected state
  - [ ] Liveness check state
  - [ ] Processing state
  - [ ] Success state
  - [ ] Error state
- [ ] 3. Home Screen
  - [ ] Not checked in state
  - [ ] Checked in state (waiting for checkout)
  - [ ] Completed state (both check-in and out done)
- [ ] 4. Attendance Capture Screen
  - [ ] Camera ready state
  - [ ] Face detected state
  - [ ] Capturing state
  - [ ] Uploading state
  - [ ] Success state
  - [ ] Error state
- [ ] 5. History Screen
  - [ ] With data (list view)
  - [ ] Empty state
  - [ ] Loading state (skeleton)
- [ ] 6. Attendance Quick Preview (Bottom Sheet)
- [ ] 7. Profile Screen
- [ ] 8. **Attendance Detail Screen (Full Page)**
  - [ ] Proof photo section
  - [ ] Photo fullscreen viewer
  - [ ] Minimap section
  - [ ] Map expanded view
  - [ ] Verification details
  - [ ] Device info
  - [ ] Notes section

### Error States
- [ ] Location out of range
- [ ] No internet connection
- [ ] Face not recognized
- [ ] GPS spoofing detected
- [ ] Already checked in
- [ ] Not checked in yet
- [ ] Device not registered

### Loading States
- [ ] Skeleton loading (history)
- [ ] Processing attendance (spinner)
- [ ] Uploading photo (progress bar)

### Dark Mode
- [ ] All screens in dark mode

### Assets to Export
- [ ] App icon (48dp, 72dp, 96dp, 144dp, 192dp)
- [ ] Splash logo (vector/SVG)
- [ ] Status icons (hadir, terlambat, tidak hadir)
- [ ] Navigation icons (home, history, profile)
- [ ] Action icons (check-in arrow, check-out arrow)
- [ ] Empty state illustrations
- [ ] Map markers (user location - blue, work location - red)
- [ ] Verification status icons (verified, pending, rejected)

---

====================================================
## 🔗 REFERENCES & RESOURCES
====================================================

### Material Design 3
- Guidelines: https://m3.material.io/
- Components: https://m3.material.io/components
- Color system: https://m3.material.io/styles/color
- Typography: https://m3.material.io/styles/typography

### Color Tools
- Material Theme Builder: https://m3.material.io/theme-builder
- Coolors: https://coolors.co/

### Similar Apps (for inspiration)
- Google Attendance
- Jibble
- Clockify
- TimeCamp
- Hubstaff

### Icon Resources
- Material Icons: https://fonts.google.com/icons
- Lucide Icons: https://lucide.dev/

### Map Integration
- Google Maps Static API
- Google Maps SDK for Android

---

====================================================
## 💡 QUICK PROMPTS FOR AI DESIGN TOOLS
====================================================

### For Uizard / Galileo AI:
```
Design a Material Design 3 Android attendance app with these screens:

1. Face recognition login with camera preview and oval face guide
2. Home dashboard showing today's check-in/out status with large action buttons
3. Attendance capture screen with camera, face guide, and location indicator
4. History screen with monthly attendance list grouped by date
5. Attendance detail screen with:
   - Large proof photo (tap to fullscreen)
   - Google Maps minimap showing user location vs work location with radius
   - Verification scores with progress bars
   - Device and timestamp information
6. Profile screen with employee info and work location

Colors: Blue primary (#1565C0), green for check-in (#43A047), orange for check-out (#EF6C00)
Include loading states, error states, and dark mode variants.
Language: Indonesian (Bahasa Indonesia)
```

### For v0.dev (Quick Mockup):
```
Create a mobile attendance detail screen with Material Design 3 style:

- Top: Large proof photo (16:9) with "✓ Face" verified badge and timestamp overlay
- Status card: "CHECK IN" green badge, time "08:30:25", date, "Hadir" status
- Location section with Google Maps minimap showing blue pin (user) and red pin (office) with 500m radius circle
- Below map: coordinates, work location name, distance "120m ✓ Dalam jangkauan"
- Verification section: Match Score 95% and Liveness Score 98% with green progress bars
- Device info: Device ID, Capture ID, timestamps

Use rounded corners (12dp), card elevation, and Indonesian labels.
```

### For Figma AI:
```
Generate Android mobile app screens for employee attendance system:

Screen 1 - Attendance Detail:
- Header with back button and title "Detail Absensi"
- Proof photo card with verification badge overlay
- Status card showing CHECK IN, time, date, status badge
- Location card with embedded Google Map, coordinates, distance
- Verification card with match/liveness score progress bars
- Device info card with IDs and timestamps

Style: Material Design 3, primary blue #1565C0
Include both light and dark mode variants
```

---

**End of Design Prompt Document**
