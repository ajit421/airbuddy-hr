// pages/dashboard.tsx
// Phase 13 — Dashboard
// Stats row, employee status bar chart (CSS-only), recent employees, recent activity, quick actions

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AppLayout from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  FileText,
  FilePlus,
  ClipboardList,
  UserPlus,
  TrendingUp,
  Briefcase,
  GraduationCap,
  ArrowRight,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalEmployees:  number
  fullTimeCount:   number
  internCount:     number
  contractCount:   number
  resignedCount:   number
  terminatedCount: number
  totalDocuments:  number
}

interface RecentEmployee {
  id:          string
  fullName:    string
  employeeId:  string
  department:  string
  designation: string
  status:      string
  joiningDate: string
}

interface RecentActivity {
  id:               string
  action:           string
  entityType:       string
  entityId:         string
  performedByEmail: string
  timestamp:        any
  metadata:         any
}

interface DashboardData {
  stats:            DashboardStats
  recentEmployees:  RecentEmployee[]
  recentActivity:   RecentActivity[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimestamp(ts: any): string {
  if (!ts) return '—'
  try {
    const date =
      ts?.toDate
        ? ts.toDate()
        : ts._seconds
        ? new Date(ts._seconds * 1000)
        : new Date(ts)
    return date.toLocaleString('en-IN', {
      day:    '2-digit',
      month:  'short',
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return String(ts)
  }
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bar: string; dot: string }
> = {
  'full-time': {
    label: 'Full-Time',
    color: 'text-emerald-400',
    bar:   'bg-emerald-500',
    dot:   'bg-emerald-400',
  },
  intern: {
    label: 'Intern',
    color: 'text-blue-400',
    bar:   'bg-blue-500',
    dot:   'bg-blue-400',
  },
  contract: {
    label: 'Contract',
    color: 'text-amber-400',
    bar:   'bg-amber-500',
    dot:   'bg-amber-400',
  },
  resigned: {
    label: 'Resigned',
    color: 'text-red-400',
    bar:   'bg-red-500',
    dot:   'bg-red-400',
  },
  terminated: {
    label: 'Terminated',
    color: 'text-slate-400',
    bar:   'bg-slate-600',
    dot:   'bg-slate-400',
  },
}

// ── Action color map (mirrors audit page) ─────────────────────────────────────

const ACTION_DOT: Record<string, string> = {
  LOGIN:               'bg-slate-500',
  LOGOUT:              'bg-slate-500',
  EMPLOYEE_CREATE:     'bg-emerald-400',
  TEMPLATE_CREATE:     'bg-emerald-400',
  EMPLOYEE_UPDATE:     'bg-blue-400',
  TEMPLATE_UPDATE:     'bg-blue-400',
  SETTINGS_UPDATE:     'bg-blue-400',
  SIGNATURE_UPDATE:    'bg-blue-400',
  EMPLOYEE_DELETE:     'bg-red-400',
  TEMPLATE_DELETE:     'bg-red-400',
  FILE_DELETE:         'bg-red-400',
  DOCUMENT_EXPORT:     'bg-purple-400',
  OCR_TRIGGERED:       'bg-amber-400',
  OCR_REVIEWED:        'bg-amber-400',
  FILE_UPLOAD:         'bg-sky-400',
  DOCUMENT_GENERATE:   'bg-indigo-400',
  DOCUMENT_AI_IMPROVE: 'bg-violet-400',
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  gradient: string
  loading: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${gradient} p-5 flex flex-col gap-3`}
    >
      {/* Icon */}
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
          {label}
        </span>
      </div>
      {/* Value */}
      {loading ? (
        <Skeleton className="h-9 w-20 bg-white/[0.08]" />
      ) : (
        <p className="text-4xl font-bold tracking-tight">{value}</p>
      )}
    </div>
  )
}

function StatusBarChart({
  stats,
  loading,
}: {
  stats: DashboardStats | null
  loading: boolean
}) {
  if (loading || !stats) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-20 bg-white/[0.05]" />
            <Skeleton className="h-2 flex-1 bg-white/[0.05]" />
            <Skeleton className="h-3 w-6 bg-white/[0.05]" />
          </div>
        ))}
      </div>
    )
  }

  const rows: { key: string; count: number }[] = [
    { key: 'full-time', count: stats.fullTimeCount },
    { key: 'intern',    count: stats.internCount },
    { key: 'contract',  count: stats.contractCount },
    { key: 'resigned',  count: stats.resignedCount },
    { key: 'terminated',count: stats.terminatedCount },
  ]

  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="space-y-3">
      {rows.map(({ key, count }) => {
        const cfg    = STATUS_CONFIG[key]
        const pct    = Math.round((count / max) * 100)
        return (
          <div key={key} className="flex items-center gap-3">
            <span className={`text-[11px] font-medium w-[80px] shrink-0 ${cfg.color}`}>
              {cfg.label}
            </span>
            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 w-6 text-right tabular-nums">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <span className="text-slate-500 text-xs">{status}</span>
  const colorMap: Record<string, string> = {
    'full-time': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    intern:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
    contract:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
    resigned:    'bg-red-500/15 text-red-400 border-red-500/25',
    terminated:  'bg-slate-500/15 text-slate-400 border-slate-500/25',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colorMap[status] ?? ''}`}
    >
      {cfg.label}
    </span>
  )
}

// ── Quick actions ──────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id:    'qa-add-employee',
    label: 'Add Employee',
    href:  '/employees/new',
    icon:  UserPlus,
    color: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
  },
  {
    id:    'qa-generate-doc',
    label: 'Generate Document',
    href:  '/documents/generate',
    icon:  FilePlus,
    color: 'hover:border-indigo-500/40 hover:bg-indigo-500/5',
  },
  {
    id:    'qa-new-template',
    label: 'New Template',
    href:  '/templates/new',
    icon:  FileText,
    color: 'hover:border-purple-500/40 hover:bg-purple-500/5',
  },
  {
    id:    'qa-audit-log',
    label: 'View Audit Log',
    href:  '/audit',
    icon:  ClipboardList,
    color: 'hover:border-slate-500/40 hover:bg-slate-500/5',
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const stats = data?.stats ?? null

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Welcome back — here&apos;s your HR overview.
            </p>
          </div>
          <button
            id="dashboard-refresh"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.05] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Employees"
            value={stats?.totalEmployees ?? 0}
            gradient="from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-100"
            loading={loading}
          />
          <StatCard
            icon={Briefcase}
            label="Full-Time"
            value={stats?.fullTimeCount ?? 0}
            gradient="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-100"
            loading={loading}
          />
          <StatCard
            icon={GraduationCap}
            label="Interns"
            value={stats?.internCount ?? 0}
            gradient="from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-100"
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label="Docs Generated"
            value={stats?.totalDocuments ?? 0}
            gradient="from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-100"
            loading={loading}
          />
        </div>

