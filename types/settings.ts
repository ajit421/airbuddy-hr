// types/settings.ts
// Company settings types for AirBuddy HR Platform
// Stored in Firestore at /settings/company (single document)

export interface CompanySettings {
  companyName: string
  companyAddress: string
  companyCIN: string               // Corporate Identification Number
  companyPAN: string               // PAN of the company (e.g. AABCA1234Z)
  companyRegisteredAddress: string // Legal registered office address used in NDA/legal docs
                                   // (e.g. "Motihari, Bihar" — separate from companyAddress)
  companyEmail: string
  companyPhone: string

  // HR signatory info
  hrName: string
  hrDesignation: string

  // Signature — stored in Cloudinary
  signatureStoragePath: string     // Cloudinary URL of the HR signature image

  // Employee ID generation
  employeeIdPrefix: string         // e.g. 'AB'
  employeeIdYear: number           // e.g. 2024
  employeeIdCounter: number        // Auto-incrementing counter (e.g. 42 → AB-2024-042)

  // Audit timestamps
  updatedAt: string                // ISO datetime string
  updatedBy: string                // uid of user who last updated
}

// Partial for update operations (all fields optional except audit)
export type UpdateCompanySettingsInput = Partial<
  Omit<CompanySettings, 'updatedAt' | 'updatedBy'>
>
