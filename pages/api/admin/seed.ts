// pages/api/admin/seed.ts
// Phase 16.1 — One-time seed route for default HR document templates.
//
// POST /api/admin/seed
//   → Seeds 6 default templates into Firestore if the collection is empty.
//   → Protected by session cookie (withAuth) AND a shared secret header.
//   → Safe to run multiple times — idempotent (checks before writing).
//
// ⚠️  SECURITY: This route is protected by two layers:
//   1. Valid session cookie (same as every other protected API route)
//   2. X-Seed-Secret header must match SEED_SECRET env var
//
// After seeding, you can optionally delete this file from production,
// or leave it in place — it is idempotent and double-protected.

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { seedDefaultTemplates } from '@/lib/templates/seed-defaults'

// Optional shared-secret guard (set SEED_SECRET=<random> in .env.local / Vercel)
// If the env var is not set, the route still requires a valid session cookie.
const SEED_SECRET = process.env.SEED_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Layer 2: optional shared-secret check
  if (SEED_SECRET) {
    const provided = req.headers['x-seed-secret'] ?? ''
    if (provided !== SEED_SECRET) {
      return res.status(403).json({ error: 'Forbidden. Invalid seed secret.' })
    }
  }

  // Layer 1: must have a valid session cookie
  return withAuth(req, res, async () => {
    try {
      const result = await seedDefaultTemplates()

      if (!result.seeded) {
        return res.status(200).json({
          success: true,
          message: 'Templates collection already has data — nothing was seeded.',
          seeded: false,
          count: 0,
        })
      }

      return res.status(201).json({
        success: true,
        message: `Successfully seeded ${result.count} default templates.`,
        seeded: true,
        count: result.count,
      })
    } catch (err: any) {
      console.error('[POST /api/admin/seed]', err)
      return res.status(500).json({
        error: 'Seed failed.',
        detail: err?.message ?? String(err),
      })
    }
  })
}
