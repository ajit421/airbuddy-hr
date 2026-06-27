// lib/export/file-naming.ts
// Phase 15.6 — Canonical file naming for all exported documents.
//
// Convention: {employeeId}_{DocumentType}_{YYYYMMDD}.{ext}
// Example:    AB-2024-001_OfferLetter_20240815.pdf

import { format } from 'date-fns'

/**
 * Converts a snake_case or space-separated document type string into PascalCase.
 * e.g. "offer_letter" → "OfferLetter", "NDA Agreement" → "NdaAgreement"
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

/**
 * Generate a canonical export filename.
 *
 * @param employeeId   The human-readable employee ID, e.g. "AB-2024-001"
 * @param documentType The document type or title, e.g. "offer_letter" or "Offer Letter"
 * @param ext          The file extension: 'pdf' | 'docx' | 'md'
 * @returns            e.g. "AB-2024-001_OfferLetter_20240815.pdf"
 */
export function generateFileName(
  employeeId: string,
  documentType: string,
  ext: 'pdf' | 'docx' | 'md' | 'png'
): string {
  const typeLabel = toPascalCase(documentType)
  const dateStr   = format(new Date(), 'yyyyMMdd')
  // Sanitise employeeId (strip any chars that are not alphanum, dash, underscore)
  const safeId    = employeeId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${safeId}_${typeLabel}_${dateStr}.${ext}`
}
