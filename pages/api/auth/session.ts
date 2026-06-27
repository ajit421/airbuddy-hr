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
      // Step 1: Verify the Firebase ID token is genuine
      const decoded = await adminAuth.verifyIdToken(idToken)
      const uid   = decoded.uid
      const email = decoded.email ?? ''

      // ── SECURITY GATE: Firestore whitelist check ──────────────────────────
      // Only users with a document in the `users` collection AND isActive: true
      // are allowed to get a session cookie — regardless of email domain.
      const userDoc = await adminDb.collection('users').doc(uid).get()

      if (!userDoc.exists) {
        // Sign the user out of Firebase client-side on the next request.
        // Revoke their refresh tokens so the idToken can't be reused.
        await adminAuth.revokeRefreshTokens(uid)
        console.warn(`[Session] Blocked login — UID ${uid} (${email}) not in users collection.`)
        return res.status(403).json({
          error: 'Access denied. Your account has not been authorised by the administrator.',
        })
      }

      const userData = userDoc.data()!

      if (userData.isActive !== true) {
        await adminAuth.revokeRefreshTokens(uid)
        console.warn(`[Session] Blocked login — UID ${uid} (${email}) isActive=false.`)
        return res.status(403).json({
          error: 'Access denied. Your account has been deactivated. Contact your administrator.',
        })
      }
      // ─────────────────────────────────────────────────────────────────────

      // Step 2: All checks passed — create the server-side session cookie
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRES_MS,
      })

      res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${sessionCookie}; Max-Age=${SESSION_EXPIRES_MS / 1000}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
      )

      // Initialize company settings on first login if they don't exist (non-blocking)
      initSettingsIfNeeded().catch((err) =>
        console.error('[Session] Settings init error (non-blocking):', err)
      )

      console.log(`[Session] Login success — ${email} (${userData.role})`)
      return res.status(200).json({ status: 'ok' })
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string }
      // Firebase token verification failure
      if (firebaseErr?.code?.startsWith('auth/')) {
        return res.status(401).json({ error: 'Invalid or expired ID token.' })
      }
      console.error('[Session] Unexpected error during session creation:', err)
      return res.status(500).json({ error: 'Internal server error.' })
    }
  }

  // DELETE — clear session cookie (sign out)
  if (req.method === 'DELETE') {
    // Optionally revoke Firebase tokens on explicit sign-out too
    try {
      const sessionCookie = req.cookies['session'] ?? ''
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie).catch(() => null)
        if (decoded) {
          await adminAuth.revokeRefreshTokens(decoded.uid).catch(() => {})
        }
      }
    } catch {
      // Non-fatal — always clear the cookie regardless
    }

    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`
    )
    return res.status(200).json({ status: 'ok' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * Ensure /settings/company exists with default values.
 * Called once on each successful login (non-blocking).
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
