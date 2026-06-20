// pages/api/templates/[id].ts
// GET    — fetch single template
// PATCH  — update template
// DELETE — soft-delete (set isActive: false) or hard delete

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { extractVariables } from '@/lib/templates/extract-variables'
import type { Template } from '@/types/template'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required.' })
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return await withAuth(req, res, async () => {
      try {
        const doc = await adminDb.collection('templates').doc(id).get()
        if (!doc.exists) return res.status(404).json({ error: 'Template not found.' })
        res.status(200).json({ template: { id: doc.id, ...(doc.data() as Omit<Template, 'id'>) } })
      } catch (err) {
        console.error('[GET /api/templates/[id]]', err)
        res.status(500).json({ error: 'Failed to fetch template.' })
      }
    })
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        const updates = { ...req.body }

        // Re-extract variables if content changed
        if (updates.markdownContent) {
          updates.variables = extractVariables(updates.markdownContent)
        }

        updates.updatedAt = new Date().toISOString()
        updates.updatedBy = uid

        await adminDb.collection('templates').doc(id).update(updates)

        await createAuditLog({
          action: 'TEMPLATE_UPDATE',
          entityType: 'template',
          entityId: id,
          performedBy: uid,
          performedByEmail: email,
          metadata: { fields: Object.keys(req.body) },
        })

        res.status(200).json({ success: true })
      } catch (err) {
        console.error('[PATCH /api/templates/[id]]', err)
        res.status(500).json({ error: 'Failed to update template.' })
      }
    })
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        // Hard delete — templates are not employee data, so permanent delete is fine
        await adminDb.collection('templates').doc(id).delete()

        await createAuditLog({
          action: 'TEMPLATE_DELETE',
          entityType: 'template',
          entityId: id,
          performedBy: uid,
          performedByEmail: email,
        })

        res.status(200).json({ success: true })
      } catch (err) {
        console.error('[DELETE /api/templates/[id]]', err)
        res.status(500).json({ error: 'Failed to delete template.' })
      }
    })
  }

  res.status(405).json({ error: 'Method not allowed.' })
}
