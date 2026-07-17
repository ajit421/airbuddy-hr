// pages/api/export/pdf.ts
// POST — Export a document as a PDF.
//
// Body: {
//   markdownContent: string,
//   employeeId: string,
//   documentId: string,
//   versionId: string,
//   addSignature: boolean,
//   documentTitle: string
// }
// Returns: PDF file as application/pdf download

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { downloadBuffer, uploadBuffer } from '@/lib/cloudinary/storage-helpers'
// ── Per-document-type PDF renderers (each self-contained, no shared file) ──
import { OfferLetterPdfDocument }      from '@/lib/export/offer-letter-pdf-renderer'
import { NDAPdfDocument }              from '@/lib/export/nda-pdf-renderer'
import { InternshipLetterPdfDocument } from '@/lib/export/internship-letter-pdf-renderer'
import { SalarySlipPdfDocument }       from '@/lib/export/salary-slip-pdf-renderer'
import { ExperienceLetterPdfDocument } from '@/lib/export/experience-letter-pdf-renderer'
import { AppointmentLetterPdfDocument }from '@/lib/export/appointment-letter-pdf-renderer'
import { renderCertificatePdf } from '@/lib/certificates/render-certificate'
import { generateFileName } from '@/lib/export/file-naming'
import type { CertificateTemplate } from '@/types/template'
import { format } from 'date-fns'
import React from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

// @react-pdf/renderer — renderToBuffer works in Node.js API routes
import { renderToBuffer } from '@react-pdf/renderer'

