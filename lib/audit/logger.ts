// lib/audit/logger.ts
// Append-only audit log writer — called only from API routes (server-side).
// Never throws: any failure is caught and logged silently so it never
// blocks the main operation that triggered it.

import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { CreateAuditLogInput } from '@/types/audit'

/**
 * Write an audit log entry to /audit_logs in Firestore.
 *
 * @param data - All fields except `id` and `timestamp` (set automatically).
 */
export async function createAuditLog(data: CreateAuditLogInput): Promise<void> {
  try {
    await adminDb.collection('audit_logs').add({
      ...data,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    // Never propagate — audit failures must not break business operations
    console.error('[AuditLog] Failed to write audit log:', err)
  }
}
