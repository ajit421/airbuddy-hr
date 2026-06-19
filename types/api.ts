// types/api.ts
// Shared API request/response types for AirBuddy HR Platform
// Used by both Next.js API route handlers and client-side fetch calls

// ---------------------------------------------------------------------------
// Generic response wrappers
// ---------------------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export interface ApiError {
  success?: false
  error: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ---------------------------------------------------------------------------
// Employee API
// ---------------------------------------------------------------------------

export interface ListEmployeesQuery {
  status?: string
  search?: string
  limit?: number
  page?: number
}

export interface GetEmployeeResponse {
  employee: import('./employee').Employee
}

export interface CreateEmployeeResponse {
  employeeId: string               // Auto-generated e.g. AB-2024-001
  id: string                       // Firestore document ID
}

// ---------------------------------------------------------------------------
// File API
// ---------------------------------------------------------------------------

export type FileType = 'aadhaar' | 'pan' | 'resume' | 'photo'

export interface EmployeeFile {
  fileId: string
  fileType: FileType
  fileName: string
  mimeType: string
  cloudinaryUrl: string
  publicId: string
  ocrStatus: 'pending' | 'completed' | 'failed' | 'skipped'
  ocrData?: Record<string, unknown>
  ocrReviewed?: boolean
  ocrReviewedAt?: string
  uploadedAt: string
  uploadedBy: string
}

export interface UploadFileRequest {
  fileType: FileType
  fileName: string
  mimeType: string
  base64Data: string
}

export interface UploadFileResponse {
  fileId: string
  cloudinaryUrl: string
  publicId: string
}

// ---------------------------------------------------------------------------
// OCR API
// ---------------------------------------------------------------------------

export interface OcrExtractRequest {
  cloudinaryUrl: string
  fileType: 'aadhaar' | 'pan'
  employeeId: string
  fileId: string
}

export interface OcrExtractResponse {
  success: boolean
  data?: Record<string, string>
  rawText?: string
}

// ---------------------------------------------------------------------------
// Template API
// ---------------------------------------------------------------------------

export interface ListTemplatesQuery {
  type?: string
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// Document API
// ---------------------------------------------------------------------------

export interface GenerateDocumentRequest {
  employeeId: string
  templateId: string
  customVariables?: Record<string, string>
}

export interface GenerateDocumentResponse {
  documentId: string
  markdownContent: string
  missingVariables: string[]
  versionId: string
}

export interface AiImproveRequest {
  markdownContent: string
  documentType: string
}

export interface AiImproveResponse {
  improvedMarkdown: string
}

// ---------------------------------------------------------------------------
// Export API
// ---------------------------------------------------------------------------

export interface ExportPdfRequest {
  markdownContent: string
  employeeId: string
  documentId: string
  versionId: string
  addSignature: boolean
  documentTitle: string
}

export interface ExportDocxRequest {
  markdownContent: string
  employeeId: string
  documentId: string
  documentTitle: string
}

export interface ExportMdRequest {
  markdownContent: string
  documentTitle: string
  employeeId: string
}

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------

export interface GetSettingsResponse {
  settings: import('./settings').CompanySettings
}