        {/* ── Middle row: chart + recent employees ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Status breakdown chart */}
          <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-[#13161e] p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Employee Status</p>
              <p className="text-xs text-slate-500 mt-0.5">Breakdown by employment type</p>
            </div>
            <StatusBarChart stats={stats} loading={loading} />
          </div>

          {/* Recent employees table */}
          <div className="lg:col-span-3 rounded-xl border border-white/[0.06] bg-[#13161e] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Recent Employees</p>
                <p className="text-xs text-slate-500 mt-0.5">Last 5 added</p>
              </div>
              <Link
                id="dashboard-all-employees"
                href="/employees"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/[0.05]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32 bg-white/[0.05]" />
                      <Skeleton className="h-2.5 w-24 bg-white/[0.05]" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md bg-white/[0.05]" />
                  </div>
                ))}
              </div>
            ) : data?.recentEmployees.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm text-slate-500">No employees yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {data?.recentEmployees.map((emp) => {
                  const initials = emp.fullName
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  return (
                    <button
                      key={emp.id}
                      id={`dashboard-emp-${emp.id}`}
                      onClick={() => router.push(`/employees/${emp.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {emp.fullName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {emp.employeeId} · {emp.department}
                        </p>
                      </div>
                      {/* Status badge */}
                      <StatusBadge status={emp.status} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: recent activity + quick actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Recent activity */}
          <div className="lg:col-span-3 rounded-xl border border-white/[0.06] bg-[#13161e] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Recent Activity</p>
                <p className="text-xs text-slate-500 mt-0.5">Last 10 events across the platform</p>
              </div>
              <Link
                id="dashboard-all-audit"
                href="/audit"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Full log <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-1.5 bg-white/[0.05] shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-40 bg-white/[0.05]" />
                      <Skeleton className="h-2.5 w-28 bg-white/[0.05]" />
                    </div>
                    <Skeleton className="h-2.5 w-20 bg-white/[0.05]" />
                  </div>
                ))}
              </div>
            ) : data?.recentActivity.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {data?.recentActivity.map((log) => {
                  const dotColor = ACTION_DOT[log.action] ?? 'bg-slate-500'
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 py-2.5"
                    >
                      {/* Colored dot */}
                      <span
                        className={`mt-[5px] w-2 h-2 rounded-full shrink-0 ${dotColor}`}
                      />
                      {/* Action + user */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-200 truncate">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {log.performedByEmail || 'system'}
                          {log.entityId ? ` · ${log.entityId.slice(0, 12)}` : ''}
                        </p>
                      </div>
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-600 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-[#13161e] p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Quick Actions</p>
              <p className="text-xs text-slate-500 mt-0.5">Jump to common tasks</p>
            </div>

            <div className="flex flex-col gap-2">
              {QUICK_ACTIONS.map(({ id, label, href, icon: Icon, color }) => (
                <Link
                  key={id}
                  id={id}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-300 hover:text-white transition-all duration-150 group ${color}`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-current transition-colors" />
                  <span className="text-sm font-medium">{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
