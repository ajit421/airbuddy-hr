'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Full-page spinner while Firebase resolves auth state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-400 tracking-wide">Loading AirBuddy HR…</p>
        </div>
      </div>
    )
  }

  // Not logged in — redirect is in-flight
  if (!user) {
    return null
  }

  return <>{children}</>
}
