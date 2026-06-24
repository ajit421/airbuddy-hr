// pages/api/settings/signature.ts
// POST — upload HR signature image to Cloudinary, save URL in /settings/company

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { uploadPublicBuffer } from '@/lib/cloudinary/storage-helpers'
import { createAuditLog } from '@/lib/audit/logger'

// Next.js default body parser handles JSON / urlencoded.
// For raw binary we rely on base64 sent in JSON body.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '3mb', // signature images are small; 3 MB is generous
    },
  },
}

const SETTINGS_DOC = 'settings/company'

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

      // ── Validation ──────────────────────────────────────────────────────────
      if (!base64 || !mimeType) {
        return res.status(400).json({ error: 'base64 and mimeType are required.' })
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: 'Only PNG and JPG images are allowed.' })
      }

      // Decode base64 → Buffer and check size (max 2 MB)
      const buffer = Buffer.from(base64, 'base64')
      const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
      if (buffer.byteLength > MAX_BYTES) {
        return res
          .status(400)
          .json({ error: 'File too large. Maximum signature size is 2 MB.' })
      }

      // ── Upload to Cloudinary ─────────────────────────────────────────────────
      // Use uploadPublicBuffer (type:'upload') so the URL is directly downloadable.
      // The PDF export can then fetch this URL without needing signed URL generation.
      // A fixed public_id ('settings/signature') ensures re-uploading overwrites.
      const { url: signatureUrl, publicId } = await uploadPublicBuffer(
        buffer,
        'signature',       // public_id within folder
        'settings',        // Cloudinary folder
        'image'            // resource_type
      )

      // ── Persist URL to Firestore ─────────────────────────────────────────────
      await adminDb.doc(SETTINGS_DOC).set(
        {
          signatureStoragePath: signatureUrl,
          signaturePublicId: publicId,
          updatedAt: new Date().toISOString(),
          updatedBy: uid,
        },
        { merge: true }
      )

      // ── Audit ────────────────────────────────────────────────────────────────
      await createAuditLog({
        action: 'SIGNATURE_UPDATE',
        entityType: 'settings',
        entityId: 'company',
        performedBy: uid,
        performedByEmail: email,
        metadata: { fileName: fileName ?? 'signature', publicId },
      })

      return res.status(200).json({ success: true, signatureUrl })
    } catch (err) {
      console.error('[POST /api/settings/signature]', err)
      return res.status(500).json({ error: 'Failed to upload signature.' })
    }
  })
}
