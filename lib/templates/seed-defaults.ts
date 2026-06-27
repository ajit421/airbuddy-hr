// lib/templates/seed-defaults.ts
// ⚠️  DEFAULT_TEMPLATES have been migrated to Firestore (2026-06-27).
//     Template content no longer lives in this file — edit templates directly
//     in Firestore, or re-run: npx tsx scripts/migrate-default-templates.ts
//
// This function is no longer called by any app code.
// It is kept as a safety net: if the templates collection is ever found empty
// it logs a warning so the problem is visible in server logs.

import { adminDb } from '@/lib/firebase/admin'

/**
 * No-op stub — templates now live only in Firestore.
 * Logs a warning if the collection is empty so the issue is visible in logs.
 * Returns { seeded: false, count: 0 } always.
 */
export async function seedDefaultTemplates(): Promise<{ seeded: boolean; count: number }> {
  try {
    const existing = await adminDb.collection('templates').limit(1).get()
    if (existing.empty) {
      console.warn(
        '[SeedTemplates] WARNING: templates collection is empty. ' +
        'Run `npx tsx scripts/migrate-default-templates.ts` to populate default templates.'
      )
    }
  } catch (err) {
    console.error('[SeedTemplates] Failed to check templates collection:', err)
  }

  return { seeded: false, count: 0 }
}
