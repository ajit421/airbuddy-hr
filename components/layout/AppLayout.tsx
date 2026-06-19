import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from './AuthGuard'
import {
  LayoutDashboard,
  Users,
  FileText,
  FilePlus,
  ClipboardList,
  Settings,
  LogOut,
  Plane,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',          icon: LayoutDashboard },
  { label: 'Employees',     href: '/employees',          icon: Users },
  { label: 'Templates',     href: '/templates',          icon: FileText },
  { label: 'Generate Doc',  href: '/documents/generate', icon: FilePlus },
  { label: 'Audit Log',     href: '/audit',              icon: ClipboardList },
  { label: 'Settings',      href: '/settings',           icon: Settings },
]

interface AppLayoutProps {
  children: React.ReactNode
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'HR'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SidebarContent() {
  const { pathname } = useRouter()
  const { user, signOut } = useAuth()

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] flex flex-col bg-[#0f1117] border-r border-white/[0.06] z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/30">
          <Plane className="w-4 h-4 text-white -rotate-45" />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-white tracking-wide">AirBuddy</p>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">HR Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.03]">
          {/* Avatar */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white shrink-0 shadow">
            {getInitials(user?.displayName)}
          </div>
          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate leading-tight">
              {user?.displayName ?? user?.email ?? 'HR Admin'}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">Super Admin</p>
          </div>
          {/* Logout */}
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0a0c10] text-slate-100">
        <SidebarContent />
        {/* Main content — offset by sidebar width */}
        <main className="ml-[220px] min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
