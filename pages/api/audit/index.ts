// pages/api/audit/index.ts
// GET /api/audit — return last 200 audit log entries, newest first

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import type { AuditLog } from '@/types/audit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return withAuth(req, res, async () => {
    try {
      const snap = await adminDb
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get()

      const logs: AuditLog[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AuditLog, 'id'>),
      }))

      return res.status(200).json({ logs })
    } catch (err: any) {
      console.error('[GET /api/audit]', err?.message ?? err)
      return res.status(500).json({ error: 'Failed to fetch audit logs.' })
    }
  })
}
