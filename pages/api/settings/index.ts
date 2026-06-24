// pages/api/settings/index.ts
// GET  — fetch company settings (and seed default templates on first load)
// PUT / PATCH — update company settings

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { seedDefaultTemplates } from '@/lib/templates/seed-defaults'
import type { CompanySettings } from '@/types/settings'

const SETTINGS_DOC = 'settings/company'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return await withAuth(req, res, async () => {
      try {
        const doc = await adminDb.doc(SETTINGS_DOC).get()
        const settings = doc.exists ? (doc.data() as CompanySettings) : null

        // Seed default templates if this is first load (empty templates collection)
        seedDefaultTemplates().catch((err) =>
          console.error('[Settings GET] Seed error (non-blocking):', err)
        )

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
        const updates = { ...req.body }
        updates.updatedAt = new Date().toISOString()
        updates.updatedBy = uid

        await adminDb.doc(SETTINGS_DOC).set(updates, { merge: true })

        await createAuditLog({
          action: 'SETTINGS_UPDATE',
          entityType: 'settings',
          entityId: 'company',
          performedBy: uid,
          performedByEmail: email,
          metadata: { fields: Object.keys(req.body) },
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
