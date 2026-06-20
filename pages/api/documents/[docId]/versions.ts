// pages/api/documents/[docId]/versions.ts
// POST — Save a new version of a document
// GET  — List all versions of a document
//
// Dynamic segment: docId
// Required query: employeeId (to locate the nested subcollection)

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import type { DocumentVersion } from '@/types/document'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { docId, employeeId } = req.query as { docId: string; employeeId: string }

  if (!docId || !employeeId) {
    return res.status(400).json({ error: 'docId and employeeId query params are required.' })
  }

  const versionsRef = adminDb
    .collection('employees')
    .doc(employeeId)
    .collection('documents')
    .doc(docId)
    .collection('versions')

  // ── GET — list all versions ────────────────────────────────────────────────
  if (req.method === 'GET') {
    return await withAuth(req, res, async () => {
      try {
        const snapshot = await versionsRef.orderBy('versionNumber', 'asc').get()
        const versions: DocumentVersion[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<DocumentVersion, 'id'>),
        }))
        return res.status(200).json({ versions })
      } catch (err) {
        console.error('[GET /api/documents/[docId]/versions]', err)
        return res.status(500).json({ error: 'Failed to list versions.' })
      }
    })
  }

  // ── POST — save new version ────────────────────────────────────────────────
  if (req.method === 'POST') {
    return await withAuth(req, res, async (uid, email) => {
      try {
        const { markdownContent, changeNote, aiImproved } = req.body as {
          markdownContent: string
          changeNote: string
          aiImproved: boolean
        }

        if (!markdownContent) {
          return res.status(400).json({ error: 'markdownContent is required.' })
        }

        const now = new Date().toISOString()
        const docRef = adminDb
          .collection('employees')
          .doc(employeeId)
          .collection('documents')
          .doc(docId)

        // Get current version number from parent document
        const parentDoc = await docRef.get()
        if (!parentDoc.exists) {
          return res.status(404).json({ error: 'Document not found.' })
        }
        const currentVersion: number = (parentDoc.data()?.currentVersion ?? 0) as number
        const newVersionNumber = currentVersion + 1
        const versionId = `v${newVersionNumber}`

        // Write new version
        await versionsRef.doc(versionId).set({
          versionNumber: newVersionNumber,
          markdownContent,
          exportedAs: null,
          exportStoragePath: null,
          hasSigned: false,
          signedAt: null,
          aiImproved: aiImproved ?? false,
          changeNote: changeNote ?? '',
          createdAt: now,
          createdBy: uid,
        })

        // Increment currentVersion on parent doc + update timestamp
        await docRef.update({
          currentVersion: newVersionNumber,
          updatedAt: now,
        })

        await createAuditLog({
          action: 'DOCUMENT_GENERATE',
          entityType: 'document',
          entityId: docId,
          performedBy: uid,
          performedByEmail: email,
          metadata: { versionId, versionNumber: newVersionNumber, aiImproved },
        })

        return res.status(201).json({ versionId, versionNumber: newVersionNumber })
      } catch (err) {
        console.error('[POST /api/documents/[docId]/versions]', err)
        return res.status(500).json({ error: 'Failed to save version.' })
      }
    })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
