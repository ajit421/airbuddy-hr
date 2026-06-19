import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { user, loading, signInWithGoogle, error } = useAuth()
  const router = useRouter()

  // Already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading || user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f1117]">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-[#13161e] border border-white/[0.08] rounded-2xl p-10 shadow-2xl shadow-black/60 backdrop-blur-sm">

          {/* Logo + branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl shadow-black/30 mb-4 p-3">
              {/* Drop your logo at: public/logo.png */}
              <img
                src="/logo.png"
                alt="AirBuddy Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">AirBuddy</h1>
            <p className="text-sm text-slate-400 mt-1 tracking-wide">HR Document Platform</p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06] mb-8" />

          <div className="space-y-4">
            <p className="text-center text-[13px] text-slate-400 leading-relaxed">
              Sign in with your{' '}
              <span className="text-indigo-400 font-medium">@airbuddy.in</span>{' '}
              Google account to access the HR platform.
            </p>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-300 leading-snug">{error}</p>
              </div>
            )}

            {/* Google Sign-In button */}
            <button
              id="btn-google-signin"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white text-[#1a1a1a] font-semibold text-[14px] hover:bg-slate-100 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-black/20"
            >
              {/* Google "G" logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-slate-600 leading-relaxed">
            Access restricted to AirBuddy Aerospace employees.
            <br />
            Contact IT if you have trouble signing in.
          </p>
        </div>

        {/* Version tag */}
        <p className="text-center text-[11px] text-slate-700 mt-4">
          AirBuddy HR Platform v1.0
        </p>
      </div>
    </div>
  )
}
