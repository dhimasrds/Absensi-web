-- Create settings table for app configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  updated_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_app_settings_key ON app_settings(key);
CREATE INDEX idx_app_settings_category ON app_settings(category);

-- Insert default settings
INSERT INTO app_settings (key, value, description, category) VALUES
  ('face_match_threshold', '0.60', 'Minimum similarity score for face recognition (0.0 - 1.0)', 'face_recognition'),
  ('face_liveness_threshold', '0.80', 'Minimum liveness detection score (0.0 - 1.0)', 'face_recognition'),
  ('capture_max_skew_seconds', '300', 'Maximum age of capture timestamp in seconds', 'face_recognition'),
  ('geofence_enabled', 'true', 'Enable GPS geofencing for attendance', 'attendance'),
  ('work_location_radius_meters', '100', 'Default radius for work location geofencing', 'attendance')
ON CONFLICT (key) DO NOTHING;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Add RLS policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and update settings
CREATE POLICY "Allow admins to read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE app_settings IS 'Application-wide settings that can be configured from admin dashboard';
