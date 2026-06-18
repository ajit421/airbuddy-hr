import type { NextApiRequest, NextApiResponse } from 'next'
import { adminAuth } from '@/lib/firebase/admin'

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
