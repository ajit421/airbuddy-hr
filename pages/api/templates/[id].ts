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
        // Whitelist only updateable template fields — prevents mass assignment
        const {
          name,
          type,
          description,
          markdownContent,
          variables,
          applicableStatus,
          isActive,
          isDefault,
          backgroundImageUrl,
        } = req.body as Partial<Template> & { backgroundImageUrl?: string }

        const currentDoc = await adminDb.collection('templates').doc(id).get()
        if (!currentDoc.exists) {
          return res.status(404).json({ error: 'Template not found.' })
        }
        const currentType = type || currentDoc.data()?.type

        const updates: Record<string, unknown> = {}
        if (name !== undefined) updates.name = name
        if (type !== undefined) updates.type = type
        if (description !== undefined) updates.description = description
        if (isActive !== undefined) updates.isActive = isActive
        if (isDefault !== undefined) updates.isDefault = isDefault
        if (applicableStatus !== undefined) updates.applicableStatus = applicableStatus
        if (variables !== undefined) updates.variables = variables
        if (backgroundImageUrl !== undefined) updates.backgroundImageUrl = backgroundImageUrl

        // Re-extract variables if content changed (non-certificates only)
        if (markdownContent !== undefined) {
          updates.markdownContent = markdownContent
          if (currentType !== 'certificate') {
            updates.variables = extractVariables(markdownContent)
          }
        }

        // If certificate fields are updated, dynamically update variables
        if (currentType === 'certificate') {
          const currentData = currentDoc.data() || {}
          const newBodyTemplate = req.body.bodyTemplate !== undefined ? req.body.bodyTemplate : currentData.bodyTemplate
          const newTextFields = req.body.textFields !== undefined ? req.body.textFields : currentData.textFields

          if (req.body.bodyTemplate !== undefined || req.body.textFields !== undefined) {
            const bodyVars = newBodyTemplate ? extractVariables(newBodyTemplate) : []
            const fieldVars = Array.isArray(newTextFields) ? newTextFields.map((f: any) => f.key) : []
            updates.variables = [...new Set([...bodyVars, ...fieldVars])]
          }
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
          metadata: { fields: Object.keys(updates).filter((k) => k !== 'updatedAt' && k !== 'updatedBy') },
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
