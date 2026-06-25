import { useState, useEffect, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth'
import { useRouter } from 'next/router'
import { auth } from '@/lib/firebase/client'

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? 'airbuddy.in'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Domain restriction — only @airbuddy.in accounts
      const email = result.user.email ?? ''
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await firebaseSignOut(auth)
        throw new Error(`Access restricted to @${ALLOWED_DOMAIN} accounts only.`)
      }

      // Exchange Firebase idToken for a server-side session cookie.
      // The server will verify the UID exists in the `users` Firestore collection.
      const idToken = await result.user.getIdToken()
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (!sessionRes.ok) {
        // Always sign out of Firebase client-side on failure
        await firebaseSignOut(auth)

        // Surface the server's specific error message (e.g. "Access denied…")
        const body = await sessionRes.json().catch(() => ({}))
        throw new Error(
          body.error ?? 'Sign-in failed. Please contact your administrator.'
        )
      }

      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed. Please try again.')
      setLoading(false)
    }
  }, [router])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' })
      await firebaseSignOut(auth)
      router.replace('/login')
    } catch (err) {
      console.error('Sign-out error:', err)
      router.replace('/login')
    }
  }, [router])

  return { user, loading, error, signInWithGoogle, signOut }
}
