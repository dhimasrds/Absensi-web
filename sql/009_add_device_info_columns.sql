-- Migration: Add device info columns to devices table
-- Description: Add columns for device model, OS version, manufacturer, app version, and last seen timestamp
-- Date: 2026-01-12

-- Add device_model column (e.g., "Samsung Galaxy S21", "iPhone 13 Pro")
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS device_model TEXT;

-- Add os_version column (e.g., "Android 13", "iOS 16.5")
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS os_version TEXT;

-- Add manufacturer column (e.g., "Samsung", "Apple", "Xiaomi")
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add app_version column (e.g., "1.0.0", "2.1.3")
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS app_version TEXT;

-- Add last_seen_at column to track when device was last used
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Create index on last_seen_at for querying recently active devices
CREATE INDEX IF NOT EXISTS idx_devices_last_seen_at 
ON public.devices (last_seen_at DESC NULLS LAST);

-- Add comment to columns for documentation
COMMENT ON COLUMN public.devices.device_model IS 'Device model name from mobile app (e.g., Samsung Galaxy S21)';
COMMENT ON COLUMN public.devices.os_version IS 'Operating system version (e.g., Android 13, iOS 16.5)';
COMMENT ON COLUMN public.devices.manufacturer IS 'Device manufacturer (e.g., Samsung, Apple)';
COMMENT ON COLUMN public.devices.app_version IS 'Mobile app version';
COMMENT ON COLUMN public.devices.last_seen_at IS 'Timestamp when device was last used for login';
