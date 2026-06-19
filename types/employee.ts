// types/employee.ts
// Core employee domain types for AirBuddy HR Platform

export type EmployeeStatus =
  | 'intern'
  | 'full-time'
  | 'contract'
  | 'resigned'
  | 'terminated'

export interface BankDetails {
  bankName: string
  accountNumber: string
  ifscCode: string
  accountType: 'savings' | 'current'
}

export interface EmployeeAddress {
  street: string
  city: string
  state: string
  pincode: string
}

export interface Employee {
  id: string
  employeeId: string          // e.g. AB-2024-001
  fullName: string
  fatherName: string
  gender: 'male' | 'female' | 'other'
  dateOfBirth: string         // ISO date string YYYY-MM-DD
  email: string
  mobile: string
  address: EmployeeAddress
  aadhaarNumber: string
  panNumber: string
  department: string
  designation: string
  joiningDate: string         // ISO date string YYYY-MM-DD
  status: EmployeeStatus
  salary: number
  bankDetails: BankDetails
  profilePhotoPath: string    // Cloudinary public ID or URL

  // Soft delete
  isDeleted: boolean
  deletedAt: string | null    // ISO datetime string
  deletedBy: string | null    // uid of user who deleted

  // Audit timestamps
  createdAt: string           // ISO datetime string
  updatedAt: string           // ISO datetime string
  createdBy: string           // uid
  updatedBy: string           // uid
}

// Partial employee for create/update operations
export type CreateEmployeeInput = Omit<
  Employee,
  'id' | 'employeeId' | 'isDeleted' | 'deletedAt' | 'deletedBy' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>

export type UpdateEmployeeInput = Partial<
  Omit<Employee, 'id' | 'employeeId' | 'isDeleted' | 'deletedAt' | 'deletedBy' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
>
