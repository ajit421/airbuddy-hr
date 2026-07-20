// types/template.ts
// Document template types for AirBuddy HR Platform

import type { EmployeeStatus } from './employee'

export type DocumentType =
  | 'nda'
  | 'offer_letter'
  | 'certificate'

export interface Template {
  id: string
  name: string
  type: DocumentType
  description: string
  markdownContent: string
  variables: string[]              // Array of {{variable_name}} keys found in content
  applicableStatus: EmployeeStatus[] // Which employee statuses this template applies to

  isActive: boolean
  isDefault: boolean

  // Audit timestamps
  createdAt: string                // ISO datetime string
  updatedAt: string                // ISO datetime string
  createdBy: string                // uid
  updatedBy: string                // uid
}

// Partial template for create/update operations
export type CreateTemplateInput = Omit<
  Template,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>

export type UpdateTemplateInput = Partial<
  Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
>

// ── Certificate-specific types ─────────────────────────────────────────────

/**
 * Config for a single text field drawn at fixed pixel coordinates on the
 * certificate background image.
 */
export interface CertificateTextFieldConfig {
  key: string        // variable name, e.g. 'full_name'
  x: number          // center x coordinate in pixels
  y: number          // baseline y coordinate in pixels
  fontSize: number   // in pixels
  color: string      // CSS hex color, e.g. '#1a2456'
  fontWeight: 'normal' | 'bold'
  align: 'center' | 'left' | 'right'
}

/**
 * Config for the word-wrapped body paragraph box on the certificate.
 */
export interface CertificateBodyBoxConfig {
  x: number             // center x of the text block
  y: number             // y of the first line baseline
  maxCharsPerLine: number
  fontSize: number      // in pixels
  color: string         // CSS hex color
  lineHeight: number    // vertical spacing between lines in pixels
}

/**
 * Extended template shape for certificate documents.
 * Stored in the same Firestore `templates` collection as markdown templates,
 * but with type: 'certificate' and these additional fields.
 * markdownContent is always '' for certificates.
 */
export interface CertificateTemplate extends Template {
  type: 'certificate'
  backgroundImageUrl: string             // Cloudinary public URL of background PNG
  imageWidth: number                     // e.g. 2000
  imageHeight: number                    // e.g. 1414
  textFields: CertificateTextFieldConfig[]
  bodyBox: CertificateBodyBoxConfig
  /**
   * Sentence template for the body paragraph, uses {{variable}} placeholders.
   * Example: "This is to certify that {{full_name}} {{relation_type}} ..."
   */
  bodyTemplate: string
}
