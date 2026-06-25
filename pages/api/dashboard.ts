// pages/api/dashboard.ts
// GET /api/dashboard — aggregated stats for the dashboard page
// Returns: employee counts, document total, recent employees, recent audit logs

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { withAuth } from '@/lib/api-middleware'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return withAuth(req, res, async () => {
    try {
      // ── 1. Employee stats ──────────────────────────────────────────────────
      const empSnap = await adminDb
        .collection('employees')
        .where('isDeleted', '==', false)
        .get()

      const employees = empSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any))

      const totalEmployees  = employees.length
      const fullTimeCount   = employees.filter((e) => e.status === 'full-time').length
      const internCount     = employees.filter((e) => e.status === 'intern').length
      const contractCount   = employees.filter((e) => e.status === 'contract').length
      const resignedCount   = employees.filter((e) => e.status === 'resigned').length
      const terminatedCount = employees.filter((e) => e.status === 'terminated').length

      // Sort employees by createdAt desc — handle both Timestamp and plain objects
      const sortedEmployees = [...employees].sort((a, b) => {
        const aTs = a.createdAt?._seconds ?? a.createdAt?.seconds ?? 0
        const bTs = b.createdAt?._seconds ?? b.createdAt?.seconds ?? 0
        return bTs - aTs
      })

      const recentEmployees = sortedEmployees.slice(0, 5).map((e) => ({
        id:          e.id,
        fullName:    e.fullName,
        employeeId:  e.employeeId,
        department:  e.department,
        designation: e.designation,
        status:      e.status,
        joiningDate: e.joiningDate,
      }))

      // ── 2. Document count (all-time) ───────────────────────────────────────
      // We count DOCUMENT_GENERATE audit log entries as a proxy for total docs generated.
      // This avoids a collectionGroup query across all employees.
      const docAuditSnap = await adminDb
        .collection('audit_logs')
        .where('action', '==', 'DOCUMENT_GENERATE')
        .get()

      const totalDocuments = docAuditSnap.size

      // ── 3. Recent audit log entries (last 10) ──────────────────────────────
      const auditSnap = await adminDb
        .collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()

      const recentActivity = auditSnap.docs.map((doc) => {
        const d = doc.data()
        return {
          id:               doc.id,
          action:           d.action,
          entityType:       d.entityType,
          entityId:         d.entityId,
          performedByEmail: d.performedByEmail,
          timestamp:        d.timestamp,
          metadata:         d.metadata ?? null,
        }
      })

      return res.status(200).json({
        stats: {
          totalEmployees,
          fullTimeCount,
          internCount,
          contractCount,
          resignedCount,
          terminatedCount,
          totalDocuments,
        },
        recentEmployees,
        recentActivity,
      })
    } catch (err: any) {
      console.error('[GET /api/dashboard] Error:', err?.message ?? err)
      return res.status(500).json({ error: 'Failed to load dashboard data', detail: err?.message })
    }
  })
}
