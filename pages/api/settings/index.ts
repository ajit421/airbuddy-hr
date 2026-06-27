// pages/api/settings/index.ts
// GET  — fetch company settings
// PUT / PATCH — update company settings

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import type { CompanySettings } from '@/types/settings'

const SETTINGS_DOC = 'settings/company'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return await withAuth(req, res, async () => {
      try {
        const doc = await adminDb.doc(SETTINGS_DOC).get()
        const settings = doc.exists ? (doc.data() as CompanySettings) : null

        res.status(200).json({ settings })
      } catch (err) {
        console.error('[GET /api/settings]', err)
        res.status(500).json({ error: 'Failed to fetch settings.' })
      }
    })
  }

  // ── PUT / PATCH ───────────────────────────────────────────────────────────
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        // Whitelist only CompanySettings fields — prevents mass assignment
        const {
          companyName,
          companyAddress,
          companyCIN,
          companyEmail,
          companyPhone,
          hrName,
          hrDesignation,
          signatureStoragePath,
          employeeIdPrefix,
          employeeIdYear,
          employeeIdCounter,
        } = req.body as Partial<CompanySettings>

        // Build update object with only provided (non-undefined) fields
        const updates: Record<string, unknown> = {}
        if (companyName !== undefined) updates.companyName = companyName
        if (companyAddress !== undefined) updates.companyAddress = companyAddress
        if (companyCIN !== undefined) updates.companyCIN = companyCIN
        if (companyEmail !== undefined) updates.companyEmail = companyEmail
        if (companyPhone !== undefined) updates.companyPhone = companyPhone
        if (hrName !== undefined) updates.hrName = hrName
        if (hrDesignation !== undefined) updates.hrDesignation = hrDesignation
        if (signatureStoragePath !== undefined) updates.signatureStoragePath = signatureStoragePath
        if (employeeIdPrefix !== undefined) updates.employeeIdPrefix = employeeIdPrefix
        if (employeeIdYear !== undefined) updates.employeeIdYear = employeeIdYear
        if (employeeIdCounter !== undefined) updates.employeeIdCounter = employeeIdCounter

        // Audit timestamps — always system-controlled
        updates.updatedAt = new Date().toISOString()
        updates.updatedBy = uid

        await adminDb.doc(SETTINGS_DOC).set(updates, { merge: true })

        await createAuditLog({
          action: 'SETTINGS_UPDATE',
          entityType: 'settings',
          entityId: 'company',
          performedBy: uid,
          performedByEmail: email,
          metadata: { fields: Object.keys(updates).filter((k) => k !== 'updatedAt' && k !== 'updatedBy') },
        })

        res.status(200).json({ success: true })
      } catch (err) {
        console.error('[PUT /api/settings]', err)
        res.status(500).json({ error: 'Failed to update settings.' })
      }
    })
  }

  res.status(405).json({ error: 'Method not allowed.' })
}
