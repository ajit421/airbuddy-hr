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

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return withAuth(req, res, async () => {
      const snap = await docRef.get()
      if (!snap.exists) return res.status(404).json({ error: 'Employee not found' })
      return res.status(200).json({ employee: { id: snap.id, ...snap.data() } })
    })
  }

  // ── PUT (update) ─────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    return withAuth(req, res, async (uid, email) => {
      const snap = await docRef.get()
      if (!snap.exists) return res.status(404).json({ error: 'Employee not found' })

      // Strip fields that must never be overwritten via PUT
      const { id: _id, employeeId, isDeleted, deletedAt, deletedBy, createdAt, createdBy, ...updates } = req.body

      await docRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      })

      const data = snap.data()!
      await createAuditLog({
        action: 'EMPLOYEE_UPDATE',
        entityType: 'employee',
        entityId: id,
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
      const snap = await docRef.get()
      if (!snap.exists) return res.status(404).json({ error: 'Employee not found' })

      const data = snap.data()!
      if (data.isDeleted) return res.status(400).json({ error: 'Employee already deleted' })

      await docRef.update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      })

      await createAuditLog({
        action: 'EMPLOYEE_DELETE',
        entityType: 'employee',
        entityId: id,
        performedBy: uid,
        performedByEmail: email,
        metadata: { employeeId: data.employeeId, fullName: data.fullName },
      })

      return res.status(200).json({ success: true })
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