// pdf-lib — used for the optional signature overlay
import { PDFDocument, rgb } from 'pdf-lib'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email): Promise<void> => {
    try {
      const {
        markdownContent,
        employeeId,
        documentId,
        versionId,
        addSignature = false,
        documentTitle,
        documentType,
      } = req.body as {
        markdownContent: string
        employeeId: string
        documentId: string
        versionId: string
        addSignature: boolean
        documentTitle: string
        documentType?: string
      }

      if (!employeeId || !documentId || !versionId || !documentTitle) {
        return res.status(400).json({ error: 'Missing required fields.' })
      }

      // Fetch parent document to resolve the true documentType
      const docRef = await adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .doc(documentId)
        .get()

      if (!docRef.exists) {
        return res.status(404).json({ error: 'Document not found.' })
      }

      const resolvedDocumentType = docRef.data()?.documentType || documentType

      // markdownContent is required for non-certificate documents
      if (resolvedDocumentType !== 'certificate' && !markdownContent) {
        return res.status(400).json({ error: 'markdownContent is required.' })
      }

      // ── 1. Fetch company settings ────────────────────────────────────────
      const settingsDoc = await adminDb.collection('settings').doc('company').get()
      const settings = settingsDoc.exists ? (settingsDoc.data() as Record<string, string>) : {}
      const companyName = settings.companyName || 'AirBuddy Aerospace Pvt. Ltd.'

      // ── 2. Fetch version number ──────────────────────────────────────────
      const versionRef = adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .doc(documentId)
        .collection('versions')
        .doc(versionId)
      const versionSnap = await versionRef.get()
      const versionNumber: number = versionSnap.exists
        ? (versionSnap.data()?.versionNumber ?? 1)
        : 1

      const dateStr = format(new Date(), 'dd/MM/yyyy')

      // ── 3. Render PDF ────────────────────────────────────────────────────
      let pdfBuffer: Buffer

      if (resolvedDocumentType === 'certificate') {
        // ── Certificate: image-compositing path ────────────────────────────
        // Fetch certificateData (the variable map stored at generate time)
        const versionRef2 = adminDb
          .collection('employees')
          .doc(employeeId)
          .collection('documents')
          .doc(documentId)
          .collection('versions')
          .doc(versionId)
        const vSnap = await versionRef2.get()
        const certData = (vSnap.data()?.certificateData ?? {}) as Record<string, string>

        // Fetch the template config (templateId from already fetched docRef)
        const templateId = docRef.data()?.templateId as string | undefined
        if (!templateId) {
          return res.status(400).json({ error: 'Certificate template ID not found on document.' })
        }
        const tplSnap = await adminDb.collection('templates').doc(templateId).get()
        if (!tplSnap.exists) {
          return res.status(404).json({ error: 'Certificate template not found.' })
        }
        const certTemplate = { id: tplSnap.id, ...tplSnap.data() } as unknown as CertificateTemplate

        pdfBuffer = await renderCertificatePdf(certTemplate, certData, markdownContent)

      } else {
        // ── Standard markdown path — route to the per-type renderer ──────────
        // Each document type has its own self-contained renderer file so that
        // style changes to one type (e.g. NDA) never affect another (e.g. Offer Letter).
        const docProps = { companyName, documentTitle, markdownContent, dateStr }

        type MarkdownRendererFn = (props: typeof docProps) => React.ReactElement
        const MARKDOWN_RENDERERS: Record<string, MarkdownRendererFn> = {
          offer_letter:        (p) => React.createElement(OfferLetterPdfDocument,       p),
          nda:                 (p) => React.createElement(NDAPdfDocument,               p),
          internship_letter:   (p) => React.createElement(InternshipLetterPdfDocument,  p),
          salary_slip:         (p) => React.createElement(SalarySlipPdfDocument,        p),
          experience_letter:   (p) => React.createElement(ExperienceLetterPdfDocument,  p),
          appointment_letter:  (p) => React.createElement(AppointmentLetterPdfDocument, p),
        }

        const renderFn = MARKDOWN_RENDERERS[resolvedDocumentType] ?? MARKDOWN_RENDERERS['offer_letter']
        pdfBuffer = await renderToBuffer(
          renderFn(docProps) as React.ReactElement<DocumentProps>
        )
      }

      // ── 4. Optional signature overlay with pdf-lib ───────────────────────
      let hasSigned = false
      if (resolvedDocumentType !== 'certificate' && addSignature && settings.signatureStoragePath) {
        try {
          // signatureStoragePath stores the direct Cloudinary HTTPS URL
          // (uploaded with type:'upload' / public delivery — downloadable directly).
          console.log('[PDF Export] Downloading signature from:', settings.signatureStoragePath)
          const sigBuffer = await downloadBuffer(settings.signatureStoragePath)

          const pdfDoc = await PDFDocument.load(pdfBuffer)
          const pages = pdfDoc.getPages()
          const lastPage = pages[pages.length - 1]
          const { width } = lastPage.getSize()

          // Embed: detect PNG by magic bytes, fall back to JPG
          let sigImage
          if (sigBuffer[0] === 0x89 && sigBuffer[1] === 0x50) {
            sigImage = await pdfDoc.embedPng(sigBuffer)
          } else {
            sigImage = await pdfDoc.embedJpg(sigBuffer)
          }

          // Scale to fit within a 120×60 box
          const dims = sigImage.scaleToFit(120, 60)
          const sigX = width - dims.width - 60

          lastPage.drawImage(sigImage, {
            x: sigX,
            y: 90,
            width: dims.width,
            height: dims.height,
            opacity: 0.9,
          })

          lastPage.drawText(`Signed on: ${dateStr}`, {
            x: sigX,
            y: 78,
            size: 8,
            color: rgb(0.4, 0.4, 0.4),
          })

          if (settings.hrName) {
            lastPage.drawText(settings.hrName, {
              x: sigX,
              y: 68,
              size: 8,
              color: rgb(0.2, 0.2, 0.2),
            })
          }
          if (settings.hrDesignation) {
            lastPage.drawText(settings.hrDesignation, {
              x: sigX,
              y: 58,
              size: 7,
              color: rgb(0.4, 0.4, 0.4),
            })
          }

          pdfBuffer = Buffer.from(await pdfDoc.save())
          hasSigned = true
        } catch (sigErr) {
          // Non-fatal — continue without signature
          console.error('[PDF Export] Signature overlay failed:', sigErr)
        }
      }

      // ── 5. Upload to Cloudinary (non-fatal) ──────────────────────────────
      const publicId = `${employeeId}_${documentId}_v${versionNumber}`
      let exportStoragePath: string | null = null
      try {
        const { publicId: uploadedId } = await uploadBuffer(
          pdfBuffer,
          publicId,
          `documents/${employeeId}/${documentId}`,
          'raw'
        )
        exportStoragePath = uploadedId
      } catch (uploadErr) {
        console.error('[PDF Export] Cloudinary upload failed (non-fatal):', uploadErr)
      }

      // ── 6. Update Firestore version record (non-fatal) ───────────────────
      try {
        const updateData: Record<string, unknown> = {
          exportedAs: 'pdf',
          exportStoragePath,
          hasSigned,
        }
        if (hasSigned) updateData.signedAt = new Date().toISOString()
        await versionRef.update(updateData)
      } catch (fsErr) {
        console.error('[PDF Export] Firestore update failed (non-fatal):', fsErr)
      }

      // ── 7. Audit log ─────────────────────────────────────────────────────
      await createAuditLog({
        action: 'DOCUMENT_EXPORT',
        entityType: 'document',
        entityId: documentId,
        performedBy: uid,
        performedByEmail: email,
        metadata: { employeeId, format: 'pdf', documentTitle, addSignature, hasSigned },
      })

      // ── 8. Stream PDF to client ──────────────────────────────────────────
      const filename = generateFileName(employeeId, documentTitle, 'pdf')

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      res.setHeader('Content-Length', pdfBuffer.length)
      res.status(200).end(pdfBuffer)
    } catch (err) {
      console.error('[POST /api/export/pdf]', err)
      res.status(500).json({ error: 'Failed to generate PDF.' })
    }
  })
}
