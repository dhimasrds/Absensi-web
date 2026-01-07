# User Onboarding Flow - Simplified with Auto Device Registration

## 📋 Overview

Flow onboarding user baru yang **disederhanakan** dengan auto-register device pada first login.

---

## 🆕 New Simplified Flow

### **Admin Side (Web Dashboard)**

#### Step 1: Create Employee Data
```
URL: https://absensi-web-rouge.vercel.app/employees
Action: Click "Add Employee"
```

**Required Data:**
- Employee ID (unique, contoh: EMP013)
- Full Name
- Email
- Department
- Position/Job Title
- Work Location
- Join Date

**API:**
```bash
POST /api/employees
Authorization: Bearer {{ADMIN_TOKEN}}

{
  "employeeId": "EMP013",
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "department": "IT Department",
  "jobTitle": "Software Engineer",
  "workLocationId": "uuid-location"
}
```

---

#### Step 2: Enroll Face Template
```
URL: https://absensi-web-rouge.vercel.app/employees
Action: Click face icon on employee row
```

**Process:**
1. Upload foto wajah user (frontal, jelas, pencahayaan bagus)
2. System auto-detect face
3. Click "Enroll Face"
4. Face template tersimpan

**API (Alternative):**
```bash
POST /api/employees/{employee_id}/face/enroll
Authorization: Bearer {{ADMIN_TOKEN}}

{
  "templateVersion": 1,
  "payload": {
    "type": "EMBEDDING_V1",
    "embedding": [128 float values]
  },
  "qualityScore": 0.95
}
```

---

#### ~~Step 3: Register Device~~ ❌ TIDAK PERLU LAGI!

**Device otomatis terdaftar saat user login pertama kali dari mobile app.**

---

### **User Side (Mobile App)**

#### Step 1: Install & Open App
- Download APK
- Install di HP Android
- Buka aplikasi

#### Step 2: Face Login (First Time)
1. App akan meminta akses kamera
2. Arahkan wajah ke kamera (frontal, pencahayaan cukup)
3. App akan otomatis:
   - Detect wajah
   - Extract embedding
   - Kirim ke backend: `device ID` + `face embedding`
4. Backend akan:
   - **Auto-register device** (jika belum terdaftar)
   - Match face dengan database
   - Generate token JWT
5. **Login berhasil** → Masuk ke Home

#### Step 3: Daily Check-in/Check-out
- Klik "Check In" (pagi)
- Ambil selfie untuk bukti
- Submit → Absensi tercatat

---

## 🔄 Complete Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│              SIMPLIFIED USER ONBOARDING FLOW                       │
└────────────────────────────────────────────────────────────────────┘

ADMIN (Web Dashboard)           USER (Mobile App)
════════════════════             ══════════════════

1️⃣ Create Employee               ❌ Belum bisa login
   POST /api/employees
   ├─ Name, Email, Dept
   ├─ Job Title, Location
   └─ Status: Active

2️⃣ Enroll Face                   📷 User kirim foto ke Admin
   POST /face/enroll                (via WhatsApp/email)
   ├─ Upload foto user
   ├─ Extract embedding
   └─ Save to DB

3️⃣ Inform User:                  ✅ Akun siap!
   "Akun sudah aktif,
    silakan login"

                                  4️⃣ Open App
                                     └─ Camera ready

                                  5️⃣ Face Login (First Time)
                                     ├─ Scan wajah
                                     ├─ POST /face-login
                                     │   ├─ deviceId: "ANDROID-xxx"
                                     │   ├─ embedding: [...]
                                     │   └─ app: {platform, version}
                                     │
                                     ├─ Backend:
                                     │   ├─ Device belum ada?
                                     │   │   └─ Auto-register! ✨
                                     │   ├─ Match face
                                     │   └─ Generate token
                                     │
                                     └─ ✅ Login berhasil!

                                  6️⃣ Daily Usage
                                     └─ Check-in/Check-out
```

---

## ✅ What Changed?

### Before (Manual Device Registration):
```
Admin → Create Employee → Enroll Face → Register Device → Inform User
User → Login
```

### After (Auto Device Registration):
```
Admin → Create Employee → Enroll Face → Inform User
User → Login (device auto-registered) ✨
```

---

## 🔧 Technical Details

### Auto-Register Device Logic

**Location:** `/src/app/api/mobile/auth/face-login/route.ts`

```typescript
// Check if device exists
let device = await checkDeviceActive(input.deviceId)

if (!device) {
  // Auto-register new device
  const deviceLabel = `${input.app?.platform || 'Mobile'} Device - Auto Registered`
  
  const { data: newDevice } = await supabase
    .from('devices')
    .insert({
      device_id: input.deviceId,
      label: deviceLabel,
      is_active: true,
    })
    .select()
    .single()

  device = newDevice
}

// Continue with face matching...
```

### Device Naming Convention

**Auto-registered devices:**
- `android Device - Auto Registered`
- `ios Device - Auto Registered`

**Admin can later update label via web dashboard.**

---

## 📊 Onboarding Checklist

### For Admin:

```
☐ 1. Create employee
     URL: /employees → Add Employee
     
☐ 2. Enroll face
     URL: /employees → Click face icon
     Upload foto → Enroll Face
     
☐ 3. Inform user
     "Akun sudah aktif, silakan login via mobile app"
```

### For User:

```
☐ 1. Install app
     Download APK → Install
     
☐ 2. Open app & login
     Scan wajah → Login (device auto-registered)
     
☐ 3. Daily usage
     Check-in/Check-out setiap hari
```

---

## ⚠️ Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Face not recognized" | Face belum di-enroll atau threshold terlalu tinggi | Admin enroll face via `/employees` |
| "Employee inactive" | Employee status = inactive | Admin set status ke active |
| "Device blocked" | Device status = blocked (setelah auto-register) | Admin unblock di `/devices` |
| "Outside work location" | GPS di luar radius | User pindah ke lokasi kerja atau admin ubah radius |

---

## 🎯 Benefits

✅ **Faster onboarding** - Admin tidak perlu register device manual  
✅ **User-friendly** - User langsung bisa login tanpa setup tambahan  
✅ **Less admin work** - Admin cukup create employee + enroll face  
✅ **Auto-tracking** - Semua device yang pernah login tercatat otomatis  

---

## 📝 Notes

- Device yang auto-registered **default status = active**
- Admin bisa later **update device label** via web dashboard untuk clarity
- Admin tetap bisa **block device** kapan saja via `/devices` page
- **Threshold face match** = 0.70 (bisa diatur via env `FACE_MATCH_THRESHOLD`)

---

## 🔐 Security Considerations

✅ **Device whitelist** - Hanya device yang pernah login dengan face match yang terdaftar  
✅ **Face verification** - Device harus match dengan wajah di database  
✅ **Admin control** - Admin bisa block device sewaktu-waktu  
✅ **Session tracking** - Setiap login tercatat dengan device ID  

---

**Last Updated:** January 8, 2026
