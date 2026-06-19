// types/audit.ts
// Audit log types for AirBuddy HR Platform
// The audit_logs collection is append-only — no updates or deletes

export type AuditAction =
  // Auth actions
  | 'LOGIN'
  | 'LOGOUT'
  // Employee actions
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_UPDATE'
  | 'EMPLOYEE_DELETE'
  // File actions
  | 'FILE_UPLOAD'
  | 'FILE_DELETE'
  // OCR actions
  | 'OCR_TRIGGERED'
  | 'OCR_REVIEWED'
  // Template actions
  | 'TEMPLATE_CREATE'
  | 'TEMPLATE_UPDATE'
  | 'TEMPLATE_DELETE'
  // Document actions
  | 'DOCUMENT_GENERATE'
  | 'DOCUMENT_AI_IMPROVE'
  | 'DOCUMENT_EXPORT'
  // Settings actions
  | 'SETTINGS_UPDATE'
  | 'SIGNATURE_UPDATE'

export type AuditEntityType =
  | 'employee'
  | 'file'
  | 'template'
  | 'document'
  | 'settings'
  | 'auth'

export interface AuditLog {
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string                 // ID of the affected entity
  performedBy: string              // uid of the user who performed the action
  performedByEmail: string         // email of the user
  ipAddress?: string               // IP address of the request (optional)
  metadata?: Record<string, unknown> // Additional context (e.g. employee name, export format)
  timestamp: string                // ISO datetime string (set by server)
}

// Input type — used when creating a new audit log entry
export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'timestamp'>
