// pages/api/employees/[id]/files/index.ts
// POST /api/employees/:id/files  — upload a file (base64) to Cloudinary
// GET  /api/employees/:id/files  — list files with signed download URLs

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/api-middleware'
import { uploadBuffer, getSignedUrl, deleteFile } from '@/lib/cloudinary/storage-helpers'
import { createAuditLog } from '@/lib/audit/logger'
import { FieldValue } from 'firebase-admin/firestore'

// Disable default body parser to handle large base64 payloads
export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing employee id' })
  }

  // ── GET — list files ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return withAuth(req, res, async () => {
      // Auth verified — now safe to read Firestore
      const employeeRef = adminDb.collection('employees').doc(id)
      const employeeSnap = await employeeRef.get()
      if (!employeeSnap.exists) {
        return res.status(404).json({ error: 'Employee not found' })
      }

      try {
        const filesSnap = await employeeRef.collection('files').orderBy('uploadedAt', 'desc').get()

        const files = filesSnap.docs.map((doc) => {
          const data = doc.data()
          // Generate a fresh signed URL for each file
          let signedUrl: string | null = null
          try {
            if (data.publicId) {
              signedUrl = getSignedUrl(data.publicId, 3600)
            }
          } catch {
            // Signed URL generation failed — not critical
          }
          return {
            fileId: doc.id,
            ...data,
            signedUrl,
          }
        })

        return res.status(200).json({ files })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[GET files]', msg)
        return res.status(500).json({ error: 'Failed to fetch files' })
      }
    })
  }

  // ── POST — upload file ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    return withAuth(req, res, async (uid, email) => {
      // Auth verified — now safe to read Firestore
      const employeeRef = adminDb.collection('employees').doc(id)
      const employeeSnap = await employeeRef.get()
      if (!employeeSnap.exists) {
        return res.status(404).json({ error: 'Employee not found' })
      }

      const { fileType, fileName, mimeType, base64Data } = req.body

      // Validate required fields
      if (!fileType || !fileName || !mimeType || !base64Data) {
        return res.status(400).json({
          error: 'Missing required fields: fileType, fileName, mimeType, base64Data',
        })
      }

      // Validate file type
      const validTypes = ['aadhaar', 'pan', 'resume', 'photo']
      if (!validTypes.includes(fileType)) {
        return res.status(400).json({ error: `fileType must be one of: ${validTypes.join(', ')}` })
      }

      // Validate MIME type
      const validMimes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!validMimes.includes(mimeType)) {
        return res.status(400).json({ error: 'Only JPEG, PNG, and PDF files are supported.' })
      }

      try {
        // Decode base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64')

        // Check size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' })
        }

        // Upload to Cloudinary
        const empData = employeeSnap.data()!
        const publicId = `${fileType}_${Date.now()}`
        const folder = `employees/${empData.employeeId ?? id}`
        const resourceType = mimeType === 'application/pdf' ? 'raw' as const : 'image' as const

        const { url, publicId: finalPublicId } = await uploadBuffer(
          buffer,
          publicId,
          folder,
          resourceType
        )

        // Save file metadata to Firestore subcollection
        const fileDocRef = await employeeRef.collection('files').add({
          fileType,
          fileName,
          mimeType,
          cloudinaryUrl: url,
          publicId: finalPublicId,
          ocrStatus: (fileType === 'aadhaar' || fileType === 'pan') ? 'pending' : 'skipped',
          ocrData: null,
          ocrReviewed: false,
          ocrReviewedAt: null,
          uploadedAt: FieldValue.serverTimestamp(),
          uploadedBy: uid,
        })

        // Audit log
        await createAuditLog({
          action: 'FILE_UPLOAD',
          entityType: 'file',
          entityId: fileDocRef.id,
          performedBy: uid,
          performedByEmail: email,
          metadata: {
            employeeId: empData.employeeId,
            fileType,
            fileName,
          },
        })

        return res.status(201).json({
          fileId: fileDocRef.id,
          cloudinaryUrl: url,
          publicId: finalPublicId,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[POST files] Upload error:', msg)
        return res.status(500).json({ error: 'File upload failed. Please try again.' })
      }
    })
  }

  // ── DELETE — delete a specific file ───────────────────────────────────────
  if (req.method === 'DELETE') {
    return withAuth(req, res, async (uid, email) => {
      // Auth verified — now safe to read Firestore
      const employeeRef = adminDb.collection('employees').doc(id)
      const employeeSnap = await employeeRef.get()
      if (!employeeSnap.exists) {
        return res.status(404).json({ error: 'Employee not found' })
      }

      const { fileId } = req.body
      if (!fileId) {
        return res.status(400).json({ error: 'fileId is required' })
      }

      try {
        const fileDocRef = employeeRef.collection('files').doc(fileId)
        const fileSnap = await fileDocRef.get()
        if (!fileSnap.exists) {
          return res.status(404).json({ error: 'File not found' })
        }

        const fileData = fileSnap.data()!

        // Delete from Cloudinary
        if (fileData.publicId) {
          try {
            const resourceType = fileData.mimeType === 'application/pdf' ? 'raw' as const : 'image' as const
            await deleteFile(fileData.publicId, resourceType)
          } catch (err) {
            console.error('[DELETE files] Cloudinary delete failed:', err)
            // Continue anyway — delete from Firestore
          }
        }

        // Delete from Firestore
        await fileDocRef.delete()

        // Audit log
        const empData = employeeSnap.data()!
        await createAuditLog({
          action: 'FILE_DELETE',
          entityType: 'file',
          entityId: fileId,
          performedBy: uid,
          performedByEmail: email,
          metadata: {
            employeeId: empData.employeeId,
            fileType: fileData.fileType,
            fileName: fileData.fileName,
          },
        })

        return res.status(200).json({ success: true })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[DELETE files]', msg)
        return res.status(500).json({ error: 'Failed to delete file' })
      }
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
