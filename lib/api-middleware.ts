// lib/api-middleware.ts
// Every protected API route calls withAuth().
// Two-layer check:
//   1. Valid HttpOnly session cookie (Firebase Admin SDK)
//   2. UID must exist in Firestore `users` collection with isActive: true
//
// This means even if a session cookie is somehow issued, a deactivated or
// removed user is blocked on every subsequent API request.
//
// For admin-only routes, use withRole('admin') which adds a third layer:
//   3. User's `role` field in Firestore must match the required role.

import { NextApiRequest, NextApiResponse } from 'next'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (uid: string, email: string) => Promise<void>
) {
  const sessionCookie = req.cookies['session'] ?? ''
  if (!sessionCookie) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Layer 1: verify the session cookie hasn't expired / been revoked
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid     = decoded.uid
    const email   = decoded.email ?? ''

    // Layer 2: verify the UID is still in the Firestore whitelist
    const userSnap = await adminDb.collection('users').doc(uid).get()
    if (!userSnap.exists || userSnap.data()?.isActive !== true) {
      // Revoke tokens so the cookie can't be replayed
      await adminAuth.revokeRefreshTokens(uid).catch(() => {})
      return res.status(403).json({
        error: 'Access denied. Your account has been removed or deactivated.',
      })
    }

    await handler(uid, email)
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; errorInfo?: { code?: string } }
    // Firebase throws auth/ errors when the cookie is expired or revoked
    if (firebaseErr?.code?.startsWith('auth/') || firebaseErr?.errorInfo?.code?.startsWith('auth/')) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
    // For 403 responses we already set the response above — avoid double-send
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}

/**
 * Role-based access control middleware.
 * Extends withAuth with a third layer: checks the `role` field on the
 * Firestore `users` document. Use this to protect admin-only mutations.
 *
 * Usage:
 *   withRole('admin', req, res, async (uid, email) => { ... })
 *
 * @param requiredRole - The Firestore `role` value required (e.g. 'admin')
 */
export async function withRole(
  requiredRole: string,
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (uid: string, email: string) => Promise<void>
) {
  const sessionCookie = req.cookies['session'] ?? ''
  if (!sessionCookie) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Layer 1: verify the session cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const uid     = decoded.uid
    const email   = decoded.email ?? ''

    // Layer 2: verify the UID is still active
    const userSnap = await adminDb.collection('users').doc(uid).get()
    const userData = userSnap.data()

    if (!userSnap.exists || userData?.isActive !== true) {
      await adminAuth.revokeRefreshTokens(uid).catch(() => {})
      return res.status(403).json({
        error: 'Access denied. Your account has been removed or deactivated.',
      })
    }

    // Layer 3: verify the user has the required role
    if (userData?.role !== requiredRole) {
      return res.status(403).json({
        error: `Access denied. This action requires the '${requiredRole}' role.`,
      })
    }

    await handler(uid, email)
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; errorInfo?: { code?: string } }
    if (firebaseErr?.code?.startsWith('auth/') || firebaseErr?.errorInfo?.code?.startsWith('auth/')) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}
