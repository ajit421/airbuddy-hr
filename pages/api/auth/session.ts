import type { NextApiRequest, NextApiResponse } from 'next'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

// Cookie settings
const SESSION_COOKIE_NAME = 'session'
const SESSION_EXPIRES_MS = 60 * 60 * 24 * 7 * 1000 // 7 days

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST — create session cookie from Firebase idToken
  if (req.method === 'POST') {
    const { idToken } = req.body
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' })
    }
    try {
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRES_MS,
      })
      res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${sessionCookie}; Max-Age=${SESSION_EXPIRES_MS / 1000}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
      )

      // 11.4 — Initialize company settings on first login if they don’t exist
      initSettingsIfNeeded().catch((err) =>
        console.error('[Session] Settings init error (non-blocking):', err)
      )

      return res.status(200).json({ status: 'ok' })
    } catch (err) {
      console.error('Session creation error:', err)
      return res.status(401).json({ error: 'Invalid ID token' })
    }
  }

  // DELETE — clear session cookie (sign out)
  if (req.method === 'DELETE') {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
    )
    return res.status(200).json({ status: 'ok' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * Phase 11.4 — Ensure /settings/company exists with default values.
 * Called once on each login (non-blocking). Uses set({ merge: false }) via
 * create() which is a no-op if the document already exists.
 */
async function initSettingsIfNeeded(): Promise<void> {
  const ref = adminDb.doc('settings/company')
  const snap = await ref.get()
  if (!snap.exists) {
    await ref.set({
      companyName: '',
      companyAddress: '',
      companyCIN: '',
      companyEmail: '',
      companyPhone: '',
      hrName: '',
      hrDesignation: '',
      signatureStoragePath: '',
      employeeIdPrefix: 'AB',
      employeeIdYear: new Date().getFullYear(),
      employeeIdCounter: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    })
    console.log('[Session] Initialized /settings/company with defaults.')
  }
}
