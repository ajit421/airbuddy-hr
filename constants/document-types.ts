// constants/document-types.ts
// Document type labels and applicable employee status mapping.
// Used in template management, document generation, and UI display.

import type { DocumentType } from '@/types/template'
import type { EmployeeStatus } from '@/types/employee'

/**
 * Human-readable display labels for each document type.
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  nda:                 'NDA Agreement',
  internship_letter:   'Internship Letter',
  salary_slip:         'Salary Slip',
  experience_letter:   'Experience Letter',
  appointment_letter:  'Appointment Letter',
  offer_letter:        'Employment Offer Letter',
  certificate:         'Certificate',
}

/**
 * Which employee statuses each document type is applicable to.
 * Used to filter templates in the document generation wizard (Step 1).
 *
 * Rules:
 *   - nda               → full-time, contract, intern
 *   - internship_letter → intern only
 *   - salary_slip       → full-time, contract
 *   - experience_letter → resigned, terminated (post-employment)
 *   - appointment_letter → full-time
 *   - certificate       → intern, full-time, contract
 */
export const APPLICABLE_STATUS_MAP: Record<DocumentType, EmployeeStatus[]> = {
  nda:                 ['full-time', 'contract', 'intern'],
  internship_letter:   ['intern'],
  salary_slip:         ['full-time', 'contract'],
  experience_letter:   ['resigned', 'terminated', 'full-time', 'contract'],
  appointment_letter:  ['full-time'],
  offer_letter:        ['full-time', 'contract'],
  certificate:         ['intern'],
}

/**
 * All document types as an array (for dropdowns and iteration).
 */
export const ALL_DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]

/**
 * Returns the human-readable label for a document type.
 * Falls back to the raw type string if not found.
 */
export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type
}

/**
 * Returns the applicable employee statuses for a given document type.
 */
export function getApplicableStatuses(type: DocumentType): EmployeeStatus[] {
  return APPLICABLE_STATUS_MAP[type] ?? []
}
