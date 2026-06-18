import { NextApiRequest, NextApiResponse } from 'next'
import { adminAuth } from '@/lib/firebase/admin'

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
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    await handler(decoded.uid, decoded.email ?? '')
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}
