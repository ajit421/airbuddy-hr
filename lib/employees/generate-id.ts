// lib/employees/generate-id.ts
// Atomically increments the employee counter in /settings/company and
// returns a formatted employee ID like AB-2024-001.
// Must be called from API routes only (uses Admin SDK).

import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Generate the next unique employee ID using a Firestore transaction.
 *
 * Format: `{prefix}-{year}-{NNN}` e.g. `AB-2024-001`
 *
 * @returns The newly allocated employee ID string.
 */
export async function generateEmployeeId(): Promise<string> {
  const settingsRef = adminDb.collection('settings').doc('company')

  const newId = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(settingsRef)

    if (!snap.exists) {
      // Bootstrap settings doc on very first use
      const prefix = 'AB'
      const year = new Date().getFullYear()
      const counter = 1
      tx.set(settingsRef, {
        employeeIdPrefix: prefix,
        employeeIdYear: year,
        employeeIdCounter: counter,
        createdAt: FieldValue.serverTimestamp(),
      })
      return `${prefix}-${year}-${String(counter).padStart(3, '0')}`
    }

    const data = snap.data()!
    const prefix: string = data.employeeIdPrefix ?? 'AB'
    const year: number = data.employeeIdYear ?? new Date().getFullYear()
    const counter: number = (data.employeeIdCounter ?? 0) + 1

    tx.update(settingsRef, { employeeIdCounter: counter })

    return `${prefix}-${year}-${String(counter).padStart(3, '0')}`
  })

  return newId
}
