// ====================================================
// Database Types for Attendance System
// ====================================================

export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT'
export type AttendanceSource = 'WEB_ADMIN' | 'ANDROID'
export type VerificationMethod = 'FACE' | 'MANUAL_ADMIN'
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED'

// ====================================================
// Table Types
// ====================================================

export interface Profile {
  user_id: string
  role: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  employee_id: string
  full_name: string
  email: string | null
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  device_id: string
  label: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FaceTemplate {
  id: string
  employee_id: string
  template_version: number
  embedding: number[]
  is_active: boolean
  quality_score: number | null
  created_at: string
  updated_at: string
}

export interface MobileSession {
  id: string
  employee_id: string
  device_id: string
  refresh_token_hash: string
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export interface AttendanceLog {
  id: string
  employee_id: string
  type: AttendanceType
  timestamp: string
  source: AttendanceSource
  device_id: string | null
  client_capture_id: string | null
  captured_at: string | null
  verification_method: VerificationMethod
  verification_status: VerificationStatus
  match_score: number | null
  liveness_score: number | null
  note: string | null
  proof_image_path: string | null
  proof_image_mime: string | null
  created_at: string
}

// ====================================================
// Extended Types with Relations
// ====================================================

export interface AttendanceLogWithEmployee extends AttendanceLog {
  employee?: Employee
}

export interface EmployeeWithFaceTemplate extends Employee {
  face_template?: FaceTemplate
}

// ====================================================
// API Response Types
// ====================================================

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  meta: {
    requestId: string
    pagination?: PaginationMeta
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// ====================================================
// RPC Response Types
// ====================================================

export interface FaceIdentifyResult {
  employee_id: string
  score: number
}
