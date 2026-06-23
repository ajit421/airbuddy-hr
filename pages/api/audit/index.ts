// pages/api/audit/index.ts
// Phase 12.1 — GET /api/audit
// Supports: limit, action, entityType, startDate, endDate, cursor (for pagination)

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import type { AuditLog, AuditAction, AuditEntityType } from '@/types/audit'

const PAGE_SIZE = 50

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return withAuth(req, res, async () => {
    try {
      const {
        limit: limitParam,
        action,
        entityType,
        startDate,
        endDate,
        cursor, // last document ID from previous page
      } = req.query

      const pageSize = Math.min(Number(limitParam) || PAGE_SIZE, 200)

      let query: FirebaseFirestore.Query = adminDb
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')

      // ── Filters ────────────────────────────────────────────────────────────
      if (action && action !== 'all') {
        query = query.where('action', '==', action as AuditAction)
      }

      if (entityType && entityType !== 'all') {
        query = query.where('entityType', '==', entityType as AuditEntityType)
      }

      if (startDate) {
        // startDate = ISO date string e.g. "2024-01-01"
        query = query.where('timestamp', '>=', new Date(startDate as string).toISOString())
      }

      if (endDate) {
        // endDate is inclusive — push to end of that day
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        query = query.where('timestamp', '<=', end.toISOString())
      }

      // ── Cursor pagination ──────────────────────────────────────────────────
      if (cursor) {
        const cursorDoc = await adminDb.collection('audit_logs').doc(cursor as string).get()
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc)
        }
      }

      const snap = await query.limit(pageSize + 1).get() // fetch one extra to detect hasMore

      const docs = snap.docs.slice(0, pageSize)
      const hasMore = snap.docs.length > pageSize
      const nextCursor = hasMore ? docs[docs.length - 1].id : null

      const logs: AuditLog[] = docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<AuditLog, 'id'>),
      }))

      return res.status(200).json({ logs, hasMore, nextCursor, pageSize })
    } catch (err: any) {
      console.error('[GET /api/audit]', err?.message ?? err)
      return res.status(500).json({ error: 'Failed to fetch audit logs.' })
    }
  })
}
