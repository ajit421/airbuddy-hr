// pages/api/templates/index.ts
// GET — list all templates
// POST — create a new template

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { extractVariables } from '@/lib/templates/extract-variables'
import type { Template } from '@/types/template'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        const snapshot = await adminDb.collection('templates').orderBy('createdAt', 'desc').get()
        const templates: Template[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Template, 'id'>),
        }))
        res.status(200).json({ templates })
      } catch (err) {
        console.error('[GET /api/templates]', err)
        res.status(500).json({ error: 'Failed to fetch templates.' })
      }
    })
  }

  if (req.method === 'POST') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        const { name, type, description, markdownContent, applicableStatus, isActive, isDefault } =
          req.body

        if (!name || !type || !markdownContent) {
          return res.status(400).json({ error: 'name, type, and markdownContent are required.' })
        }

        const now = new Date().toISOString()
        const variables = extractVariables(markdownContent)

        const docRef = await adminDb.collection('templates').add({
          name,
          type,
          description: description ?? '',
          markdownContent,
          variables,
          applicableStatus: applicableStatus ?? [],
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
          updatedBy: uid,
        })

        await createAuditLog({
          action: 'TEMPLATE_CREATE',
          entityType: 'template',
          entityId: docRef.id,
          performedBy: uid,
          performedByEmail: email,
          metadata: { templateName: name, type },
        })

        res.status(201).json({ id: docRef.id })
      } catch (err) {
        console.error('[POST /api/templates]', err)
        res.status(500).json({ error: 'Failed to create template.' })
      }
    })
  }

  res.status(405).json({ error: 'Method not allowed.' })
}
