// pages/api/ocr/extract.ts
// POST /api/ocr/extract — extract data from Aadhaar/PAN card via Gemini Vision
// Downloads the file from Cloudinary, sends to Gemini, saves results to Firestore.

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { downloadBuffer } from '@/lib/cloudinary/storage-helpers'
import { extractFromAadhaar, extractFromPAN } from '@/lib/gemini/ocr'
import { createAuditLog } from '@/lib/audit/logger'
import { checkRateLimit } from '@/lib/rate-limit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return withAuth(req, res, async (uid, email) => {
    // M9 — Rate limit: 30 OCR calls per 10 minutes per user
    const { allowed, remaining, resetAt } = checkRateLimit(`ocr:${uid}`, 30, 10 * 60 * 1000)
    if (!allowed) {
      res.setHeader('X-RateLimit-Remaining', '0')
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
      return res.status(429).json({
        error: 'Rate limit exceeded. You can make 30 OCR requests per 10 minutes.',
      })
    }
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    const { cloudinaryUrl, fileType, employeeId, fileId } = req.body

    // Validate required fields
    if (!cloudinaryUrl || !fileType || !employeeId || !fileId) {
      return res.status(400).json({
        error: 'Missing required fields: cloudinaryUrl, fileType, employeeId, fileId',
      })
    }

    if (fileType !== 'aadhaar' && fileType !== 'pan') {
      return res.status(400).json({ error: 'fileType must be "aadhaar" or "pan"' })
    }

    try {
      // Download file from Cloudinary
      const imageBuffer = await downloadBuffer(cloudinaryUrl)

      // Determine MIME type from the file doc
      const fileDocRef = adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('files')
        .doc(fileId)

      const fileSnap = await fileDocRef.get()
      if (!fileSnap.exists) {
        return res.status(404).json({ error: 'File not found' })
      }

      const fileData = fileSnap.data()!
      const mimeType = fileData.mimeType || 'image/jpeg'

      // Send to Gemini for OCR extraction
      const ocrResult = fileType === 'aadhaar'
        ? await extractFromAadhaar(imageBuffer, mimeType)
        : await extractFromPAN(imageBuffer, mimeType)

      // Update Firestore file doc with OCR results
      if (ocrResult.success && ocrResult.data) {
        await fileDocRef.update({
          ocrStatus: 'completed',
          ocrData: ocrResult.data,
        })
      } else {
        await fileDocRef.update({
          ocrStatus: 'failed',
          ocrData: null,
          ocrRawText: ocrResult.rawText ?? null,
          ocrError: ocrResult.error ?? 'OCR extraction failed',
        })
      }

      // Audit log
      await createAuditLog({
        action: 'OCR_TRIGGERED',
        entityType: 'file',
        entityId: fileId,
        performedBy: uid,
        performedByEmail: email,
        metadata: {
          employeeId,
          fileType,
          ocrSuccess: ocrResult.success,
        },
      })

      // Return result
      if (ocrResult.success) {
        return res.status(200).json({
          success: true,
          data: ocrResult.data,
        })
      } else {
        return res.status(200).json({
          success: false,
          rawText: ocrResult.rawText,
          error: ocrResult.error ?? 'OCR could not extract data. Please enter manually.',
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[OCR extract]', msg)
      return res.status(500).json({
        success: false,
        error: 'OCR extraction failed. Please enter data manually.',
      })
    }
  })
}
