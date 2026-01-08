-- Fix dummy attendance records that have invalid proof image paths
-- Set proof_image_path to NULL if the file doesn't exist in storage

-- For dummy records (you can identify them by the 'dummy/' prefix)
UPDATE attendance_logs
SET 
  proof_image_path = NULL,
  proof_image_mime = NULL
WHERE proof_image_path LIKE 'dummy/%';

-- Show affected records
SELECT 
  id,
  employee_id,
  type,
  timestamp,
  proof_image_path
FROM attendance_logs
WHERE proof_image_path IS NULL
ORDER BY timestamp DESC
LIMIT 10;
