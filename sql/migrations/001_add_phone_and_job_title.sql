-- Migration: Add phone_number and job_title to employees table
-- Date: 2026-01-08

-- Add phone_number column
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add job_title column
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS job_title text;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.phone_number IS 'Employee phone number (optional)';
COMMENT ON COLUMN public.employees.job_title IS 'Employee job title/position';
