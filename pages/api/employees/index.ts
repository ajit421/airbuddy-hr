// pages/api/employees/index.ts
// GET  /api/employees  — list all non-deleted employees
// POST /api/employees  — create a new employee

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { generateEmployeeId } from '@/lib/employees/generate-id'
import { createAuditLog } from '@/lib/audit/logger'
import { FieldValue } from 'firebase-admin/firestore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return withAuth(req, res, async () => {
      const snap = await adminDb
        .collection('employees')
        .where('isDeleted', '==', false)
        .orderBy('createdAt', 'desc')
        .get()

      const employees = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      return res.status(200).json({ employees })
    })
  }

  if (req.method === 'POST') {
    return withAuth(req, res, async (uid, email) => {
      const body = req.body
      if (!body.fullName || !body.email || !body.department || !body.designation || !body.status) {
        return res.status(400).json({ error: 'Missing required fields: fullName, email, department, designation, status' })
      }

      const employeeId = await generateEmployeeId()
      const now = FieldValue.serverTimestamp()

      const employeeData = {
        ...body,
        employeeId,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        createdAt: now,
        updatedAt: now,
        createdBy: uid,
        updatedBy: uid,
      }

      const docRef = await adminDb.collection('employees').add(employeeData)

      await createAuditLog({
        action: 'EMPLOYEE_CREATE',
        entityType: 'employee',
        entityId: docRef.id,
        performedBy: uid,
        performedByEmail: email,
        metadata: { employeeId, fullName: body.fullName },
      })

      return res.status(201).json({ id: docRef.id, employeeId })
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
