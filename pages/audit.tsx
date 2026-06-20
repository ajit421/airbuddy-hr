// pages/audit.tsx
// Audit log page — shows all audit events, filterable by action type

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AuditLog, AuditAction } from '@/types/audit'
import { Search, ShieldCheck } from 'lucide-react'

// ── Action badge colors ────────────────────────────────────────────────────

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  EMPLOYEE_CREATE:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  EMPLOYEE_UPDATE:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  EMPLOYEE_DELETE:   'bg-red-500/15 text-red-400 border-red-500/25',
  FILE_UPLOAD:       'bg-sky-500/15 text-sky-400 border-sky-500/25',
  FILE_DELETE:       'bg-orange-500/15 text-orange-400 border-orange-500/25',
  OCR_TRIGGERED:     'bg-violet-500/15 text-violet-400 border-violet-500/25',
  OCR_REVIEWED:      'bg-purple-500/15 text-purple-400 border-purple-500/25',
  TEMPLATE_CREATE:   'bg-teal-500/15 text-teal-400 border-teal-500/25',
  TEMPLATE_UPDATE:   'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  TEMPLATE_DELETE:   'bg-rose-500/15 text-rose-400 border-rose-500/25',
  DOCUMENT_GENERATE: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  DOCUMENT_EXPORT:   'bg-amber-500/15 text-amber-400 border-amber-500/25',
  SETTINGS_UPDATE:   'bg-slate-500/15 text-slate-400 border-slate-500/25',
}

function ActionBadge({ action }: { action: AuditAction }) {
  const cls = ACTION_COLORS[action] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function formatTimestamp(ts: any): string {
  if (!ts) return '—'
  // Handle Firestore Timestamp objects
  const date = ts?.toDate ? ts.toDate() : new Date(ts._seconds ? ts._seconds * 1000 : ts)
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      log.action?.toLowerCase().includes(q) ||
      log.performedByEmail?.toLowerCase().includes(q) ||
      log.entityId?.toLowerCase().includes(q) ||
      JSON.stringify(log.metadata ?? {}).toLowerCase().includes(q)
    const matchAction = actionFilter === 'all' || log.action === actionFilter
    return matchSearch && matchAction
  })

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort()

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              Audit Log
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} of ${logs.length} events`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="audit-search"
              placeholder="Search action, email, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#13161e] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger id="action-filter" className="w-[200px] bg-[#13161e] border-white/[0.08] text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
              <SelectItem value="all" className="focus:bg-indigo-600/20">All Actions</SelectItem>
              {uniqueActions.map((a) => (
                <SelectItem key={a} value={a} className="focus:bg-indigo-600/20 text-xs font-mono">
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.06] bg-[#13161e] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Timestamp</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Performed By</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Entity</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-white/[0.04]">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full bg-white/[0.05]" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">
                    {logs.length === 0 ? 'No audit events yet.' : 'No events match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-slate-400 text-xs font-mono whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">
                      {log.performedByEmail || '—'}
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs font-mono">
                      <span className="text-slate-500 text-[10px]">{log.entityType}/</span>
                      {log.entityId?.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs max-w-[240px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  )
}
