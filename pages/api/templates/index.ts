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
    return await withAuth(req, res, async () => {
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
        const {
          name,
          type,
          description,
          markdownContent,
          applicableStatus,
          isActive,
          isDefault,
          // Certificate-specific fields
          backgroundImageUrl,
          imageWidth,
          imageHeight,
          textFields,
          bodyBox,
          bodyTemplate,
        } = req.body

        if (!name || !type) {
          return res.status(400).json({ error: 'name and type are required.' })
        }

        // For certificate type, markdownContent is not required
        if (type !== 'certificate' && !markdownContent) {
          return res.status(400).json({ error: 'markdownContent is required for non-certificate templates.' })
        }

        const now = new Date().toISOString()
        const content = markdownContent ?? ''
        const variables = type === 'certificate'
          ? [...new Set([
              ...(bodyTemplate ? extractVariables(bodyTemplate) : []),
              ...(Array.isArray(textFields) ? textFields.map((f: any) => f.key) : [])
            ])]
          : extractVariables(content)

        const docData: Record<string, unknown> = {
          name,
          type,
          description: description ?? '',
          markdownContent: content,
          variables,
          applicableStatus: applicableStatus ?? [],
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
          updatedBy: uid,
        }

        // Persist certificate-specific config fields if present
        if (type === 'certificate') {
          if (backgroundImageUrl !== undefined) docData.backgroundImageUrl = backgroundImageUrl
          if (imageWidth !== undefined) docData.imageWidth = imageWidth
          if (imageHeight !== undefined) docData.imageHeight = imageHeight
          if (textFields !== undefined) docData.textFields = textFields
          if (bodyBox !== undefined) docData.bodyBox = bodyBox
          if (bodyTemplate !== undefined) docData.bodyTemplate = bodyTemplate
        }

        const docRef = await adminDb.collection('templates').add(docData)

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
