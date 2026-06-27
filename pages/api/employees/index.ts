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
      try {
        // NOTE: No orderBy here — composite index (isDeleted + createdAt) needs
        // Firebase Console setup. We sort in memory to avoid the index requirement.
        const snap = await adminDb
          .collection('employees')
          .where('isDeleted', '==', false)
          .get()

        interface SimpleEmployee {
          createdAt?: {
            _seconds?: number
            seconds?: number
          }
        }

        const employees = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          // Sort newest first using Firestore Timestamp _seconds field
          .sort((a, b) => {
            const aEmp = a as SimpleEmployee
            const bEmp = b as SimpleEmployee
            const aTs = aEmp.createdAt?._seconds ?? aEmp.createdAt?.seconds ?? 0
            const bTs = bEmp.createdAt?._seconds ?? bEmp.createdAt?.seconds ?? 0
            return bTs - aTs
          })

        return res.status(200).json({ employees })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[GET /api/employees] Firestore error:', msg)
        return res.status(500).json({ error: 'Failed to fetch employees', detail: msg })
      }
    })
  }

  if (req.method === 'POST') {
    return withAuth(req, res, async (uid, email) => {
      const body = req.body
      if (!body.fullName || !body.email || !body.department || !body.designation || !body.status) {
        return res.status(400).json({ error: 'Missing required fields: fullName, email, department, designation, status' })
      }

      // Whitelist only expected employee fields — prevents mass assignment
      const {
        fullName,
        email: empEmail,
        department,
        designation,
        status,
        phone,
        dateOfBirth,
        dateOfJoining,
        address,
        panNumber,
        aadhaarNumber,
        fatherName,
        bankAccountNumber,
        bankName,
        bankIFSC,
        emergencyContactName,
        emergencyContactPhone,
        notes,
      } = body

      const employeeId = await generateEmployeeId()
      const now = FieldValue.serverTimestamp()

      const employeeData = {
        fullName,
        email: empEmail,
        department,
        designation,
        status,
        // Optional fields (undefined values are omitted by Firestore automatically)
        ...(phone !== undefined && { phone }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(dateOfJoining !== undefined && { dateOfJoining }),
        ...(address !== undefined && { address }),
        ...(panNumber !== undefined && { panNumber }),
        ...(aadhaarNumber !== undefined && { aadhaarNumber }),
        ...(fatherName !== undefined && { fatherName }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(bankName !== undefined && { bankName }),
        ...(bankIFSC !== undefined && { bankIFSC }),
        ...(emergencyContactName !== undefined && { emergencyContactName }),
        ...(emergencyContactPhone !== undefined && { emergencyContactPhone }),
        ...(notes !== undefined && { notes }),
        // System-controlled fields — never accept from client
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
        metadata: { employeeId, fullName },
      })

      return res.status(201).json({ id: docRef.id, employeeId })
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
