// types/template.ts
// Document template types for AirBuddy HR Platform

import type { EmployeeStatus } from './employee'

export type DocumentType =
  | 'offer_letter'
  | 'nda'
  | 'internship_letter'
  | 'salary_slip'
  | 'experience_letter'
  | 'appointment_letter'

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
