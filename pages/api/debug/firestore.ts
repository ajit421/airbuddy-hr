// pages/api/debug/firestore.ts
// TEMPORARY debug route — DELETE after fixing the production issue
// Visit: https://airbuddy-hr.vercel.app/api/debug/firestore

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminDb } from '@/lib/firebase/admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in non-production or with a secret key
  const secret = req.query.secret
  if (secret !== 'airbuddy-debug-2026') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const results: Record<string, unknown> = {}

  // 1. Check env vars are present (don't expose values)
  results.envVars = {
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    FIREBASE_ADMIN_PRIVATE_KEY_LENGTH: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0,
    FIREBASE_ADMIN_PRIVATE_KEY_HAS_NEWLINES:
      process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\n') ?? false,
    FIREBASE_ADMIN_PRIVATE_KEY_HAS_LITERAL_N:
      process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\\n') ?? false,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
  }

  // 2. Try a Firestore read
  try {
    const snap = await adminDb.collection('employees').limit(3).get()
    results.firestoreRead = {
      success: true,
      totalDocs: snap.size,
      docs: snap.docs.map((d) => ({ id: d.id, employeeId: d.data().employeeId, isDeleted: d.data().isDeleted })),
    }
  } catch (err: any) {
    results.firestoreRead = {
      success: false,
      error: err.message,
      code: err.code,
    }
  }

  // 3. Try the filtered query (same as employee list)
  try {
    const snap = await adminDb
      .collection('employees')
      .where('isDeleted', '==', false)
      .get()
    results.filteredQuery = {
      success: true,
      count: snap.size,
    }
  } catch (err: any) {
    results.filteredQuery = {
      success: false,
      error: err.message,
    }
  }

  // 4. Check session cookie
  results.sessionCookie = {
    present: !!req.cookies['session'],
    cookieNames: Object.keys(req.cookies),
  }

  return res.status(200).json(results)
}
