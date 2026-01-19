-- ================================================================
-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR
-- Buka: https://supabase.com/dashboard → Pilih Project → SQL Editor
-- ================================================================

-- 1. Create settings table jika belum ada
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- 3. Insert default settings (skip if already exists)
INSERT INTO app_settings (key, value, description, category) VALUES
  ('face_match_threshold', '0.60', 'Minimum similarity score for face recognition (0.0 - 1.0). Lower = easier to login, Higher = more secure.', 'face_recognition'),
  ('face_liveness_threshold', '0.80', 'Minimum liveness detection score (0.0 - 1.0). Detects if face is real or photo/video.', 'face_recognition'),
  ('capture_max_skew_seconds', '300', 'Maximum age of capture timestamp in seconds before it is considered invalid.', 'face_recognition'),
  ('geofence_enabled', 'true', 'Enable GPS geofencing for attendance validation.', 'attendance'),
  ('work_location_radius_meters', '100', 'Default radius for work location geofencing in meters.', 'attendance')
ON CONFLICT (key) DO NOTHING;

-- 4. Create trigger for auto-update timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- 5. Enable RLS (Row Level Security)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated to read settings" ON app_settings;
DROP POLICY IF EXISTS "Allow authenticated to update settings" ON app_settings;
DROP POLICY IF EXISTS "Allow service role full access" ON app_settings;

CREATE POLICY "Allow authenticated to read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access"
  ON app_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Verify data
SELECT * FROM app_settings ORDER BY category, key;

-- ================================================================
-- SELESAI! Refresh halaman settings di web admin
-- ================================================================
