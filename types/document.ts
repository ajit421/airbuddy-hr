// types/document.ts
// Generated document and version types for AirBuddy HR Platform

export type DocumentStatus = 'draft' | 'final'
export type ExportFormat = 'pdf' | 'docx' | 'md'

export interface DocumentRecord {
  id: string
  templateId: string
  documentType: string             // mirrors Template.type
  title: string                    // e.g. "Offer Letter — AB-2024-001"
  status: DocumentStatus
  currentVersion: number           // latest version number (starts at 1)

  // Audit timestamps
  createdAt: string                // ISO datetime string
  updatedAt: string                // ISO datetime string
  createdBy: string                // uid
}

export interface DocumentVersion {
  id: string
  versionNumber: number
  markdownContent: string

  // Export metadata
  exportedAs: ExportFormat | null
  exportStoragePath: string | null // Cloudinary URL of exported file

  // Signature
  hasSigned: boolean
  signedAt: string | null          // ISO datetime string

  // AI improvement
  aiImproved: boolean

  // Audit
  createdAt: string                // ISO datetime string
  createdBy: string                // uid
  changeNote: string               // Short description of what changed in this version
}

// Input types for API
export interface CreateDocumentInput {
  employeeId: string
  templateId: string
  customVariables?: Record<string, string>
}

export interface SaveVersionInput {
  employeeId: string
  markdownContent: string
  changeNote: string
  aiImproved: boolean
}
