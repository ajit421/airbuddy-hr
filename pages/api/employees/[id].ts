// pages/api/employees/[id].ts
// GET    /api/employees/[id]  — fetch a single employee
// PUT    /api/employees/[id]  — update employee fields
// DELETE /api/employees/[id]  — soft delete

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { createAuditLog } from '@/lib/audit/logger'
import { FieldValue } from 'firebase-admin/firestore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing employee id' })
  }

  const docRef = adminDb.collection('employees').doc(id)

  /**
   * Resolve the employee document — supports two URL formats:
   *   1. Firestore doc ID:  /employees/ZxceoUiBySPgt6CTfGBB  (primary)
   *   2. employeeId field:  /employees/AB-2026-001           (human-friendly fallback)
   */
  async function resolveDoc() {
    const directSnap = await docRef.get()
    if (directSnap.exists) return directSnap

    // Fallback: query by employeeId field (e.g. AB-2026-001)
    const querySnap = await adminDb
      .collection('employees')
      .where('employeeId', '==', id)
      .limit(1)
      .get()

    if (!querySnap.empty) return querySnap.docs[0]
    return null
  }

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return withAuth(req, res, async () => {
      const snap = await resolveDoc()
      if (!snap) return res.status(404).json({ error: 'Employee not found' })
      return res.status(200).json({ employee: { id: snap.id, ...snap.data() } })
    })
  }

  // ── PUT (update) ─────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    return withAuth(req, res, async (uid, email) => {
      const snap = await resolveDoc()
      if (!snap) return res.status(404).json({ error: 'Employee not found' })

      // Strip fields that must never be overwritten via PUT
      const updates = { ...req.body }
      delete updates.id
      delete updates.employeeId
      delete updates.isDeleted
      delete updates.deletedAt
      delete updates.deletedBy
      delete updates.createdAt
      delete updates.createdBy

      await snap.ref.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      })

      const data = snap.data()!
      await createAuditLog({
        action: 'EMPLOYEE_UPDATE',
        entityType: 'employee',
        entityId: snap.id,
        performedBy: uid,
        performedByEmail: email,
        metadata: { employeeId: data.employeeId, fullName: data.fullName },
      })

      return res.status(200).json({ success: true })
    })
  }

  // ── DELETE (soft delete) ─────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    return withAuth(req, res, async (uid, email) => {
      const snap = await resolveDoc()
      if (!snap) return res.status(404).json({ error: 'Employee not found' })

      const data = snap.data()!
      if (data.isDeleted) return res.status(400).json({ error: 'Employee already deleted' })

      await snap.ref.update({
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      })

      await createAuditLog({
        action: 'EMPLOYEE_DELETE',
        entityType: 'employee',
        entityId: snap.id,
        performedBy: uid,
        performedByEmail: email,
        metadata: { employeeId: data.employeeId, fullName: data.fullName },
      })

      return res.status(200).json({ success: true })
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
