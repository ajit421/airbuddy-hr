// pages/api/certificates/upload-background.ts
// POST — Upload a certificate background PNG to Cloudinary.
//
// Body: { base64: string, mimeType: string, fileName?: string }
// Returns: { backgroundImageUrl: string }

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { uploadPublicBuffer } from '@/lib/cloudinary/storage-helpers'
import { createAuditLog } from '@/lib/audit/logger'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Certificate background PNGs can be 5–10 MB
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email) => {
    try {
      const { base64, mimeType, fileName } = req.body as {
        base64: string
        mimeType: string
        fileName?: string
      }

      // ── Validation ────────────────────────────────────────────────────────
      if (!base64 || !mimeType) {
        return res.status(400).json({ error: 'base64 and mimeType are required.' })
      }

      // Only PNG is accepted for certificate backgrounds
      if (mimeType !== 'image/png') {
        return res.status(400).json({ error: 'Only PNG images are accepted for certificate backgrounds.' })
      }

      const buffer = Buffer.from(base64, 'base64')
      const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
      if (buffer.byteLength > MAX_BYTES) {
        return res.status(400).json({ error: 'File too large. Maximum certificate background size is 10 MB.' })
      }

      // ── Upload to Cloudinary ──────────────────────────────────────────────
      // Use timestamp to generate a unique public_id per upload
      const timestamp = Date.now()
      const safeName = (fileName ?? 'certificate-background')
        .replace(/\.[^.]+$/, '')         // strip extension
        .replace(/[^a-zA-Z0-9_-]/g, '_') // sanitize
      const publicId = `${safeName}_${timestamp}`

      const { url: backgroundImageUrl } = await uploadPublicBuffer(
        buffer,
        publicId,
        'certificates/backgrounds',
        'image'
      )

      // ── Audit ─────────────────────────────────────────────────────────────
      await createAuditLog({
        action: 'FILE_UPLOAD',
        entityType: 'settings',
        entityId: 'certificate',
        performedBy: uid,
        performedByEmail: email,
        metadata: { fileName: fileName ?? 'certificate-background', publicId },
      })

      return res.status(200).json({ success: true, backgroundImageUrl })
    } catch (err) {
      console.error('[POST /api/certificates/upload-background]', err)
      return res.status(500).json({ error: 'Failed to upload certificate background.' })
    }
  })
}
