// pages/api/employees/[id]/documents.ts
// GET — List all document records for an employee, optionally with versions for a specific doc.
//
// Dynamic segment: id (employeeId)
// Optional query: docId — if provided, also returns versions for that specific document

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import type { DocumentRecord, DocumentVersion } from '@/types/document'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, docId } = req.query as { id: string; docId?: string }

  if (!id) {
    return res.status(400).json({ error: 'Employee ID is required.' })
  }

  // ── GET — list all documents for employee ──────────────────────────────────
  if (req.method === 'GET') {
    return await withAuth(req, res, async () => {
      try {
        const docsRef = adminDb
          .collection('employees')
          .doc(id)
          .collection('documents')

        const snapshot = await docsRef.orderBy('createdAt', 'desc').get()

        const documents: DocumentRecord[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<DocumentRecord, 'id'>),
        }))

        // If a specific docId is requested, also return versions for that document
        if (docId) {
          const versionsSnap = await docsRef
            .doc(docId)
            .collection('versions')
            .orderBy('versionNumber', 'desc')
            .get()

          const versions: DocumentVersion[] = versionsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<DocumentVersion, 'id'>),
          }))

          return res.status(200).json({ documents, versions })
        }

        return res.status(200).json({ documents })
      } catch (err) {
        console.error('[GET /api/employees/[id]/documents]', err)
        return res.status(500).json({ error: 'Failed to list documents.' })
      }
    })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
