// pages/api/certificates/render.ts
// POST — Render a certificate for an employee and stream it as a PNG download.
//
// Body: {
//   templateId: string,
//   employeeId: string,
//   data: Record<string, string>   // the 13 certificate variable values
// }
// Returns: PNG file as image/png download

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { uploadPublicBuffer } from '@/lib/cloudinary/storage-helpers'
import { renderCertificate } from '@/lib/certificates/render-certificate'
import { generateFileName } from '@/lib/export/file-naming'
import type { CertificateTemplate } from '@/types/template'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    // Increase response time limit for image rendering
    responseLimit: '15mb',
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email): Promise<void> => {
    try {
      const { templateId, employeeId, data } = req.body as {
        templateId: string
        employeeId: string
        data: Record<string, string>
      }

      if (!templateId || !employeeId || !data) {
        return res.status(400).json({ error: 'templateId, employeeId, and data are required.' })
      }

      // ── 1. Fetch employee ─────────────────────────────────────────────────
      const empDoc = await adminDb.collection('employees').doc(employeeId).get()
      if (!empDoc.exists) {
        return res.status(404).json({ error: 'Employee not found.' })
      }
      const employeeData = empDoc.data() as { employeeId?: string; fullName?: string }

      // ── 2. Fetch certificate template ─────────────────────────────────────
      const tplDoc = await adminDb.collection('templates').doc(templateId).get()
      if (!tplDoc.exists) {
        return res.status(404).json({ error: 'Template not found.' })
      }

      const template = { id: tplDoc.id, ...(tplDoc.data() as Omit<CertificateTemplate, 'id'>) }

      if (template.type !== 'certificate') {
        return res.status(400).json({ error: 'Template is not a certificate type.' })
      }

      if (!template.backgroundImageUrl) {
        return res
          .status(422)
          .json({ error: 'Certificate template has no background image. Upload one in Settings → Templates first.' })
      }

      // ── 3. Render certificate PNG ─────────────────────────────────────────
      const pngBuffer = await renderCertificate(template, data)

      // ── 4. Create document record ─────────────────────────────────────────
      const now = new Date().toISOString()
      const empId = employeeData.employeeId ?? employeeId
      const docTitle = `${template.name} — ${empId}`

      const documentRef = await adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .add({
          templateId,
          documentType: 'certificate',
          title: docTitle,
          status: 'draft',
          currentVersion: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
        })

      // ── 5. Create version v1 ──────────────────────────────────────────────
      await adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .doc(documentRef.id)
        .collection('versions')
        .doc('v1')
        .set({
          versionNumber: 1,
          markdownContent: '',        // certificates have no markdown content
          certificateData: data,      // store the variable values for reference
          exportedAs: 'png',
          exportStoragePath: null,    // updated below after Cloudinary upload
          hasSigned: false,
          signedAt: null,
          aiImproved: false,
          changeNote: 'Generated from certificate template',
          createdAt: now,
          createdBy: uid,
        })

      // ── 6. Upload PNG to Cloudinary (non-fatal) ───────────────────────────
      let exportStoragePath: string | null = null
      try {
        const publicId = `${employeeId}_${documentRef.id}_v1`
        const { url } = await uploadPublicBuffer(
          pngBuffer,
          publicId,
          `certificates/rendered/${employeeId}`,
          'image'
        )
        exportStoragePath = url

        // Update the version record with the storage path
        await adminDb
          .collection('employees')
          .doc(employeeId)
          .collection('documents')
          .doc(documentRef.id)
          .collection('versions')
          .doc('v1')
          .update({ exportStoragePath })
      } catch (uploadErr) {
        console.error('[Certificate Render] Cloudinary upload failed (non-fatal):', uploadErr)
      }

      // ── 7. Audit log ──────────────────────────────────────────────────────
      await createAuditLog({
        action: 'DOCUMENT_GENERATE',
        entityType: 'document',
        entityId: documentRef.id,
        performedBy: uid,
        performedByEmail: email,
        metadata: {
          employeeId,
          templateId,
          templateName: template.name,
          documentTitle: docTitle,
          format: 'certificate_png',
        },
      })

      // ── 8. Stream PNG to client ───────────────────────────────────────────
      const filename = generateFileName(employeeId, template.name, 'png')

      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      res.setHeader('Content-Length', pngBuffer.length)
      res.status(200).end(pngBuffer)
    } catch (err) {
      console.error('[POST /api/certificates/render]', err)
      res.status(500).json({ error: 'Failed to render certificate.' })
    }
  })
}
