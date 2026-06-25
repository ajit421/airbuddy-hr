// pages/employees/index.tsx
// Employee list page — search, status filter, table with actions

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
import { Skeleton } from '@/components/ui/skeleton'
import type { Employee, EmployeeStatus } from '@/types/employee'
import { UserPlus, Search, ExternalLink } from 'lucide-react'

// ── Status badge config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; className: string }> = {
  'full-time': { label: 'Full-Time', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  intern:      { label: 'Intern',    className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  contract:    { label: 'Contract',  className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  resigned:    { label: 'Resigned',  className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  terminated:  { label: 'Terminated',className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'full-time',  label: 'Full-Time' },
  { value: 'intern',     label: 'Intern' },
  { value: 'contract',   label: 'Contract' },
  { value: 'resigned',   label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
]

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: '' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function EmployeesListPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/employees')
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          toast.error(data.error ?? 'Failed to load employees.')
          return
        }
        const data = await res.json()
        setEmployees(data.employees ?? [])
      } catch {
        toast.error('Network error — could not load employees.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Client-side filter
  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      emp.fullName?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || emp.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Employees</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} of ${employees.length} employees`}
            </p>
          </div>
          <Link href="/employees/new">
            <Button id="btn-add-employee" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              id="employee-search"
              placeholder="Search by name, ID, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#13161e] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-[160px] bg-[#13161e] border-white/[0.08] text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="focus:bg-indigo-600/20">
                  {opt.label}
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
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Employee ID</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Department</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Designation</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                    {employees.length === 0
                      ? 'No employees yet. Add your first employee.'
                      : 'No employees match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => router.push(`/employees/${emp.id}`)}
                  >
                    <TableCell className="font-mono text-[13px] text-indigo-400">{emp.employeeId}</TableCell>
                    <TableCell className="text-white font-medium text-[13px]">{emp.fullName}</TableCell>
                    <TableCell className="text-slate-300 text-[13px]">{emp.department}</TableCell>
                    <TableCell className="text-slate-300 text-[13px]">{emp.designation}</TableCell>
                    <TableCell>
                      <StatusBadge status={emp.status} />
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
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
