-- ====================================================
-- Add GPS Coordinates to Attendance Logs
-- ====================================================

-- Add latitude and longitude columns to attendance_logs table
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN public.attendance_logs.latitude IS 'GPS latitude coordinate (-90 to 90 degrees)';
COMMENT ON COLUMN public.attendance_logs.longitude IS 'GPS longitude coordinate (-180 to 180 degrees)';

-- Create index for location-based queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_location 
ON public.attendance_logs (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment on index
COMMENT ON INDEX idx_attendance_logs_location IS 'Index for location-based attendance queries and geofencing';
