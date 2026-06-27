// pages/audit.tsx
// Phase 12.2 — Audit Log page
// Features: action filter, entity type filter, date range picker, "Load more" pagination, color-coded badges, read-only

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import type { AuditLog, AuditAction, AuditEntityType } from '@/types/audit'
import { Search, ShieldCheck, RefreshCw, ChevronDown } from 'lucide-react'

// ── Spec-aligned badge color groups ───────────────────────────────────────────
// LOGIN/LOGOUT = gray | CREATE = green | UPDATE = blue | DELETE = red
// EXPORT = purple | OCR = amber | AI = violet | SETTINGS = slate

const ACTION_COLOR_MAP: Partial<Record<AuditAction, string>> = {
  // Auth — gray
  LOGIN:              'bg-slate-500/20 text-slate-300 border-slate-500/30',
  LOGOUT:             'bg-slate-500/20 text-slate-300 border-slate-500/30',
  // Create — green
  EMPLOYEE_CREATE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  TEMPLATE_CREATE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  // Update — blue
  EMPLOYEE_UPDATE:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  TEMPLATE_UPDATE:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  SETTINGS_UPDATE:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  SIGNATURE_UPDATE:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
  // Delete — red
  EMPLOYEE_DELETE:    'bg-red-500/15 text-red-400 border-red-500/25',
  TEMPLATE_DELETE:    'bg-red-500/15 text-red-400 border-red-500/25',
  FILE_DELETE:        'bg-red-500/15 text-red-400 border-red-500/25',
  // Export — purple
  DOCUMENT_EXPORT:    'bg-purple-500/15 text-purple-400 border-purple-500/25',
  // OCR — amber
  OCR_TRIGGERED:      'bg-amber-500/15 text-amber-400 border-amber-500/25',
  OCR_REVIEWED:       'bg-amber-500/15 text-amber-400 border-amber-500/25',
  // File upload — sky
  FILE_UPLOAD:        'bg-sky-500/15 text-sky-400 border-sky-500/25',
  // Document / AI — indigo / violet
  DOCUMENT_GENERATE:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  DOCUMENT_AI_IMPROVE:'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

function ActionBadge({ action }: { action: AuditAction }) {
  const cls =
    ACTION_COLOR_MAP[action] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide border whitespace-nowrap ${cls}`}
    >
      {action.replace(/_/g, ' ')}
    </span>
  )
}

const ENTITY_TYPE_LABELS: Record<AuditEntityType | 'all', string> = {
  all:       'All Entities',
  employee:  'Employee',
  file:      'File',
  template:  'Template',
  document:  'Document',
  settings:  'Settings',
  auth:      'Auth',
}

const ALL_AUDIT_ACTIONS: AuditAction[] = [
  'LOGIN', 'LOGOUT',
  'EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE',
  'FILE_UPLOAD', 'FILE_DELETE',
  'OCR_TRIGGERED', 'OCR_REVIEWED',
  'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
  'DOCUMENT_GENERATE', 'DOCUMENT_AI_IMPROVE', 'DOCUMENT_EXPORT',
  'SETTINGS_UPDATE', 'SIGNATURE_UPDATE',
]

interface FirestoreTimestamp {
  toDate?: () => Date
  _seconds?: number
  seconds?: number
}

function formatTimestamp(ts: FirestoreTimestamp | string | number | null | undefined): string {
  if (!ts) return '—'
  try {
    const date =
      typeof ts === 'object' && ts.toDate
        ? ts.toDate()
        : typeof ts === 'object' && ts._seconds
        ? new Date(ts._seconds * 1000)
        : typeof ts === 'object' && ts.seconds
        ? new Date(ts.seconds * 1000)
        : new Date(ts as string | number)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return String(ts)
  }
}

function truncateId(id: string | undefined): string {
  if (!id) return '—'
  return id.length > 12 ? id.slice(0, 12) + '…' : id
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface FetchState {
  logs: AuditLog[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  nextCursor: string | null
  error: string | null
}

export default function AuditLogPage() {
  const [state, setState] = useState<FetchState>({
    logs: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    nextCursor: null,
    error: null,
  })

  // Filters
  const [search, setSearch]           = useState('')
  const [actionFilter, setActionFilter]         = useState('all')
  const [entityFilter, setEntityFilter]         = useState('all')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const buildUrl = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams()
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (entityFilter !== 'all') params.set('entityType', entityFilter)
      if (startDate)              params.set('startDate', startDate)
      if (endDate)                params.set('endDate', endDate)
      if (cursor)                 params.set('cursor', cursor)
      return `/api/audit?${params.toString()}`
    },
    [actionFilter, entityFilter, startDate, endDate]
  )

  const fetchLogs = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(buildUrl())
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setState({
        logs: data.logs ?? [],
        loading: false,
        loadingMore: false,
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor ?? null,
        error: null,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit logs.'
      setState((prev) => ({
        ...prev,
        loading: false,
        error: msg,
      }))
    }
  }, [buildUrl])

  const loadMore = async () => {
    if (!state.nextCursor || state.loadingMore) return
    setState((prev) => ({ ...prev, loadingMore: true }))
    try {
      const res = await fetch(buildUrl(state.nextCursor!))
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, ...(data.logs ?? [])],
        loadingMore: false,
        hasMore: data.hasMore ?? false,
        nextCursor: data.nextCursor ?? null,
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load more audit logs.'
      setState((prev) => ({ ...prev, loadingMore: false, error: msg }))
    }
  }

  // Re-fetch when server-side filters change
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLogs()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityFilter, startDate, endDate])

  // ── Client-side search (on already-fetched page) ───────────────────────────
  const q = search.toLowerCase().trim()
  const filtered = q
    ? state.logs.filter(
        (log) =>
          log.action?.toLowerCase().includes(q) ||
          log.performedByEmail?.toLowerCase().includes(q) ||
          log.entityId?.toLowerCase().includes(q) ||
          log.entityType?.toLowerCase().includes(q) ||
          JSON.stringify(log.metadata ?? {}).toLowerCase().includes(q)
      )
    : state.logs

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              Audit Log
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {state.loading
                ? 'Loading…'
                : `Showing ${filtered.length} of ${state.logs.length} loaded events${state.hasMore ? ' (more available)' : ''}`}
            </p>
          </div>
          <Button
            id="audit-refresh"
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={state.loading}
            className="text-slate-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.05]"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* ── Filters row ── */}
        <div className="flex gap-3 flex-wrap items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="audit-search"
              placeholder="Search action, email, entity ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#13161e] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>

          {/* Action filter */}
          <Select value={actionFilter} onValueChange={(v: string | null) => setActionFilter(v ?? '')}>
            <SelectTrigger
              id="audit-action-filter"
              className="w-[190px] bg-[#13161e] border-white/[0.08] text-slate-300"
            >
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200 max-h-72">
              <SelectItem value="all" className="focus:bg-indigo-600/20">
                All Actions
              </SelectItem>
              {ALL_AUDIT_ACTIONS.map((a) => (
                <SelectItem
                  key={a}
                  value={a}
                  className="focus:bg-indigo-600/20 text-xs font-mono"
                >
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Entity type filter */}
          <Select value={entityFilter} onValueChange={(v: string | null) => setEntityFilter(v ?? '')}>
            <SelectTrigger
              id="audit-entity-filter"
              className="w-[160px] bg-[#13161e] border-white/[0.08] text-slate-300"
            >
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
              {(Object.keys(ENTITY_TYPE_LABELS) as Array<keyof typeof ENTITY_TYPE_LABELS>).map(
                (key) => (
                  <SelectItem key={key} value={key} className="focus:bg-indigo-600/20">
                    {ENTITY_TYPE_LABELS[key]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                From
              </label>
              <input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-3 rounded-md text-sm bg-[#13161e] border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                To
              </label>
              <input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-3 rounded-md text-sm bg-[#13161e] border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {state.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm px-4 py-3">
            {state.error}
          </div>
        )}

        {/* ── Table ── */}
        <div className="rounded-xl border border-white/[0.06] bg-[#13161e] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider w-[180px]">
                  Timestamp
                </TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                  Action
                </TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                  Performed By
                </TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                  Entity
                </TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                  IP Address
                </TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.loading ? (
                // Skeleton rows
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-white/[0.04]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full bg-white/[0.05]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-16 text-slate-500 text-sm"
                  >
                    {state.logs.length === 0
                      ? 'No audit events yet. Actions you take will appear here.'
                      : 'No events match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Timestamp */}
                    <TableCell className="text-slate-400 text-xs font-mono whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>

                    {/* Action badge */}
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>

                    {/* Performed by */}
                    <TableCell className="text-slate-300 text-xs max-w-[180px] truncate">
                      {log.performedByEmail || (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>

                    {/* Entity */}
                    <TableCell className="text-xs">
                      <span className="text-slate-500 mr-0.5">
                        {log.entityType}/
                      </span>
                      <span className="text-slate-400 font-mono">
                        {truncateId(log.entityId)}
                      </span>
                    </TableCell>

                    {/* IP Address */}
                    <TableCell className="text-slate-500 text-xs font-mono">
                      {log.ipAddress || <span className="text-slate-700">—</span>}
                    </TableCell>

                    {/* Metadata / details */}
                    <TableCell className="text-slate-500 text-xs max-w-[220px] truncate">
                      {log.metadata ? (
                        <span title={JSON.stringify(log.metadata, null, 2)}>
                          {JSON.stringify(log.metadata)}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Load More ── */}
        {state.hasMore && !state.loading && (
          <div className="flex justify-center pt-2">
            <Button
              id="audit-load-more"
              variant="outline"
              onClick={loadMore}
              disabled={state.loadingMore}
              className="border-white/[0.10] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white gap-2 min-w-[160px]"
            >
              {state.loadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Load more events
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
