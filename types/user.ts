// types/user.ts
// HR user account types for AirBuddy HR Platform
// Users are created manually in Firestore — only super_admin role exists

export type UserRole = 'super_admin'

export interface User {
  uid: string                      // Firebase Auth UID — also the Firestore document ID
  email: string
  displayName: string
  role: UserRole
  photoURL: string                 // Google profile photo URL

  createdAt: string                // ISO datetime string
  lastLogin: string                // ISO datetime string
  isActive: boolean
}
