# Manual Migration: Add phone_number and job_title columns

## ⚠️ Action Required

You need to manually add two columns to the `employees` table in Supabase.

---

## 📋 Steps

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/lvtadyvwoalfnqvwzjzm

### 2. Navigate to SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 3. Run This SQL

```sql
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS job_title text;
```

### 4. Click **RUN** button

---

## ✅ Verify

After running the SQL, verify the columns exist:

```sql
SELECT 
  id, 
  employee_id, 
  full_name, 
  phone_number,  -- Should not error
  job_title      -- Should not error
FROM public.employees
LIMIT 1;
```

---

## 🔄 Alternative: Via Supabase Table Editor

If you prefer GUI:

1. Go to **Table Editor** → **employees**
2. Click **+ Add Column**
3. Add column:
   - Name: `phone_number`
   - Type: `text`
   - Nullable: ✅ (checked)
4. Click **+ Add Column** again
5. Add column:
   - Name: `job_title`
   - Type: `text`
   - Nullable: ✅ (checked)
6. Save

---

## 📝 What This Enables

After migration, users can:
- Add phone number when creating employee ✅
- Add job title when creating employee ✅
- Update phone number via API ✅
- Update job title via API ✅

---

**Status:** ⏳ Waiting for manual migration
**File:** `sql/migrations/001_add_phone_and_job_title.sql`
